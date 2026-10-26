// Finder pipeline: discover → market snapshot → cheap gates → security sweep
// on the best survivors → verdict + score. Server-only (used by /api/finder).

import {
  activityChecks,
  evmChecks,
  honeypotCheck,
  marketChecks,
  scoreOf,
  solanaChecks,
  uncheckedSecurity,
  verdictOf,
} from "./checks";
import {
  cached,
  dsLatestBoosts,
  dsLatestProfiles,
  dsTokenPairs,
  goplusEvm,
  goplusSolana,
  gtNewPools,
  gtOhlcv,
  gtPoolsMulti,
  gtTrendingPools,
  honeypotSim,
  mapLimit,
  rugcheckReport,
  type DsPair,
  type GtPool,
  type OhlcvBar,
} from "./sources";
import {
  CHAINS,
  WINDOWS,
  type ChainId,
  type Check,
  type FinderToken,
  type Flow,
  type Market,
  type Origin,
  type ScanParams,
  type ScanResult,
  type Socials,
  type Window,
} from "./types";

const MAX_CANDIDATES = 60;
const SECURITY_TOP_N = 12; // per-token security calls are the expensive part
const SCAN_TTL_MS = 60_000;

// Launchpad DEX ids (normalised) where tokens trade on a bonding curve before
// graduating to a real pool — no LP exists yet, so liquidity is reported null.
const BONDING_CURVE_DEXES = new Set([
  "pumpfun",
  "meteoradbc",
  "launchlab",
  "raydiumlaunchlab",
  "fourmeme",
  "moonshot",
  "boopfun",
  "believe",
]);

const normDex = (id: string) =>
  id.toLowerCase().replace(/-(solana|base|bsc|eth|robinhood)$/, "").replace(/[^a-z0-9]/g, "");

export const normAddr = (chain: ChainId, a: string) =>
  chain === "solana" ? a : a.toLowerCase();

export function isValidAddress(chain: ChainId, a: string): boolean {
  return chain === "solana"
    ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)
    : /^0x[0-9a-fA-F]{40}$/.test(a);
}

// ---- market assembly ---------------------------------------------------------

function emptyFlow(): Flow {
  return { buys: 0, sells: 0, buyers: null, sellers: null };
}

// GT windows are m5/m15/m30/h1/h6/h24; we use the four shared with DexScreener.
function buildMarket(chain: ChainId, ds: DsPair | null, gt: GtPool | null): Market | null {
  if (!ds && !gt) return null;
  const dexId: string = ds?.dexId ?? gt?.dexId ?? "";
  const bondingCurve = BONDING_CURVE_DEXES.has(normDex(dexId));
  const volume = {} as Record<Window, number>;
  const priceChange = {} as Record<Window, number>;
  const flow = {} as Record<Window, Flow>;
  for (const w of WINDOWS) {
    volume[w] = Number(ds?.volume?.[w] ?? gt?.volume[w] ?? 0) || 0;
    priceChange[w] = Number(ds?.priceChange?.[w] ?? gt?.priceChange[w] ?? 0) || 0;
    const f = emptyFlow();
    const dt = ds?.txns?.[w];
    const gf = gt?.flow[w];
    f.buys = Number(dt?.buys ?? gf?.buys ?? 0);
    f.sells = Number(dt?.sells ?? gf?.sells ?? 0);
    if (gf) {
      f.buyers = gf.buyers;
      f.sellers = gf.sellers;
    }
    flow[w] = f;
  }
  const pairAddress: string = ds?.pairAddress ?? gt?.poolAddress ?? "";
  let liquidityUsd: number | null = ds ? Number(ds.liquidity?.usd ?? NaN) : NaN;
  if (!Number.isFinite(liquidityUsd)) {
    liquidityUsd = !bondingCurve && gt?.reserveUsd ? gt.reserveUsd : null;
  }
  const mcap = Number(ds?.marketCap ?? ds?.fdv ?? gt?.mcapUsd ?? gt?.fdvUsd ?? NaN);
  return {
    pairAddress,
    dexId,
    url: ds?.url ?? `https://www.geckoterminal.com/${CHAINS[chain].gt}/pools/${pairAddress}`,
    priceUsd: Number(ds?.priceUsd ?? gt?.priceUsd ?? NaN) || null,
    liquidityUsd,
    mcapUsd: Number.isFinite(mcap) ? mcap : null,
    createdAt: ds?.pairCreatedAt ?? gt?.createdAt ?? null,
    volume,
    priceChange,
    flow,
    bondingCurve,
  };
}

function socialsOf(ds: DsPair | null): Socials {
  const links: { type: string; url: string }[] = [];
  for (const s of ds?.info?.socials ?? []) if (s?.url) links.push({ type: s.type, url: s.url });
  for (const w of ds?.info?.websites ?? []) if (w?.url) links.push({ type: "website", url: w.url });
  return {
    twitter: links.some((l) => l.type === "twitter"),
    telegram: links.some((l) => l.type === "telegram"),
    website: links.some((l) => l.type === "website"),
    links,
  };
}

// Best pair per token: deepest liquidity, then highest 24h volume.
function pickPairs(chain: ChainId, pairs: DsPair[]): Map<string, DsPair> {
  const best = new Map<string, DsPair>();
  for (const p of pairs) {
    const key = normAddr(chain, p?.baseToken?.address ?? "");
    if (!key) continue;
    const cur = best.get(key);
    const liq = (x: DsPair) => Number(x?.liquidity?.usd ?? 0);
    const vol = (x: DsPair) => Number(x?.volume?.h24 ?? 0);
    if (!cur || liq(p) > liq(cur) || (liq(p) === liq(cur) && vol(p) > vol(cur))) {
      best.set(key, p);
    }
  }
  return best;
}

// ---- security sweep --------------------------------------------------------------

async function securityFor(
  chain: ChainId,
  tokens: { address: string; market: Market | null }[]
): Promise<{ checks: Map<string, Check[]>; source: string; ok: boolean }> {
  const out = new Map<string, Check[]>();
  if (chain === "solana") {
    let anyOk = false;
    await mapLimit(tokens, 4, async (t) => {
      const [rc, gp] = await Promise.all([rugcheckReport(t.address), goplusSolana(t.address)]);
      if (rc || gp) anyOk = true;
      out.set(t.address, solanaChecks(rc, gp, t.market));
    });
    return { checks: out, source: "rugcheck+goplus", ok: anyOk || tokens.length === 0 };
  }
  let anyOk = false;
  await mapLimit(tokens, 4, async (t) => {
    const gp = await goplusEvm(CHAINS[chain].goplus!, t.address);
    if (gp) anyOk = true;
    out.set(t.address, evmChecks(gp));
  });
  return { checks: out, source: "goplus", ok: anyOk || tokens.length === 0 };
}

function finalize(
  t: Omit<FinderToken, "verdict" | "score" | "scoreParts" | "riskMultiplier">,
  p: ScanParams
): FinderToken {
  const { score, parts, riskMultiplier } = scoreOf(t.market, t.socials, t.checks, p);
  return { ...t, verdict: verdictOf(t.checks), score, scoreParts: parts, riskMultiplier };
}

// ---- scan ---------------------------------------------------------------------------

interface Candidate {
  address: string;
  origins: Set<Origin>;
  gt: GtPool | null;
  icon: string | null;
}

async function runScan(p: ScanParams): Promise<ScanResult> {
  const chain = CHAINS[p.chain];
  const [fresh, trending, profiles, boosts] = await Promise.all([
    gtNewPools(chain.gt),
    gtTrendingPools(chain.gt),
    dsLatestProfiles(),
    dsLatestBoosts(),
  ]);
  const sources: Record<string, "ok" | "error"> = {
    "geckoterminal:new": fresh ? "ok" : "error",
    "geckoterminal:trending": trending ? "ok" : "error",
    "dexscreener:profiles": profiles ? "ok" : "error",
    "dexscreener:boosts": boosts ? "ok" : "error",
  };

  const cands = new Map<string, Candidate>();
  const add = (address: string, origin: Origin, gt: GtPool | null, icon: string | null) => {
    const key = normAddr(p.chain, address);
    const c = cands.get(key) ?? { address, origins: new Set(), gt: null, icon: null };
    c.origins.add(origin);
    if (gt && (!c.gt || (gt.reserveUsd ?? 0) > (c.gt.reserveUsd ?? 0))) c.gt = gt;
    c.icon ??= icon;
    cands.set(key, c);
  };
  for (const g of fresh ?? []) add(g.tokenAddress, "new", g, g.icon);
  for (const g of trending ?? []) add(g.tokenAddress, "trending", g, g.icon);
  for (const d of profiles ?? []) if (d.chainId === p.chain) add(d.tokenAddress, "profile", null, d.icon);
  for (const d of boosts ?? []) if (d.chainId === p.chain) add(d.tokenAddress, "boost", null, d.icon);

  const list = [...cands.values()].slice(0, MAX_CANDIDATES);
  const dsPairs = await dsTokenPairs(p.chain, list.map((c) => c.address));
  sources["dexscreener:tokens"] = dsPairs ? "ok" : "error";
  const best = pickPairs(p.chain, dsPairs ?? []);

  // Unique buyers/sellers only come from GeckoTerminal: fetch the pools we
  // chose from DexScreener that discovery did not already give us.
  const need: string[] = [];
  for (const c of list) {
    const ds = best.get(normAddr(p.chain, c.address));
    if (ds && normAddr(p.chain, ds.pairAddress) !== normAddr(p.chain, c.gt?.poolAddress ?? "")) {
      need.push(ds.pairAddress);
    }
  }
  const extra = need.length ? await gtPoolsMulti(chain.gt, need.slice(0, 30)) : [];
  const gtByPool = new Map(extra.map((g) => [normAddr(p.chain, g.poolAddress), g]));

  const staged = list.map((c) => {
    const ds = best.get(normAddr(p.chain, c.address)) ?? null;
    const gt =
      ds && normAddr(p.chain, ds.pairAddress) !== normAddr(p.chain, c.gt?.poolAddress ?? "")
        ? gtByPool.get(normAddr(p.chain, ds.pairAddress)) ?? null
        : c.gt;
    const market = buildMarket(p.chain, ds, gt);
    const pre = market ? [...marketChecks(market, p), ...activityChecks(market)] : [];
    const socials = socialsOf(ds);
    return {
      c,
      ds,
      gt,
      market,
      pre,
      socials,
      prelim: scoreOf(market, socials, pre, p).score,
    };
  });

  // Security sweep only for tokens that survived the cheap gates.
  const survivors = staged
    .filter((s) => s.market && !s.pre.some((x) => x.status === "fail"))
    .sort((a, b) => b.prelim - a.prelim)
    .slice(0, SECURITY_TOP_N);
  const sec = await securityFor(
    p.chain,
    survivors.map((s) => ({ address: s.c.address, market: s.market }))
  );
  sources[sec.source] = sec.ok ? "ok" : "error";

  const tokens = staged
    .filter((s) => s.market)
    .map((s) => {
      const secChecks = sec.checks.get(s.c.address);
      return finalize(
        {
          chain: p.chain,
          address: s.c.address,
          symbol: s.ds?.baseToken?.symbol ?? s.gt?.symbol ?? s.c.gt?.symbol ?? "?",
          name: s.ds?.baseToken?.name ?? s.gt?.name ?? s.c.gt?.name ?? "",
          icon: s.ds?.info?.imageUrl ?? s.c.icon ?? s.gt?.icon ?? null,
          origins: [...s.c.origins],
          promoted: s.c.origins.has("profile") || s.c.origins.has("boost") || !!s.ds?.boosts,
          market: s.market,
          socials: s.socials,
          securitySource: secChecks ? sec.source : null,
          checks: [...s.pre, ...(secChecks ?? uncheckedSecurity())],
        },
        p
      );
    });

  const rank = { pass: 0, caution: 1, fail: 2 } as const;
  tokens.sort((a, b) => rank[a.verdict] - rank[b.verdict] || b.score - a.score);
  return { params: p, at: Date.now(), tokens, sources };
}

export function scan(p: ScanParams): Promise<ScanResult> {
  return cached(`scan:${p.chain}:${p.minLiq}:${p.maxMcap}`, SCAN_TTL_MS, () => runScan(p));
}

// ---- single-token deep check (detail panel + address lookup) --------------------

export interface TokenReport {
  token: FinderToken;
  candles: OhlcvBar[];
}

export async function analyzeToken(
  chainId: ChainId,
  address: string,
  p: ScanParams
): Promise<TokenReport | null> {
  const chain = CHAINS[chainId];
  const pairs = await dsTokenPairs(chainId, [address]);
  const ds = pickPairs(chainId, pairs ?? []).get(normAddr(chainId, address)) ?? null;
  const gtList = ds ? await gtPoolsMulti(chain.gt, [ds.pairAddress]) : [];
  const gt = gtList[0] ?? null;
  const market = buildMarket(chainId, ds, gt);
  if (!market) return null;

  const socials = socialsOf(ds);
  const [sec, hp, candles] = await Promise.all([
    securityFor(chainId, [{ address, market }]),
    chain.honeypot ? honeypotSim(chain.goplus!, address) : Promise.resolve(null),
    gtOhlcv(chain.gt, market.pairAddress),
  ]);
  const checks = [
    ...marketChecks(market, p),
    ...activityChecks(market),
    ...(sec.checks.get(address) ?? uncheckedSecurity()),
  ];
  if (chain.honeypot) checks.push(honeypotCheck(hp));

  const token = finalize(
    {
      chain: chainId,
      address,
      symbol: ds?.baseToken?.symbol ?? gt?.symbol ?? "?",
      name: ds?.baseToken?.name ?? gt?.name ?? "",
      icon: ds?.info?.imageUrl ?? gt?.icon ?? null,
      origins: ["lookup"],
      promoted: !!ds?.boosts,
      market,
      socials,
      securitySource: sec.checks.has(address)
        ? sec.source + (chain.honeypot ? "+honeypot.is" : "")
        : null,
      checks,
    },
    p
  );
  return { token, candles: candles ?? [] };
}

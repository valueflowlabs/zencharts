// Free, keyless on-chain / DEX data adapters for the finder.
//
//   - GeckoTerminal (api.geckoterminal.com): new + trending pools per network,
//     unique buyers/sellers per window, OHLCV. Keyless limit is low (~30/min),
//     so every call here is cached and batched.
//   - DexScreener (api.dexscreener.com): latest paid profiles/boosts and a
//     30-address batch token endpoint with liquidity, txns, socials.
//   - RugCheck (api.rugcheck.xyz): Solana report — authorities, top holders,
//     known pool/locker accounts, LP lock, insiders, rugged flag.
//   - GoPlus (api.gopluslabs.io): Solana authority flags (balance-mutable,
//     transfer hook, default state…) and the EVM token-security report.
//   - Honeypot.is (api.honeypot.is): EVM buy/sell simulation (detail view only).
//
// Every adapter returns `null` on failure so one dead provider degrades the
// affected checks to "unknown" instead of failing the whole scan.

import { fetchJson } from "../sources";
import type { ChainId } from "./types";

const GT = "https://api.geckoterminal.com/api/v2";
const DS = "https://api.dexscreener.com";
const RC = "https://api.rugcheck.xyz/v1";
const GP = "https://api.gopluslabs.io/api/v1";
const HP = "https://api.honeypot.is/v2";

// ---- tiny TTL cache with in-flight de-duplication ---------------------------
const cache = new Map<string, { at: number; ttl: number; p: Promise<any> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.p;
  const p = load().catch((err) => {
    cache.delete(key); // never cache failures
    throw err;
  });
  cache.set(key, { at: Date.now(), ttl: ttlMs, p });
  if (cache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.at > v.ttl) cache.delete(k);
  }
  return p;
}

async function soft<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

// Run `fn` over `items` with at most `n` in flight (keeps per-token APIs polite).
export async function mapLimit<T, R>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---- GeckoTerminal ----------------------------------------------------------

export interface GtFlow {
  buys: number;
  sells: number;
  buyers: number;
  sellers: number;
}

export interface GtPool {
  poolAddress: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  icon: string | null;
  dexId: string;
  createdAt: number | null;
  fdvUsd: number | null;
  mcapUsd: number | null;
  reserveUsd: number | null;
  priceUsd: number | null;
  priceChange: Record<string, number>;
  volume: Record<string, number>;
  flow: Record<string, GtFlow>;
}

function parseGtPools(json: any): GtPool[] {
  const tokens = new Map<string, any>();
  for (const inc of json?.included ?? []) {
    if (inc.type === "token") tokens.set(inc.id, inc.attributes);
  }
  const out: GtPool[] = [];
  for (const p of json?.data ?? []) {
    const a = p.attributes ?? {};
    const baseId: string = p.relationships?.base_token?.data?.id ?? "";
    const t = tokens.get(baseId) ?? {};
    const tokenAddress = t.address ?? baseId.split("_").slice(1).join("_");
    if (!tokenAddress) continue;
    const flow: Record<string, GtFlow> = {};
    for (const [w, f] of Object.entries<any>(a.transactions ?? {})) {
      flow[w] = {
        buys: f.buys ?? 0,
        sells: f.sells ?? 0,
        buyers: f.buyers ?? 0,
        sellers: f.sellers ?? 0,
      };
    }
    const pc: Record<string, number> = {};
    for (const [w, v] of Object.entries(a.price_change_percentage ?? {}))
      pc[w] = num(v) ?? 0;
    const vol: Record<string, number> = {};
    for (const [w, v] of Object.entries(a.volume_usd ?? {})) vol[w] = num(v) ?? 0;
    out.push({
      poolAddress: a.address,
      tokenAddress,
      symbol: t.symbol ?? String(a.name ?? "?").split(" / ")[0],
      name: t.name ?? a.name ?? "",
      icon: t.image_url && t.image_url !== "missing.png" ? t.image_url : null,
      dexId: p.relationships?.dex?.data?.id ?? "",
      createdAt: a.pool_created_at ? Date.parse(a.pool_created_at) : null,
      fdvUsd: num(a.fdv_usd),
      mcapUsd: num(a.market_cap_usd),
      reserveUsd: num(a.reserve_in_usd),
      priceUsd: num(a.base_token_price_usd),
      priceChange: pc,
      volume: vol,
      flow,
    });
  }
  return out;
}

export function gtNewPools(network: string) {
  return soft(
    cached(`gt:new:${network}`, 60_000, async () =>
      parseGtPools(
        await fetchJson(`${GT}/networks/${network}/new_pools?include=base_token`)
      )
    )
  );
}

export function gtTrendingPools(network: string) {
  return soft(
    cached(`gt:trend:${network}`, 120_000, async () =>
      parseGtPools(
        await fetchJson(
          `${GT}/networks/${network}/trending_pools?include=base_token`
        )
      )
    )
  );
}

// Up to 30 pools per call.
export async function gtPoolsMulti(network: string, pools: string[]) {
  const out: GtPool[] = [];
  for (let i = 0; i < pools.length; i += 30) {
    const chunk = pools.slice(i, i + 30);
    const res = await soft(
      cached(`gt:multi:${network}:${chunk.join(",")}`, 60_000, async () =>
        parseGtPools(
          await fetchJson(
            `${GT}/networks/${network}/pools/multi/${chunk.join(",")}?include=base_token`
          )
        )
      )
    );
    if (res) out.push(...res);
  }
  return out;
}

export interface OhlcvBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function gtOhlcv(network: string, pool: string) {
  // 5-minute bars, last 24h. GT returns newest first.
  return soft(
    cached(`gt:ohlcv:${network}:${pool}`, 60_000, async () => {
      const json = await fetchJson(
        `${GT}/networks/${network}/pools/${pool}/ohlcv/minute?aggregate=5&limit=288&token=base`
      );
      const rows: number[][] = json?.data?.attributes?.ohlcv_list ?? [];
      return rows
        .map(
          ([t, o, h, l, c, v]): OhlcvBar => ({
            time: t,
            open: o,
            high: h,
            low: l,
            close: c,
            volume: v,
          })
        )
        .sort((a, b) => a.time - b.time);
    })
  );
}

// ---- DexScreener -------------------------------------------------------------

export interface DsListing {
  chainId: string;
  tokenAddress: string;
  icon: string | null;
}

function parseListings(json: any): DsListing[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((x) => x?.chainId && x?.tokenAddress)
    .map((x) => ({
      chainId: x.chainId,
      tokenAddress: x.tokenAddress,
      icon: typeof x.icon === "string" && x.icon.startsWith("http") ? x.icon : null,
    }));
}

export function dsLatestProfiles() {
  return soft(
    cached("ds:profiles", 60_000, async () =>
      parseListings(await fetchJson(`${DS}/token-profiles/latest/v1`))
    )
  );
}

export function dsLatestBoosts() {
  return soft(
    cached("ds:boosts", 60_000, async () =>
      parseListings(await fetchJson(`${DS}/token-boosts/latest/v1`))
    )
  );
}

// DexScreener pair object, as returned by /tokens/v1 (kept loose on purpose).
export type DsPair = any;

// Up to 30 token addresses per call; returns every pair for those tokens.
export async function dsTokenPairs(chain: ChainId, addresses: string[]) {
  const out: DsPair[] = [];
  let ok = addresses.length === 0;
  for (let i = 0; i < addresses.length; i += 30) {
    const chunk = addresses.slice(i, i + 30);
    const res = await soft(
      cached(`ds:tokens:${chain}:${chunk.join(",")}`, 45_000, () =>
        fetchJson(`${DS}/tokens/v1/${chain}/${chunk.join(",")}`)
      )
    );
    if (Array.isArray(res)) {
      ok = true;
      out.push(...res);
    }
  }
  return ok ? out : null;
}

// ---- RugCheck (Solana) ------------------------------------------------------

export function rugcheckReport(mint: string) {
  return soft(
    cached(`rc:${mint}`, 120_000, () => fetchJson(`${RC}/tokens/${mint}/report`))
  );
}

// ---- GoPlus -----------------------------------------------------------------

export function goplusSolana(mint: string) {
  return soft(
    cached(`gp:sol:${mint}`, 120_000, async () => {
      const json = await fetchJson(
        `${GP}/solana/token_security?contract_addresses=${mint}`
      );
      return json?.result?.[mint] ?? null;
    })
  );
}

// The docs allow comma-separated batches, but keyless calls only ever return
// the first address — so it is one call per token. Result keys are lowercase.
export function goplusEvm(chainId: string, address: string) {
  const a = address.toLowerCase();
  return soft(
    cached(`gp:evm:${chainId}:${a}`, 120_000, async () => {
      const json = await fetchJson(
        `${GP}/token_security/${chainId}?contract_addresses=${a}`
      );
      return json?.result?.[a] ?? null;
    })
  );
}

// ---- Honeypot.is (EVM) ------------------------------------------------------

export function honeypotSim(chainId: string, address: string) {
  return soft(
    cached(`hp:${chainId}:${address}`, 120_000, () =>
      fetchJson(`${HP}/IsHoneypot?address=${address}&chainID=${chainId}`)
    )
  );
}

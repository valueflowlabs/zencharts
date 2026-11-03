// Trends panel: what the market is paying attention to right now.
//
//   1. On-chain narratives: theme words shared by several trending / newly
//      launched tokens across every GeckoTerminal network ("stonk", "gta6"),
//      ranked by an intensity index. Many launches reusing one name is itself
//      the signal, so tokens are counted by address, not by name.
//   2. Search attention: CoinGecko's most-searched coins and categories.
//   3. Mainstream attention: Google Trends daily searches, matched to tokens
//      named after them.
//   4. Bitcoin-only research and news (see bitcoin.ts).
//
// Intensities are per section and not comparable across sections.

import { bitcoinDigest, type BitcoinDigest } from "./bitcoin";
import {
  cached,
  cgTrending,
  googleTrends,
  gtNewAll,
  gtTrendingAll,
  type CgCategory,
  type CgSearchCoin,
  type GoogleTrend,
  type GtPool,
} from "./sources";
import { CHAINS, CHAIN_IDS, type ChainId, type ScorePart } from "./types";

export interface TrendToken {
  network: string; // GeckoTerminal network id
  chain: ChainId | null; // finder chain, null when the finder does not cover it
  address: string;
  pool: string;
  symbol: string;
  name: string;
  icon: string | null;
  volumeH24: number;
  volumeH1: number;
  buyersH1: number;
  createdAt: number | null;
  fresh: boolean; // seen in the new-pools feed
}

export interface Narrative {
  keyword: string;
  related: string[]; // keywords folded in because they name mostly the same tokens
  intensity: number; // 0..100
  parts: ScorePart[];
  heat: number | null; // last-hour volume vs the 24h hourly average; > 1 = heating up
  tokens: TrendToken[]; // by 24h volume, highest first
  launches: number; // how many of them are in the new-pools feed
  volumeH24: number;
  buyersH1: number;
  networks: string[];
  alsoIn: ("google" | "coingecko")[];
}

export interface MainstreamTrend extends GoogleTrend {
  intensity: number; // 0..100 from search traffic
  tokens: TrendToken[]; // tokens named after the term
}

export interface TrendsResult {
  at: number;
  narratives: Narrative[];
  searches: CgSearchCoin[];
  categories: CgCategory[];
  mainstream: MainstreamTrend[];
  bitcoin: BitcoinDigest;
  sources: Record<string, "ok" | "error">;
}

const TRENDS_TTL_MS = 3 * 60_000;
const TRENDING_PAGES = [1, 2, 3, 4];
const NEW_PAGES = [1, 2, 3];
const MAX_NARRATIVES = 12;
const MIN_NARRATIVE_VOLUME = 1_000; // 24h USD; below this a "theme" is dust

const GT_TO_CHAIN = new Map<string, ChainId>(CHAIN_IDS.map((c) => [CHAINS[c].gt, c]));

// Words that say nothing about a theme: chain and quote tickers, launchpad
// suffixes, filler.
const STOP = new Set(
  (
    "the and for with from you your our this that are was coin coins token tokens official " +
    "sol solana eth ether ethereum bnb bsc base btc wbtc weth wsol wbnb usd usdc usdt usdg usde " +
    "dai wrapped pump fun bonk launch meme memes new real just inu dao finance protocol network " +
    "labs app chain swap cto ton"
  ).split(" ")
);
const SHORT_OK = new Set(["ai"]); // two-letter themes worth keeping

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const log01 = (n: number, lo: number, hi: number) =>
  clamp01((Math.log10(Math.max(n, 1)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));

// "StonkCat Inu" → ["stonk", "cat", "inu"]: split on camelCase and separators.
// All-caps names stay whole ("STONKCAT"); matches() covers those by substring.
export function wordsOf(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function isTheme(w: string) {
  if (SHORT_OK.has(w)) return true;
  return (
    w.length >= 3 &&
    w.length <= 12 &&
    !STOP.has(w) &&
    !/^\d+$/.test(w) &&
    !(/\d/.test(w) && /^[0-9a-f]{5,}$/.test(w)) // hex-like ids ("1f3d9"), not "gta6"
  );
}

// Short themes match whole words only ("cat" ≠ "catch"). Longer ones also
// start a joined word ("stonk" → "stonkcat") or end one after a real prefix
// ("memestonk"), but not after a letter or two ("cash" ≠ "zcash").
export function wordMatches(w: string, kw: string): boolean {
  if (w === kw) return true;
  if (kw.length <= 3) return false;
  return w.startsWith(kw) || (w.endsWith(kw) && w.length - kw.length >= 3);
}

function matches(t: TrendToken, kw: string): boolean {
  return [...wordsOf(t.name), ...wordsOf(t.symbol)].some((w) => wordMatches(w, kw));
}

function toToken(p: GtPool, fresh: boolean): TrendToken {
  return {
    network: p.network,
    chain: GT_TO_CHAIN.get(p.network) ?? null,
    address: p.tokenAddress,
    pool: p.poolAddress,
    symbol: p.symbol,
    name: p.name,
    icon: p.icon,
    volumeH24: p.volume.h24 ?? 0,
    volumeH1: p.volume.h1 ?? 0,
    buyersH1: p.flow.h1?.buyers ?? 0,
    createdAt: p.createdAt,
    fresh,
  };
}

// One entry per token (its busiest pool), keyed network:address.
export function corpusOf(trending: GtPool[], fresh: GtPool[]): TrendToken[] {
  const byKey = new Map<string, TrendToken>();
  const put = (t: TrendToken) => {
    const k = `${t.network}:${t.address.toLowerCase()}`;
    const cur = byKey.get(k);
    if (!cur) byKey.set(k, t);
    else {
      cur.fresh ||= t.fresh;
      if (t.volumeH24 > cur.volumeH24) byKey.set(k, { ...t, fresh: cur.fresh });
    }
  };
  for (const p of trending) put(toToken(p, false));
  for (const p of fresh) put(toToken(p, true));
  return [...byKey.values()];
}

export function buildNarratives(corpus: TrendToken[]): Narrative[] {
  const vocab = new Set<string>();
  for (const t of corpus) for (const w of [...wordsOf(t.name), ...wordsOf(t.symbol)]) if (isTheme(w)) vocab.add(w);

  // keyword → tokens. A theme needs two different tickers, or a copycat wave
  // of at least three launches of one; two pools of one ticker is just a token.
  const groups = new Map<string, TrendToken[]>();
  for (const kw of vocab) {
    const hit = corpus.filter((t) => matches(t, kw));
    const tickers = new Set(hit.map((t) => compact(t.symbol))).size;
    if (tickers >= 2 || hit.length >= 3) groups.set(kw, hit);
  }

  // Keywords with the same token set are one theme: keep the longest
  // ("pepe" over "pep").
  const bySet = new Map<string, string>();
  for (const [kw, list] of groups) {
    const sig = list.map((t) => `${t.network}:${t.address}`).sort().join("|");
    const cur = bySet.get(sig);
    if (!cur || kw.length > cur.length) bySet.set(sig, kw);
  }

  const out: Narrative[] = [];
  for (const kw of bySet.values()) {
    const tokens = [...groups.get(kw)!].sort((a, b) => b.volumeH24 - a.volumeH24);
    const volumeH24 = tokens.reduce((s, t) => s + t.volumeH24, 0);
    if (volumeH24 < MIN_NARRATIVE_VOLUME) continue;
    const buyersH1 = tokens.reduce((s, t) => s + t.buyersH1, 0);
    // Heat only from tokens older than a day: a fresh launch has all its 24h
    // volume in the last hour, which would read as 24× heat.
    const seasoned = tokens.filter((t) => t.createdAt !== null && Date.now() - t.createdAt > 86_400_000);
    const sH24 = seasoned.reduce((s, t) => s + t.volumeH24, 0);
    const sH1 = seasoned.reduce((s, t) => s + t.volumeH1, 0);
    // Heuristic scales: 10 tokens, $10M 24h volume, 3,000 buyers an hour = full marks.
    const parts: ScorePart[] = [
      { id: "breadth", label: "Tokens on the theme", weight: 0.3, value: clamp01(Math.log10(1 + tokens.length) / Math.log10(11)) },
      { id: "money", label: "24h volume", weight: 0.4, value: log01(volumeH24, 1e4, 1e7) },
      { id: "buyers", label: "Unique buyers 1h", weight: 0.3, value: log01(1 + buyersH1, 1, 3_000) },
    ];
    out.push({
      keyword: kw,
      related: [],
      intensity: Math.round(parts.reduce((s, p) => s + p.weight * p.value, 0) * 100),
      parts,
      heat: sH24 > 0 ? sH1 / (sH24 / 24) : null,
      tokens,
      launches: tokens.filter((t) => t.fresh).length,
      volumeH24,
      buyersH1,
      networks: [...new Set(tokens.map((t) => t.network))],
      alsoIn: [],
    });
  }
  // One wave often shows up under several words ("amd", "dog", "moon" on the
  // same copycat launches). Strongest first; a theme sharing most of its
  // tokens with a stronger one is folded into it.
  const key = (t: TrendToken) => `${t.network}:${t.address}`;
  const kept: Narrative[] = [];
  for (const n of out.sort((a, b) => b.intensity - a.intensity)) {
    const mine = new Set(n.tokens.map(key));
    const host = kept.find((k) => {
      const shared = k.tokens.filter((t) => mine.has(key(t))).length;
      return shared / Math.min(mine.size, k.tokens.length) >= 0.6;
    });
    if (host) host.related.push(n.keyword);
    else kept.push(n);
  }
  // Label each theme with the word its tickers actually use ("toshi" over
  // "grinding", which only appears in a long name).
  for (const n of kept) {
    const inTickers = (kw: string) =>
      n.tokens.filter((t) => wordsOf(t.symbol).some((w) => wordMatches(w, kw))).length;
    const best = [n.keyword, ...n.related].reduce((a, b) => (inTickers(b) > inTickers(a) ? b : a));
    if (best !== n.keyword) {
      n.related = [n.keyword, ...n.related.filter((k) => k !== best)];
      n.keyword = best;
    }
  }
  return kept.slice(0, MAX_NARRATIVES);
}

// Words in search terms that name no theme of their own.
const SEARCH_STOP = new Set(
  (
    "stock stocks price earnings today tonight results result election elections news live game " +
    "score scores vs schedule weather update death dies dead age height wife husband net worth " +
    "league cup final match draft trade"
  ).split(" ")
);

// Tokens named after a mainstream search term ("amd stock" → AMD tokens).
function tokensForTerm(term: string, corpus: TrendToken[]): TrendToken[] {
  const words = wordsOf(term).filter((w) => isTheme(w) && !SEARCH_STOP.has(w));
  if (!words.length) return [];
  return corpus
    .filter((t) => {
      const own = [...wordsOf(t.name), ...wordsOf(t.symbol)];
      return words.some((kw) => own.some((w) => wordMatches(w, kw)));
    })
    .sort((a, b) => b.volumeH24 - a.volumeH24)
    .slice(0, 6);
}

async function runTrends(): Promise<TrendsResult> {
  const [trendingPages, newPages, cg, google, btc] = await Promise.all([
    Promise.all(TRENDING_PAGES.map(gtTrendingAll)),
    Promise.all(NEW_PAGES.map(gtNewAll)),
    cgTrending(),
    googleTrends("US"),
    bitcoinDigest(),
  ]);
  const trending = trendingPages.flatMap((p) => p ?? []);
  const fresh = newPages.flatMap((p) => p ?? []);
  const corpus = corpusOf(trending, fresh);
  const narratives = buildNarratives(corpus);

  const mainstream: MainstreamTrend[] = (google ?? []).map((g) => ({
    ...g,
    // 1M+ searches = full marks; Google's floor bucket is "100+".
    intensity: Math.round(log01(g.traffic, 100, 1e6) * 100),
    tokens: tokensForTerm(g.term, corpus),
  }));

  // Cross-links: a theme that is also a mainstream search or a most-searched coin.
  const cgText = (cg?.coins ?? []).map((c) => compact(`${c.name} ${c.symbol}`));
  for (const n of narratives) {
    if (mainstream.some((m) => wordsOf(m.term).some((w) => w === n.keyword || n.related.includes(w))))
      n.alsoIn.push("google");
    if (cgText.some((c) => c.includes(n.keyword))) n.alsoIn.push("coingecko");
  }

  return {
    at: Date.now(),
    narratives,
    searches: cg?.coins ?? [],
    categories: cg?.categories ?? [],
    mainstream,
    bitcoin: btc.digest,
    sources: {
      "geckoterminal:trending": trendingPages.some(Boolean) ? "ok" : "error",
      "geckoterminal:new": newPages.some(Boolean) ? "ok" : "error",
      coingecko: cg ? "ok" : "error",
      "google trends": google ? "ok" : "error",
      ...btc.sources,
    },
  };
}

export function trends(): Promise<TrendsResult> {
  return cached("trends", TRENDS_TTL_MS, runTrends);
}

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
//   - Telegram (t.me): the public preview page of a linked group or channel —
//     member / subscriber count, and members online for groups.
//
// Every adapter returns `null` on failure so one dead provider degrades the
// affected checks to "unknown" instead of failing the whole scan.

import { fetchJson, fetchText } from "../sources";
import type { ChainId, Telegram } from "./types";

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

export async function soft<T>(p: Promise<T>): Promise<T | null> {
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
  network: string; // GeckoTerminal network id, e.g. "solana", "eth"
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

// Token names are attacker-chosen: drop control and bidi-override characters
// (e.g. U+202E, which flips the rest of a line) before they reach the UI.
export const cleanName = (s: string) =>
  s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();

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
      network: p.relationships?.network?.data?.id ?? String(p.id ?? "").split("_")[0],
      poolAddress: a.address,
      tokenAddress,
      // GeckoTerminal returns names HTML-escaped ("S&amp;P").
      symbol: cleanName(unescapeXml(t.symbol ?? String(a.name ?? "?").split(" / ")[0])),
      name: cleanName(unescapeXml(t.name ?? a.name ?? "")),
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

// Trending / new pools across every network GeckoTerminal tracks, one page
// (20 pools) per call. Feeds the trends panel.
export function gtTrendingAll(page: number) {
  return soft(
    cached(`gt:trend:all:${page}`, 5 * 60_000, async () =>
      parseGtPools(
        await fetchJson(`${GT}/networks/trending_pools?include=base_token&page=${page}`)
      )
    )
  );
}

export function gtNewAll(page: number) {
  return soft(
    cached(`gt:new:all:${page}`, 5 * 60_000, async () =>
      parseGtPools(await fetchJson(`${GT}/networks/new_pools?include=base_token&page=${page}`))
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

// One pair by its id: a pool address, or a 32-byte pool id on Uniswap v4.
// Resolves to `null` when the id is not a pair (e.g. it is a token address).
export function dsPair(chain: ChainId, pairId: string) {
  return soft(
    cached(`ds:pair:${chain}:${pairId}`, 45_000, async (): Promise<DsPair | null> => {
      const json = await fetchJson(`${DS}/latest/dex/pairs/${chain}/${pairId}`);
      return json?.pair ?? json?.pairs?.[0] ?? null;
    })
  );
}

// ---- Telegram ---------------------------------------------------------------

// Counts move slowly, so a long TTL keeps scan refreshes from re-scraping.
const TG_TTL_MS = 10 * 60_000;

// t.me prints "8 137 members, 514 online" (groups) or "4 422 subscribers"
// (channels), grouping thousands with spaces and using the singular for 1.
// A group with nobody online omits the ", N online" part.
export function parseTgExtra(text: string): Omit<Telegram, "url"> | null {
  const m = text.match(/([\d\s\u00a0]+)\s(members?|subscribers?)(?:,\s*([\d\s\u00a0]+)\sonline)?/);
  if (!m) return null;
  const n = (x: string) => Number(x.replace(/\D/g, ""));
  const group = m[2].startsWith("member");
  return {
    kind: group ? "group" : "channel",
    members: n(m[1]),
    online: group ? (m[3] ? n(m[3]) : 0) : null,
  };
}

export function tgStats(url: string) {
  // Public handles and "+invite" links both have a preview page.
  const id = url.match(/^https?:\/\/(?:www\.)?(?:t|telegram)\.me\/(?:s\/)?(\+?[A-Za-z0-9_-]+)/)?.[1];
  if (!id) return Promise.resolve(null);
  return soft(
    cached(`tg:${id.toLowerCase()}`, TG_TTL_MS, async (): Promise<Telegram | null> => {
      const html = await fetchText(`https://t.me/${id}`);
      const extra = html.match(/<div class="tgme_page_extra">([^<]*)/)?.[1];
      const stats = extra ? parseTgExtra(extra) : null;
      return stats ? { url: `https://t.me/${id}`, ...stats } : null;
    })
  );
}

// ---- CoinGecko (search attention) -------------------------------------------

export interface CgSearchCoin {
  id: string;
  symbol: string;
  name: string;
  thumb: string | null;
  rank: number; // position in CoinGecko's most-searched list, 1 = top
  marketCapRank: number | null;
  change24h: number | null;
  mcapUsd: number | null;
}

export interface CgCategory {
  slug: string;
  name: string;
  coins: number;
  change24h: number | null; // category market cap, %
}

// Parses "$18,558,507" style strings.
const money = (v: unknown) => num(typeof v === "string" ? v.replace(/[$,]/g, "") : v);

export function cgTrending() {
  return soft(
    cached("cg:trending", 5 * 60_000, async () => {
      const json = await fetchJson("https://api.coingecko.com/api/v3/search/trending");
      const coins: CgSearchCoin[] = (json?.coins ?? []).map((c: any, i: number) => {
        const it = c?.item ?? {};
        return {
          id: String(it.id ?? ""),
          symbol: cleanName(String(it.symbol ?? "")),
          name: cleanName(String(it.name ?? "")),
          thumb: typeof it.thumb === "string" ? it.thumb : null,
          rank: (num(it.score) ?? i) + 1,
          marketCapRank: num(it.market_cap_rank),
          change24h: num(it.data?.price_change_percentage_24h?.usd),
          mcapUsd: money(it.data?.market_cap),
        };
      });
      const categories: CgCategory[] = (json?.categories ?? []).map((c: any) => ({
        slug: String(c?.slug ?? ""),
        name: cleanName(String(c?.name ?? "")),
        coins: num(c?.coins_count) ?? 0,
        change24h: num(c?.data?.market_cap_change_percentage_24h?.usd),
      }));
      return { coins, categories };
    })
  );
}

// ---- Google Trends (mainstream attention) -----------------------------------

export interface GoogleTrend {
  term: string;
  traffic: number; // lower bound of Google's "approx traffic", e.g. 10000 for "10000+"
  startedAt: number | null; // ms
  news: { title: string; url: string; source: string } | null;
}

export const unescapeXml = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

// Daily trending searches RSS: ~10 terms with traffic and the top headline.
export function googleTrends(geo = "US") {
  return soft(
    cached(`google:trends:${geo}`, 10 * 60_000, async () => {
      const xml = await fetchText(`https://trends.google.com/trending/rss?geo=${geo}`);
      const tag = (s: string, t: string) =>
        s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1];
      return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]): GoogleTrend => {
        const news = it.match(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/)?.[1];
        const url = news ? unescapeXml(tag(news, "ht:news_item_url") ?? "") : "";
        const date = tag(it, "pubDate");
        return {
          term: cleanName(unescapeXml(tag(it, "title") ?? "")),
          traffic: Number((tag(it, "ht:approx_traffic") ?? "").replace(/\D/g, "")) || 0,
          startedAt: date ? Date.parse(date) || null : null,
          news:
            news && /^https?:\/\//.test(url)
              ? {
                  title: cleanName(unescapeXml(tag(news, "ht:news_item_title") ?? "")),
                  url,
                  source: cleanName(unescapeXml(tag(news, "ht:news_item_source") ?? "")),
                }
              : null,
        };
      }).filter((g) => g.term);
    })
  );
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

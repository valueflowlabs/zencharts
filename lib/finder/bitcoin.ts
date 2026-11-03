// Bitcoin-only research and news for the bottom of the trends panel, for a
// technical reader: network fundamentals first, then research, then news.
//
//   - mempool.space: live network state — hashrate, difficulty retarget,
//     fee rates, mempool backlog; the halving is derived from the height.
//   - Bitcoin Optech (bitcoinops.org): the weekly technical newsletter.
//   - Bitcoin Core releases (GitHub, keyless 60 req/h, so cached for an hour).
//   - Delving Bitcoin (delvingbitcoin.org): the protocol research forum. Its
//     monthly "top" list is ranked here by engagement (likes, replies, views).
//   - arXiv: papers with Bitcoin / Lightning / proof-of-work in the title,
//     split into computer science (technical) and q-fin / econ (economic).
//   - Google News "bitcoin" (last 2 days, Google's relevance order), Bitcoin
//     Magazine (Bitcoin-only outlet, newest first) and Hacker News stories
//     (30 days, by points) for news.
//
// Every adapter returns `null` on failure, like the rest of the finder.

import { fetchJson, fetchText } from "../sources";
import { cached, cleanName, soft, unescapeXml } from "./sources";

export interface BtcItem {
  title: string;
  url: string;
  source: string;
  at: number | null; // ms
  summary?: string;
  meta?: string; // e.g. "12 likes · 30 replies"
}

const tag = (s: string, t: string) =>
  s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`))?.[1];
const text = (s: string | undefined) =>
  cleanName(unescapeXml(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
const isHttp = (u: string) => /^https?:\/\//.test(u);
const when = (s: string | undefined) => (s ? Date.parse(s) || null : null);

// First sentence, cut at a word boundary when it is still too long.
const firstSentence = (s: string, max: number) => {
  const first = s.split(/(?<=\.)\s/)[0];
  return first.length <= max ? first : `${first.slice(0, first.lastIndexOf(" ", max))}…`;
};

// Delving topics ranked by engagement: a like or reply is a stronger signal
// than a view. The forum's welcome post is pinned and skipped.
export function delvingTop() {
  return soft(
    cached("btc:delving", 30 * 60_000, async () => {
      const json = await fetchJson("https://delvingbitcoin.org/top.json?period=monthly");
      const topics: any[] = json?.topic_list?.topics ?? [];
      const engagement = (t: any) =>
        3 * (t.like_count ?? 0) + 2 * Math.max(0, (t.posts_count ?? 1) - 1) + (t.views ?? 0) / 40;
      return topics
        .filter((t) => !t.pinned && t.id && t.slug)
        .sort((a, b) => engagement(b) - engagement(a))
        .slice(0, 6)
        .map(
          (t): BtcItem => ({
            title: cleanName(String(t.title ?? "")),
            url: `https://delvingbitcoin.org/t/${encodeURIComponent(t.slug)}/${Number(t.id)}`,
            source: "Delving Bitcoin",
            at: when(t.created_at),
            meta: `${t.like_count ?? 0} likes · ${Math.max(0, (t.posts_count ?? 1) - 1)} replies · ${t.views ?? 0} views`,
          })
        );
    })
  );
}

export function optechLatest() {
  return soft(
    cached("btc:optech", 60 * 60_000, async (): Promise<BtcItem | null> => {
      const xml = await fetchText("https://bitcoinops.org/feed.xml");
      const entry = xml.match(/<entry[\s>][\s\S]*?<\/entry>/)?.[0];
      const url = entry?.match(/<link href="([^"]+)"/)?.[1] ?? "";
      if (!entry || !isHttp(url)) return null;
      const summary = text(tag(entry, "content"));
      return {
        title: text(tag(entry, "title")),
        url,
        source: "Bitcoin Optech",
        at: when(tag(entry, "published")),
        // The first sentence is the editors' summary of the week.
        summary: firstSentence(summary, 320),
      };
    })
  );
}

// Releases from the last 30 days (Core ships point releases of several
// branches at once, so there can be more than one).
export function coreReleases() {
  return soft(
    cached("btc:core", 60 * 60_000, async () => {
      const json = await fetchJson("https://api.github.com/repos/bitcoin/bitcoin/releases?per_page=5");
      const cutoff = Date.now() - 30 * 86_400_000;
      return (Array.isArray(json) ? json : [])
        .filter((r: any) => !r.draft && !r.prerelease && isHttp(String(r.html_url ?? "")))
        .map(
          (r: any): BtcItem => ({
            title: cleanName(String(r.name || r.tag_name || "")),
            url: r.html_url,
            source: "Bitcoin Core",
            at: when(r.published_at),
          })
        )
        .filter((r: BtcItem) => (r.at ?? 0) >= cutoff);
    })
  );
}

function rssItems(xml: string, source: (it: string, title: string) => { title: string; source: string }) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, it]): BtcItem[] => {
    const url = text(tag(it, "link"));
    if (!isHttp(url)) return [];
    const s = source(it, text(tag(it, "title")));
    return [{ ...s, url, at: when(tag(it, "pubDate")) }];
  });
}

// Google News titles end in " - Outlet"; only stories naming Bitcoin count.
export function googleNewsBitcoin() {
  return soft(
    cached("btc:gnews", 15 * 60_000, async () => {
      const xml = await fetchText(
        "https://news.google.com/rss/search?q=bitcoin+when:2d&hl=en-US&gl=US&ceid=US:en"
      );
      return rssItems(xml, (it, title) => {
        const outlet = text(tag(it, "source"));
        const cut = outlet && title.endsWith(` - ${outlet}`) ? title.length - outlet.length - 3 : title.length;
        return { title: title.slice(0, cut), source: outlet || "Google News" };
      })
        .filter((n) => /\b(bitcoin|btc)\b/i.test(n.title))
        .slice(0, 8);
    })
  );
}

export function bitcoinMagazine() {
  return soft(
    cached("btc:btcmag", 15 * 60_000, async () =>
      rssItems(await fetchText("https://bitcoinmagazine.com/.rss/full/"), (_, title) => ({
        title,
        source: "Bitcoin Magazine",
      })).slice(0, 5)
    )
  );
}

// ---- arXiv ------------------------------------------------------------------

const ARXIV_QUERY = {
  technical:
    '(ti:bitcoin OR ti:"lightning network" OR ti:"proof-of-work" OR ti:taproot OR ti:mempool) AND cat:cs.*',
  economic: "ti:bitcoin AND (cat:q-fin.* OR cat:econ.*)",
};

async function arxivQuery(q: string): Promise<BtcItem[]> {
  const xml = await fetchText(
    `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=6`
  );
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]): BtcItem[] => {
    const url = text(tag(e, "id")).replace(/^http:/, "https:").replace(/v\d+$/, "");
    if (!isHttp(url)) return [];
    const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(([, n]) => text(n));
    const cats = [...e.matchAll(/<category term="([^"]+)"/g)].map(([, c]) => c);
    return [
      {
        title: text(tag(e, "title")),
        url,
        source: "arXiv",
        at: when(tag(e, "published")),
        summary: firstSentence(text(tag(e, "summary")), 280),
        meta: [
          authors.length > 2 ? `${authors[0]} et al.` : authors.join(", "),
          [...new Set(cats)].slice(0, 2).join(" · "),
        ]
          .filter(Boolean)
          .join(" · "),
      },
    ];
  });
}

// arXiv asks for ~3s between API calls, and papers arrive daily at most.
export function arxivBitcoin() {
  return soft(
    cached("btc:arxiv", 6 * 60 * 60_000, async () => {
      const technical = await arxivQuery(ARXIV_QUERY.technical);
      await new Promise((r) => setTimeout(r, 3_000));
      const economic = await arxivQuery(ARXIV_QUERY.economic);
      return { technical, economic };
    })
  );
}

// ---- Hacker News ---------------------------------------------------------------

export function hnBitcoin() {
  return soft(
    cached("btc:hn", 30 * 60_000, async () => {
      const since = Math.floor(Date.now() / 1000) - 30 * 86_400;
      const json = await fetchJson(
        `https://hn.algolia.com/api/v1/search?query=bitcoin&tags=story&numericFilters=created_at_i>${since},points>20`
      );
      return (json?.hits ?? [])
        .filter((h: any) => /\bbitcoin\b/i.test(String(h.title ?? "")))
        .sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
        .slice(0, 4)
        .map(
          (h: any): BtcItem => ({
            title: cleanName(String(h.title ?? "")),
            // The discussion is the point; the link is one click from there.
            url: `https://news.ycombinator.com/item?id=${Number(h.objectID)}`,
            source: "Hacker News",
            at: (h.created_at_i ?? 0) * 1000 || null,
            meta: `${h.points ?? 0} points · ${h.num_comments ?? 0} comments`,
          })
        );
    })
  );
}

// ---- mempool.space (network state) --------------------------------------------

export interface BtcNetwork {
  height: number;
  hashrateEhs: number; // exahashes per second, current estimate
  difficultyChangePct: number; // estimated at the next retarget
  retargetBlocks: number;
  retargetAt: number; // ms, estimate
  fees: { fastest: number; hour: number; economy: number }; // sat/vB
  mempoolTxs: number;
  mempoolVmb: number; // virtual megabytes waiting (1 block ≈ 1 vMB)
  halvingBlocks: number;
  halvingAt: number; // ms, estimate at the current block interval
}

const MP = "https://mempool.space/api";
const HALVING_INTERVAL = 210_000;

export function mempoolNetwork() {
  return soft(
    cached("btc:mempool", 2 * 60_000, async (): Promise<BtcNetwork> => {
      const [height, diff, fees, pool, hash] = await Promise.all([
        fetchJson(`${MP}/blocks/tip/height`),
        fetchJson(`${MP}/v1/difficulty-adjustment`),
        fetchJson(`${MP}/v1/fees/recommended`),
        fetchJson(`${MP}/mempool`),
        fetchJson(`${MP}/v1/mining/hashrate/3d`),
      ]);
      const h = Number(height);
      const blockMs = Number(diff?.timeAvg) || 600_000;
      const halvingBlocks = (Math.floor(h / HALVING_INTERVAL) + 1) * HALVING_INTERVAL - h;
      return {
        height: h,
        hashrateEhs: Number(hash?.currentHashrate ?? 0) / 1e18,
        difficultyChangePct: Number(diff?.difficultyChange ?? 0),
        retargetBlocks: Number(diff?.remainingBlocks ?? 0),
        retargetAt: Number(diff?.estimatedRetargetDate ?? 0),
        fees: {
          fastest: Number(fees?.fastestFee ?? 0),
          hour: Number(fees?.hourFee ?? 0),
          economy: Number(fees?.economyFee ?? 0),
        },
        mempoolTxs: Number(pool?.count ?? 0),
        mempoolVmb: Number(pool?.vsize ?? 0) / 1e6,
        halvingBlocks,
        halvingAt: Date.now() + halvingBlocks * blockMs,
      };
    })
  );
}

// ---- digest ---------------------------------------------------------------------

export interface BitcoinDigest {
  network: BtcNetwork | null;
  technical: BtcItem[]; // Optech, latest Core release, Delving by engagement, arXiv cs.*
  economic: BtcItem[]; // arXiv q-fin / econ
  news: BtcItem[]; // Google News, Bitcoin Magazine, Hacker News; de-duplicated
}

// Price-ticker articles carry no information beyond the chart.
const PRICE_CHATTER = /\b(price (prediction|today|analysis|forecast)|current price|price of bitcoin)\b/i;

const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);

export async function bitcoinDigest(): Promise<{ digest: BitcoinDigest; sources: Record<string, "ok" | "error"> }> {
  const [network, delving, optech, core, arxiv, gnews, btcmag, hn] = await Promise.all([
    mempoolNetwork(),
    delvingTop(),
    optechLatest(),
    coreReleases(),
    arxivBitcoin(),
    googleNewsBitcoin(),
    bitcoinMagazine(),
    hnBitcoin(),
  ]);

  // Core ships several branches' point releases at once: one item, newest first.
  const releases = core ?? [];
  const release: BtcItem[] = releases.length
    ? [{ ...releases[0], meta: releases.length > 1 ? `also ${releases.slice(1).map((r) => r.title.replace(/^Bitcoin Core\s*/, "")).join(", ")}` : undefined }]
    : [];
  // Delving's own release announcements duplicate the item above.
  const research = (delving ?? []).filter((t) => !(release.length && /\breleased?\b/i.test(t.title)));

  const seen = new Set<string>();
  const news = [...(gnews ?? []), ...(btcmag ?? []), ...(hn ?? [])].filter((n) => {
    const k = titleKey(n.title);
    if (!k || seen.has(k) || PRICE_CHATTER.test(n.title)) return false;
    seen.add(k);
    return true;
  });

  return {
    digest: {
      network,
      technical: [...(optech ? [optech] : []), ...release, ...research, ...(arxiv?.technical ?? [])],
      economic: arxiv?.economic ?? [],
      news: news.slice(0, 12),
    },
    sources: {
      "mempool.space": network ? "ok" : "error",
      "delving bitcoin": delving ? "ok" : "error",
      "bitcoin optech": optech ? "ok" : "error",
      "github releases": core ? "ok" : "error",
      arxiv: arxiv ? "ok" : "error",
      "google news": gnews ? "ok" : "error",
      "bitcoin magazine": btcmag ? "ok" : "error",
      "hacker news": hn ? "ok" : "error",
    },
  };
}

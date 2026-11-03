"use client";

import { useEffect } from "react";
import type { BtcItem, BtcNetwork } from "@/lib/finder/bitcoin";
import type { MainstreamTrend, Narrative, TrendToken, TrendsResult } from "@/lib/finder/trends";
import type { ChainId } from "@/lib/finder/types";
import { fmtAgo, fmtPct, fmtUsd } from "@/lib/finder/format";

// Heat = last-hour volume vs the 24h hourly average (tokens older than a day).
export function heatLabel(heat: number | null): { text: string; tone: string } {
  if (heat === null) return { text: "new", tone: "" };
  if (heat >= 1.3) return { text: "↑ heating", tone: "is-up" };
  if (heat <= 0.7) return { text: "↓ cooling", tone: "is-down" };
  return { text: "→ steady", tone: "" };
}

const fmtIn = (ms: number) => {
  const d = (ms - Date.now()) / 86_400_000;
  return d < 2 ? `~${Math.max(0, Math.round(d * 24))}h` : d < 120 ? `~${Math.round(d)}d` : `~${(d / 365).toFixed(1)}y`;
};
const fmtDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function FinderTrends({
  data,
  error,
  onPick,
  onClose,
}: {
  data: TrendsResult | undefined;
  error?: string;
  onPick: (chain: ChainId, address: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const now = data?.narratives[0];
  const down = Object.entries(data?.sources ?? {}).filter(([, s]) => s === "error");

  return (
    <aside className="fd-detail fd-trends" role="dialog" aria-label="Trends">
      <div className="fd-detail-head">
        <div>
          <div className="fd-detail-sym">trends</div>
          <div className="fd-detail-name">
            what the market is paying attention to{data ? ` · updated ${fmtAgo(data.at)} ago` : ""}
          </div>
        </div>
        <button className="fd-x" onClick={onClose} aria-label="Close">×</button>
      </div>

      {!data && !error && <div className="fd-empty">reading trending pools, searches and news…</div>}
      {error && <div className="fd-note fd-note--err">{error}</div>}
      {down.length > 0 && (
        <div className="fd-note fd-note--warn">unavailable: {down.map(([k]) => k).join(", ")}</div>
      )}

      {data && (
        <>
          <nav className="fd-tr-jump" aria-label="Sections">
            <a href="#tr-narratives">narratives</a>
            <a href="#tr-mainstream">mainstream</a>
            <a href="#tr-coins">searched coins</a>
            <a href="#tr-sectors">sectors</a>
            <a href="#tr-bitcoin">bitcoin research &amp; news</a>
          </nav>

          {now && <Hero n={now} onPick={onPick} />}

          <section className="fd-section" id="tr-narratives">
            <h3>
              on-chain narratives
              <small> · themes shared by trending &amp; new tokens on every chain (GeckoTerminal)</small>
            </h3>
            {data.narratives.slice(1).map((n) => (
              <NarrativeRow key={n.keyword} n={n} onPick={onPick} />
            ))}
            {data.narratives.length === 0 && <div className="fd-tr-muted">no shared theme right now</div>}
          </section>

          <Mainstream list={data.mainstream} onPick={onPick} />

          <section className="fd-section" id="tr-coins">
            <h3>
              most searched coins <small> · CoinGecko, last 24h</small>
            </h3>
            <div className="fd-tr-coins">
              {data.searches.slice(0, 12).map((c) => (
                <a
                  key={c.id}
                  className="fd-tr-coin"
                  href={`https://www.coingecko.com/en/coins/${encodeURIComponent(c.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`${c.name}${c.marketCapRank ? ` · rank #${c.marketCapRank}` : ""} · mcap ${fmtUsd(c.mcapUsd)}`}
                >
                  <span className="fd-tr-rank">{c.rank}</span>
                  {c.thumb ? <img src={c.thumb} alt="" className="fd-icon" loading="lazy" /> : <span className="fd-icon" />}
                  <b>{c.symbol}</b>
                  <span className={tone(c.change24h)}>{fmtPct(c.change24h)}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="fd-section" id="tr-sectors">
            <h3>
              sectors in focus <small> · CoinGecko trending categories, 24h market-cap change</small>
            </h3>
            {data.categories.map((c) => (
              <a
                key={c.slug}
                className="fd-part fd-tr-link"
                href={`https://www.coingecko.com/en/categories/${encodeURIComponent(c.slug)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{c.name} <small className="fd-tr-muted">{c.coins} coins</small></span>
                <span className="fd-bar fd-bar--diverge">
                  <i
                    className={(c.change24h ?? 0) < 0 ? "is-neg" : ""}
                    style={{ width: `${Math.min(50, Math.abs(c.change24h ?? 0) * 2.5)}%` }}
                  />
                </span>
                <span className={`fd-num ${tone(c.change24h)}`}>{fmtPct(c.change24h)}</span>
              </a>
            ))}
          </section>

          <Bitcoin digest={data.bitcoin} />

          <p className="fd-foot">
            Intensities are per section and not comparable across sections. A theme is a word shared by
            several tokens’ names; copycat launches of one name count, since that is how a meme spreads.
            Information only — not investment advice.
          </p>
        </>
      )}
    </aside>
  );
}

function tone(n: number | null) {
  return n === null ? "" : n > 0 ? "is-up" : n < 0 ? "is-down" : "";
}

function Hero({ n, onPick }: { n: Narrative; onPick: (c: ChainId, a: string) => void }) {
  const h = heatLabel(n.heat);
  return (
    <section className="fd-tr-hero">
      <div className="fd-tr-hero-label">current thing</div>
      <div className="fd-tr-hero-row">
        <span className="fd-tr-hero-kw">{n.keyword}</span>
        <span className="fd-tr-hero-int">{n.intensity}</span>
        <span className={`fd-tr-heat ${h.tone}`}>{h.text}</span>
      </div>
      <IntensityBar n={n} />
      <NarrativeStats n={n} />
      <TokenChips tokens={n.tokens} onPick={onPick} />
    </section>
  );
}

function IntensityBar({ n }: { n: Narrative }) {
  return (
    <span
      className="fd-bar fd-tr-bar"
      title={n.parts.map((p) => `${p.label} ${Math.round(p.value * 100)} × ${Math.round(p.weight * 100)}%`).join("\n")}
    >
      <i style={{ width: `${n.intensity}%` }} />
    </span>
  );
}

function NarrativeStats({ n }: { n: Narrative }) {
  return (
    <div className="fd-tr-stats">
      {n.tokens.length} tokens{n.launches ? ` (${n.launches} new)` : ""} · {fmtUsd(n.volumeH24)} 24h ·{" "}
      {n.buyersH1} buyers 1h · {n.networks.join(", ")}
      {n.related.length > 0 && <> · also “{n.related.join("”, “")}”</>}
      {n.alsoIn.includes("google") && <i className="fd-badge">google trends</i>}
      {n.alsoIn.includes("coingecko") && <i className="fd-badge">coingecko</i>}
    </div>
  );
}

function NarrativeRow({ n, onPick }: { n: Narrative; onPick: (c: ChainId, a: string) => void }) {
  const h = heatLabel(n.heat);
  return (
    <div className="fd-tr-item">
      <div className="fd-tr-head">
        <b className="fd-tr-kw">{n.keyword}</b>
        <IntensityBar n={n} />
        <span className="fd-num">{n.intensity}</span>
        <span className={`fd-tr-heat ${h.tone}`}>{h.text}</span>
      </div>
      <NarrativeStats n={n} />
      <TokenChips tokens={n.tokens} onPick={onPick} />
    </div>
  );
}

// Searches that already have tokens named after them come first, with their
// headline; the rest (mostly sports and politics) stay one line each.
function Mainstream({ list, onPick }: { list: MainstreamTrend[]; onPick: (c: ChainId, a: string) => void }) {
  const matched = list.filter((m) => m.tokens.length).sort((a, b) => b.traffic - a.traffic);
  const rest = list.filter((m) => !m.tokens.length).sort((a, b) => b.traffic - a.traffic);
  return (
    <section className="fd-section" id="tr-mainstream">
      <h3>
        mainstream searches <small> · Google Trends US, last day · tokens named after a search first</small>
      </h3>
      {matched.map((m) => (
        <MainstreamRow key={m.term} m={m} onPick={onPick} />
      ))}
      {rest.length > 0 && (
        <div className="fd-tr-terms">
          {rest.map((m) => (
            <a
              key={m.term}
              href={m.news?.url ?? `https://trends.google.com/trends/explore?geo=US&q=${encodeURIComponent(m.term)}`}
              target="_blank"
              rel="noreferrer"
              title={m.news ? `${m.news.title} · ${m.news.source}` : undefined}
            >
              {m.term} <small>{m.traffic.toLocaleString("en-US")}+</small>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function MainstreamRow({ m, onPick }: { m: MainstreamTrend; onPick: (c: ChainId, a: string) => void }) {
  return (
    <div className="fd-tr-item">
      <div className="fd-tr-head">
        <b className="fd-tr-kw">{m.term}</b>
        <span className="fd-bar fd-tr-bar"><i style={{ width: `${m.intensity}%` }} /></span>
        <span className="fd-num">{m.traffic.toLocaleString("en-US")}+</span>
      </div>
      {m.news && (
        <a className="fd-tr-news" href={m.news.url} target="_blank" rel="noreferrer">
          {m.news.title} <small>· {m.news.source}</small>
        </a>
      )}
      {m.tokens.length > 0 && <TokenChips tokens={m.tokens} onPick={onPick} />}
    </div>
  );
}

// Tokens on a chain the finder covers open its full check; others link out.
function TokenChips({ tokens, onPick }: { tokens: TrendToken[]; onPick: (c: ChainId, a: string) => void }) {
  return (
    <div className="fd-tr-chips">
      {tokens.slice(0, 8).map((t) => {
        const label = (
          <>
            {t.icon ? <img src={t.icon} alt="" className="fd-icon" loading="lazy" /> : null}
            {t.symbol}
            <small>{t.network}</small>
          </>
        );
        const title = `${t.name} · ${fmtUsd(t.volumeH24)} 24h · ${t.buyersH1} buyers 1h`;
        return t.chain ? (
          <button key={`${t.network}:${t.address}`} className="fd-chip" title={`${title} — open checks`} onClick={() => onPick(t.chain!, t.address)}>
            {label}
          </button>
        ) : (
          <a
            key={`${t.network}:${t.address}`}
            className="fd-chip"
            title={`${title} — open on GeckoTerminal`}
            href={`https://www.geckoterminal.com/${encodeURIComponent(t.network)}/pools/${encodeURIComponent(t.pool)}`}
            target="_blank"
            rel="noreferrer"
          >
            {label} ↗
          </a>
        );
      })}
      {tokens.length > 8 && <span className="fd-tr-muted">+{tokens.length - 8}</span>}
    </div>
  );
}

// ---- Bitcoin -----------------------------------------------------------------------

function Bitcoin({ digest }: { digest: TrendsResult["bitcoin"] }) {
  return (
    <section className="fd-tr-btc" id="tr-bitcoin">
      <h2>bitcoin</h2>
      {digest.network && <Network n={digest.network} />}
      <ItemList
        title="technical research"
        note="Optech, Core releases, Delving Bitcoin by engagement, arXiv cs.*"
        items={digest.technical}
      />
      <ItemList title="economic research" note="arXiv q-fin / econ, newest first" items={digest.economic} />
      <ItemList
        title="news"
        note="Google News (2 days) · Bitcoin Magazine · Hacker News (30 days, by points)"
        items={digest.news}
      />
    </section>
  );
}

function Network({ n }: { n: BtcNetwork }) {
  return (
    <section className="fd-section">
      <h3>
        network <small> · mempool.space, live</small>
      </h3>
      <div className="fd-stats">
        <Stat k="block height" v={n.height.toLocaleString("en-US")} />
        <Stat k="hashrate" v={`${Math.round(n.hashrateEhs).toLocaleString("en-US")} EH/s`} />
        <Stat
          k="next retarget"
          v={`${n.difficultyChangePct > 0 ? "+" : ""}${n.difficultyChangePct.toFixed(1)}%`}
          sub={`${n.retargetBlocks} blocks · ${fmtIn(n.retargetAt)}`}
          tone={tone(n.difficultyChangePct)}
        />
        <Stat k="fees fast / 1h" v={`${n.fees.fastest} / ${n.fees.hour} sat/vB`} />
        <Stat
          k="mempool"
          v={`${n.mempoolVmb.toFixed(1)} vMB`}
          sub={`${n.mempoolTxs.toLocaleString("en-US")} txs · ~${Math.ceil(n.mempoolVmb)} blocks`}
        />
        <Stat k="halving" v={`${n.halvingBlocks.toLocaleString("en-US")} blocks`} sub={`${fmtIn(n.halvingAt)} · ${fmtDate(n.halvingAt)}`} />
      </div>
    </section>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div className="fd-stat">
      <span>{k}</span>
      <b className={tone}>{v}</b>
      {sub && <small className="fd-tr-muted">{sub}</small>}
    </div>
  );
}

function ItemList({ title, note, items }: { title: string; note: string; items: BtcItem[] }) {
  if (!items.length) return null;
  return (
    <section className="fd-section">
      <h3>
        {title} <small> · {note}</small>
      </h3>
      {items.map((it) => (
        <a key={it.url} className="fd-tr-paper" href={it.url} target="_blank" rel="noreferrer">
          <b>{it.title}</b>
          <small>
            {it.source}
            {it.at ? ` · ${fmtDate(it.at)}` : ""}
            {it.meta ? ` · ${it.meta}` : ""}
          </small>
          {it.summary && <span>{it.summary}</span>}
        </a>
      ))}
    </section>
  );
}

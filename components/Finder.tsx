"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FinderChart from "@/components/FinderChart";
import {
  CHAINS,
  CHAIN_IDS,
  DEFAULT_MAX_MCAP,
  DEFAULT_MIN_LIQ,
  type ChainId,
  type Check,
  type CheckGroup,
  type FinderToken,
  type ScanResult,
} from "@/lib/finder/types";
import type { TokenReport } from "@/lib/finder/scan";
import { fmtAgo, fmtPct, fmtPrice, fmtUsd, shortAddr } from "@/lib/finder/format";

const REFRESH_MS = 60_000;
const LIQ_PRESETS = [5_000, 10_000, 25_000, 50_000, 100_000];
const MCAP_PRESETS = [500_000, 1_000_000, 5_000_000, 20_000_000, 100_000_000];
const GROUPS: { id: CheckGroup; label: string }[] = [
  { id: "market", label: "Market" },
  { id: "activity", label: "Trading activity" },
  { id: "contract", label: "Contract" },
  { id: "holders", label: "Holders & liquidity" },
];
const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕", unknown: "?" } as const;

type Load<T> = { state: "idle" | "loading" | "ready" | "error"; data?: T; error?: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json as T;
}

function query(chain: ChainId, minLiq: number, maxMcap: number) {
  return `chain=${chain}&minLiq=${minLiq}&maxMcap=${maxMcap}`;
}

export default function Finder() {
  const [chain, setChain] = useState<ChainId>("solana");
  const [minLiq, setMinLiq] = useState(DEFAULT_MIN_LIQ);
  const [maxMcap, setMaxMcap] = useState(DEFAULT_MAX_MCAP);
  const [showFailed, setShowFailed] = useState(false);
  const [scan, setScan] = useState<Load<ScanResult>>({ state: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    setScan((s) => ({ ...s, state: "loading" }));
    try {
      const data = await getJson<ScanResult>(`/api/finder?${query(chain, minLiq, maxMcap)}`);
      setScan({ state: "ready", data });
    } catch (e) {
      setScan((s) => ({ ...s, state: "error", error: (e as Error).message }));
    }
  }, [chain, minLiq, maxMcap]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Re-render the "updated Xs ago" label.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  const tokens = scan.data?.tokens ?? [];
  const shown = useMemo(
    () => (showFailed ? tokens : tokens.filter((t) => t.verdict !== "fail")),
    [tokens, showFailed]
  );
  const failed = tokens.length - tokens.filter((t) => t.verdict !== "fail").length;
  const downSources = Object.entries(scan.data?.sources ?? {}).filter(([, s]) => s === "error");

  const submitLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const a = lookup.trim();
    if (!a) return;
    // Pick the chain from the address shape when it is unambiguous.
    if (/^0x/i.test(a) && chain === "solana") setChain("base");
    if (!/^0x/i.test(a)) setChain("solana");
    setSelected(a);
  };

  return (
    <div className="fd">
      <header className="fd-head">
        <div className="fd-title">
          <Link href="/" className="fd-home">zencharts</Link>
          <span className="fd-sep">/</span>
          <span>finder</span>
        </div>
        <nav className="fd-chains" aria-label="Chain">
          {CHAIN_IDS.map((c) => (
            <button
              key={c}
              className={`fd-chip${c === chain ? " is-on" : ""}`}
              onClick={() => {
                setChain(c);
                setSelected(null);
              }}
              aria-pressed={c === chain}
            >
              {CHAINS[c].label}
            </button>
          ))}
        </nav>
      </header>

      <div className="fd-controls">
        <label className="fd-field">
          <span>min liquidity</span>
          <select value={minLiq} onChange={(e) => setMinLiq(Number(e.target.value))}>
            {LIQ_PRESETS.map((v) => (
              <option key={v} value={v}>{fmtUsd(v)}</option>
            ))}
          </select>
        </label>
        <label className="fd-field">
          <span>max market cap</span>
          <select value={maxMcap} onChange={(e) => setMaxMcap(Number(e.target.value))}>
            {MCAP_PRESETS.map((v) => (
              <option key={v} value={v}>{fmtUsd(v)}</option>
            ))}
          </select>
        </label>
        <label className="fd-toggle">
          <input type="checkbox" checked={showFailed} onChange={(e) => setShowFailed(e.target.checked)} />
          <span>show failed ({failed})</span>
        </label>
        <form className="fd-lookup" onSubmit={submitLookup}>
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="check a token address…"
            spellCheck={false}
            autoCapitalize="off"
          />
        </form>
        <button className="fd-refresh" onClick={load} disabled={scan.state === "loading"}>
          {scan.state === "loading" ? "scanning…" : `↻ ${scan.data ? fmtAgo(scan.data.at) : ""}`}
        </button>
      </div>

      {downSources.length > 0 && (
        <div className="fd-note fd-note--warn">
          unavailable this scan: {downSources.map(([k]) => k).join(", ")} — affected checks show “?”
        </div>
      )}
      {scan.state === "error" && <div className="fd-note fd-note--err">scan failed: {scan.error}</div>}

      <div className="fd-table">
        <div className="fd-row fd-row--head">
          <span>token</span>
          <span>verdict</span>
          <span>score</span>
          <span className="fd-num">1h</span>
          <span className="fd-num">24h</span>
          <span className="fd-num fd-hide-sm">liq</span>
          <span className="fd-num">mcap</span>
          <span className="fd-num fd-hide-sm">vol 24h</span>
          <span className="fd-num fd-hide-sm">buyers 1h</span>
          <span className="fd-num fd-hide-sm">age</span>
        </div>
        {scan.state === "loading" && !scan.data && <div className="fd-empty">scanning new &amp; trending pools…</div>}
        {scan.data && shown.length === 0 && (
          <div className="fd-empty">nothing passes the gates right now — try another chain or loosen the filters</div>
        )}
        {shown.map((t) => (
          <Row key={t.address} t={t} onOpen={() => setSelected(t.address)} active={selected === t.address} />
        ))}
      </div>

      <footer className="fd-foot">
        Information only, identical for every viewer — not investment advice. Most new tokens go to
        zero; a “pass” only means no red flag was found in free on-chain data. Data: GeckoTerminal,
        DexScreener, RugCheck, GoPlus, Honeypot.is. Charts: TradingView Lightweight Charts™.
      </footer>

      {selected && (
        <Detail
          key={`${chain}:${selected}`}
          chain={chain}
          address={selected}
          minLiq={minLiq}
          maxMcap={maxMcap}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Row({ t, onOpen, active }: { t: FinderToken; onOpen: () => void; active: boolean }) {
  const m = t.market!;
  return (
    <button className={`fd-row${active ? " is-active" : ""}`} onClick={onOpen}>
      <span className="fd-token">
        {t.icon ? <img src={t.icon} alt="" className="fd-icon" loading="lazy" /> : <span className="fd-icon" />}
        <span className="fd-sym">{t.symbol}</span>
        <span className="fd-badges">
          {t.origins.includes("new") && <i className="fd-badge">new</i>}
          {t.origins.includes("trending") && <i className="fd-badge">trend</i>}
          {t.promoted && <i className="fd-badge fd-badge--paid" title="Paid DexScreener profile/boost">paid</i>}
          {m.bondingCurve && <i className="fd-badge">curve</i>}
        </span>
      </span>
      <span><Verdict v={t.verdict} unchecked={!t.securitySource} /></span>
      <span className="fd-score"><i style={{ width: `${t.score}%` }} /><b>{t.score}</b></span>
      <span className={`fd-num ${tone(m.priceChange.h1)}`}>{fmtPct(m.priceChange.h1)}</span>
      <span className={`fd-num ${tone(m.priceChange.h24)}`}>{fmtPct(m.priceChange.h24)}</span>
      <span className="fd-num fd-hide-sm">{m.bondingCurve && m.liquidityUsd === null ? "curve" : fmtUsd(m.liquidityUsd)}</span>
      <span className="fd-num">{fmtUsd(m.mcapUsd)}</span>
      <span className="fd-num fd-hide-sm">{fmtUsd(m.volume.h24)}</span>
      <span className="fd-num fd-hide-sm">{m.flow.h1.buyers ?? "—"}</span>
      <span className="fd-num fd-hide-sm">{fmtAgo(m.createdAt)}</span>
    </button>
  );
}

function tone(n: number) {
  return n > 0 ? "is-up" : n < 0 ? "is-down" : "";
}

function Verdict({ v, unchecked }: { v: FinderToken["verdict"]; unchecked?: boolean }) {
  const label = v === "caution" && unchecked ? "unchecked" : v;
  return <span className={`fd-verdict fd-verdict--${v}`}>{label}</span>;
}

function Detail({
  chain,
  address,
  minLiq,
  maxMcap,
  onClose,
}: {
  chain: ChainId;
  address: string;
  minLiq: number;
  maxMcap: number;
  onClose: () => void;
}) {
  const [rep, setRep] = useState<Load<TokenReport>>({ state: "loading" });

  useEffect(() => {
    let alive = true;
    getJson<TokenReport>(`/api/finder/token?${query(chain, minLiq, maxMcap)}&address=${encodeURIComponent(address)}`)
      .then((data) => alive && setRep({ state: "ready", data }))
      .catch((e) => alive && setRep({ state: "error", error: (e as Error).message }));
    return () => {
      alive = false;
    };
  }, [chain, address, minLiq, maxMcap]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const t = rep.data?.token;
  return (
    <aside className="fd-detail" role="dialog" aria-label="Token checks">
      <div className="fd-detail-head">
        <div>
          <div className="fd-detail-sym">
            {t?.symbol ?? shortAddr(address)}
            {t && <Verdict v={t.verdict} />}
          </div>
          <div className="fd-detail-name">{t?.name}</div>
        </div>
        <button className="fd-x" onClick={onClose} aria-label="Close">×</button>
      </div>

      <button
        className="fd-addr"
        onClick={() => navigator.clipboard?.writeText(address)}
        title="Copy address"
      >
        {address}
      </button>

      {rep.state === "loading" && <div className="fd-empty">running on-chain checks…</div>}
      {rep.state === "error" && <div className="fd-note fd-note--err">{rep.error}</div>}

      {t && t.market && (
        <>
          <div className="fd-stats">
            <Stat k="price" v={`$${fmtPrice(t.market.priceUsd ?? 0)}`} />
            <Stat k="mcap" v={fmtUsd(t.market.mcapUsd)} />
            <Stat k="liquidity" v={t.market.liquidityUsd === null ? "curve" : fmtUsd(t.market.liquidityUsd)} />
            <Stat k="vol 24h" v={fmtUsd(t.market.volume.h24)} />
            <Stat k="buys/sells 1h" v={`${t.market.flow.h1.buys}/${t.market.flow.h1.sells}`} />
            <Stat k="buyers/sellers 1h" v={`${t.market.flow.h1.buyers ?? "—"}/${t.market.flow.h1.sellers ?? "—"}`} />
          </div>

          <FinderChart candles={rep.data!.candles} />

          <div className="fd-links">
            <a href={t.market.url} target="_blank" rel="noreferrer">dexscreener</a>
            <a href={CHAINS[chain].explorer(address)} target="_blank" rel="noreferrer">explorer</a>
            {chain === "solana" ? (
              <a href={`https://rugcheck.xyz/tokens/${address}`} target="_blank" rel="noreferrer">rugcheck</a>
            ) : (
              <a href={`https://honeypot.is/?address=${address}`} target="_blank" rel="noreferrer">honeypot.is</a>
            )}
            {t.socials.links.slice(0, 3).map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.type}</a>
            ))}
          </div>

          <section className="fd-section">
            <h3>
              score {t.score}
              <small> = Σ weight × feature × risk {t.riskMultiplier.toFixed(2)}</small>
            </h3>
            {t.scoreParts.map((p) => (
              <div key={p.id} className="fd-part">
                <span>{p.label}</span>
                <span className="fd-bar"><i style={{ width: `${p.value * 100}%` }} /></span>
                <span className="fd-num">{Math.round(p.weight * 100)}%</span>
              </div>
            ))}
          </section>

          {GROUPS.map((g) => {
            const list = t.checks.filter((c) => c.group === g.id);
            if (!list.length) return null;
            return (
              <section key={g.id} className="fd-section">
                <h3>{g.label}</h3>
                {list.map((c) => (
                  <CheckRow key={c.id} c={c} />
                ))}
              </section>
            );
          })}
        </>
      )}
    </aside>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="fd-stat">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function CheckRow({ c }: { c: Check }) {
  return (
    <div className={`fd-check fd-check--${c.status}`} title={c.rule}>
      <span className="fd-check-icon">{STATUS_ICON[c.status]}</span>
      <span className="fd-check-label">
        <b>{c.id}</b> {c.label}
        <small>{c.rule}</small>
      </span>
      <span className="fd-check-value">{c.value}</span>
    </div>
  );
}

// Multi-source OHLC history for BTC/USD, assembled to span as much of
// Bitcoin's price history as practical.
//
//   - Binance (data-api.binance.vision): BTC/USDT, high quality, native support
//     for every timeframe, history back to 2017-08. Primary source.
//   - Bitstamp (bitstamp.net): true BTC/USD, history back to 2011-08. Used to
//     backfill the years before Binance's BTCUSDT market existed.
//
// Intraday timeframes are served by Binance alone (it already holds far more
// than we cap at). Daily/weekly additionally stitch Bitstamp behind Binance so
// the long-horizon charts reach back to 2011. Weekly is aggregated from the
// full merged daily series (Monday 00:00 UTC anchored), matching Binance's own
// weekly bucketing so the live-polled last bar lines up.

import type { Candle } from "./types";
import type { TimeframeKey } from "./timeframes";

const BINANCE = "https://data-api.binance.vision";
const BITSTAMP = "https://www.bitstamp.net";
const SYMBOL = "BTCUSDT";
const PAGE = 1000; // max rows per request on both providers
const FETCH_TIMEOUT_MS = 12_000;

// Upper bound on candles returned per timeframe. Keeps request counts and
// payload sizes sane while still covering full history where it matters:
// at these caps, daily/weekly reach 2011 and intraday spans weeks-to-years.
const MAX_CANDLES: Record<TimeframeKey, number> = {
  "15m": 6000, //  ~62 days
  "30m": 6000, // ~125 days
  "1h": 8000, // ~333 days
  "4h": 12000, //  ~5.5 years
  "1d": 8000, // full history (~2011 -> now is ~5.4k days)
  "1w": 2000, // full history (~2011 -> now is ~0.8k weeks)
};

// Bitstamp `step` (seconds) per timeframe. 1w has no native step; it is built
// from daily, so it is intentionally absent here.
const BITSTAMP_STEP: Partial<Record<TimeframeKey, number>> = {
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const DAY = 86400;

// ---- tiny in-memory cache so flipping between timeframes stays snappy -------
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Candle[] }>();

async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function dedupeSort(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) map.set(c.time, c);
  return [...map.values()].sort((a, b) => a.time - b.time);
}

// Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]
function toCandleBinance(row: any[]): Candle {
  return {
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  };
}

function toCandleBitstamp(o: any): Candle {
  return {
    time: Number(o.timestamp),
    open: Number(o.open),
    high: Number(o.high),
    low: Number(o.low),
    close: Number(o.close),
  };
}

// Paginate Binance backwards from now until we hit `max` or run out of history.
async function fetchBinancePaged(
  interval: TimeframeKey,
  max: number
): Promise<Candle[]> {
  const out: Candle[] = [];
  let endTime: number | undefined;
  while (out.length < max) {
    let url = `${BINANCE}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${PAGE}`;
    if (endTime) url += `&endTime=${endTime}`;
    const rows = (await fetchJson(url)) as any[][];
    if (!rows?.length) break;
    out.push(...rows.map(toCandleBinance));
    endTime = Number(rows[0][0]) - 1; // oldest openTime - 1ms
    if (rows.length < PAGE) break; // reached the start of history
  }
  return out;
}

// Paginate Bitstamp backwards from now until we hit `max` or run out of history.
async function fetchBitstampPaged(
  step: number,
  max: number
): Promise<Candle[]> {
  const out: Candle[] = [];
  let end: number | undefined;
  while (out.length < max) {
    let url = `${BITSTAMP}/api/v2/ohlc/btcusd/?step=${step}&limit=${PAGE}`;
    if (end) url += `&end=${end}`;
    const json = await fetchJson(url);
    const ohlc = json?.data?.ohlc as any[] | undefined;
    if (!ohlc?.length) break;
    const page = ohlc.map(toCandleBitstamp);
    out.push(...page);
    const oldest = Math.min(...page.map((c) => c.time));
    end = oldest - 1;
    if (ohlc.length < PAGE) break;
  }
  return out;
}

// Keep the most recent `max` candles after merging; Binance wins on overlap.
function stitch(primary: Candle[], backfill: Candle[], max: number): Candle[] {
  return dedupeSort([...backfill, ...primary]).slice(-max);
}

async function getDaily(max: number): Promise<Candle[]> {
  const binance = await fetchBinancePaged("1d", max);
  // Binance daily starts 2017; backfill the earlier years from Bitstamp.
  let candles = binance;
  if (binance.length < max) {
    try {
      const bitstamp = await fetchBitstampPaged(BITSTAMP_STEP["1d"]!, max);
      candles = stitch(binance, bitstamp, max);
    } catch {
      /* Bitstamp unavailable — Binance-only history is still useful */
    }
  }
  return dedupeSort(candles);
}

// Aggregate a daily series into weekly candles anchored on Monday 00:00 UTC.
function weekStartUTC(timeSec: number): number {
  const d = new Date(timeSec * 1000);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  const midnight =
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
  return midnight - sinceMonday * DAY;
}

function dailyToWeekly(daily: Candle[]): Candle[] {
  const weeks = new Map<number, Candle>();
  for (const d of daily) {
    const ws = weekStartUTC(d.time);
    const w = weeks.get(ws);
    if (!w) {
      weeks.set(ws, { time: ws, open: d.open, high: d.high, low: d.low, close: d.close });
    } else {
      w.high = Math.max(w.high, d.high);
      w.low = Math.min(w.low, d.low);
      w.close = d.close; // daily is ascending, so last wins
    }
  }
  return [...weeks.values()].sort((a, b) => a.time - b.time);
}

async function buildHistory(interval: TimeframeKey): Promise<Candle[]> {
  const max = MAX_CANDLES[interval];

  if (interval === "1w") {
    const daily = await getDaily(MAX_CANDLES["1d"]);
    return dailyToWeekly(daily).slice(-max);
  }
  if (interval === "1d") {
    return getDaily(max);
  }

  // Intraday: Binance already holds more than the cap, so one source suffices.
  const binance = await fetchBinancePaged(interval, max);
  let candles = binance;
  const step = BITSTAMP_STEP[interval];
  if (binance.length < max && step) {
    try {
      const bitstamp = await fetchBitstampPaged(step, max);
      candles = stitch(binance, bitstamp, max);
    } catch {
      /* ignore backfill failure */
    }
  }
  return dedupeSort(candles);
}

// Full history for a timeframe, cached briefly in memory.
export async function getHistory(interval: TimeframeKey): Promise<Candle[]> {
  const hit = cache.get(interval);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await buildHistory(interval);
  cache.set(interval, { at: Date.now(), data });
  return data;
}

// Lightweight recent-candles fetch used by the client's live poll. Binance
// supports every timeframe natively (including 1w), so one quick call does it.
export async function getRecent(
  interval: TimeframeKey,
  limit: number
): Promise<Candle[]> {
  const url = `${BINANCE}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const rows = (await fetchJson(url)) as any[][];
  return rows.map(toCandleBinance);
}

// Browser-side fetchers for our own API routes, shared by the chart and the
// console commands (the server caches, so repeat calls are cheap).

import type { Candle } from "./types";
import type { TimeframeKey } from "./timeframes";
import type { Point } from "./indicators/align";
import type { SeriesId } from "./series";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

// No `limit` -> full multi-source history; a `limit` -> fast recent fetch.
export async function fetchCandles(
  symbol: string,
  interval: TimeframeKey,
  limit?: number,
  signal?: AbortSignal
): Promise<Candle[]> {
  const qs = limit === undefined ? "" : `&limit=${limit}`;
  const data = await getJson<{ candles: Candle[] }>(
    `/api/candles?symbol=${symbol}&interval=${interval}${qs}`,
    signal
  );
  return data.candles;
}

export async function fetchSeries(
  id: SeriesId,
  symbol: string,
  signal?: AbortSignal
): Promise<Point[]> {
  const data = await getJson<{ points: Point[] }>(
    `/api/series?id=${id}&symbol=${symbol}`,
    signal
  );
  return data.points;
}

// Daily history with the still-open bar dropped, for tests and backtests.
export async function fetchClosedDaily(
  symbol: string
): Promise<{ times: number[]; closes: number[] }> {
  const candles = await fetchCandles(symbol, "1d");
  const now = Date.now() / 1000;
  const closed = candles.filter((c) => c.time + 86400 <= now);
  return {
    times: closed.map((c) => c.time),
    closes: closed.map((c) => c.close),
  };
}

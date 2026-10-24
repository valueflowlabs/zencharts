// Time helpers shared by the server data layer and the client indicators.
// All times are UNIX seconds, UTC.

import type { TimeframeKey } from "./timeframes";

export const DAY = 86400;
export const YEAR = 365 * DAY; // crypto trades every day

export const BAR_SECONDS: Record<TimeframeKey, number> = {
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": DAY,
  "1w": 7 * DAY,
};

// Start of the ISO week (Monday 00:00 UTC) containing `timeSec`. Matches
// Binance's weekly bucketing.
export function weekStartUTC(timeSec: number): number {
  const d = new Date(timeSec * 1000);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  const midnight =
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
  return midnight - sinceMonday * DAY;
}

// Open time of the bar that contains `timeSec` on the given timeframe.
export function barStart(timeSec: number, interval: TimeframeKey): number {
  if (interval === "1w") return weekStartUTC(timeSec);
  const s = BAR_SECONDS[interval];
  return Math.floor(timeSec / s) * s;
}

export function utcYearStart(year: number): number {
  return Date.UTC(year, 0, 1) / 1000;
}

export function isoDate(timeSec: number): string {
  return new Date(timeSec * 1000).toISOString().slice(0, 10);
}

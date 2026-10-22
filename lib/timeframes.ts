// Single source of truth for the timeframes the app exposes.
// m15 is intentionally the lowest granularity (per product spec).
// Keys map directly to Binance kline `interval` values.

export const TIMEFRAMES = [
  { key: "15m", label: "15m" },
  { key: "30m", label: "30m" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
  { key: "1w", label: "1W" },
] as const;

export type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

export const DEFAULT_TIMEFRAME: TimeframeKey = "1h";

const VALID = new Set<string>(TIMEFRAMES.map((t) => t.key));

export function isValidTimeframe(value: string): value is TimeframeKey {
  return VALID.has(value);
}

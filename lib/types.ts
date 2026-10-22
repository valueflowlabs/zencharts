// Shape returned by our /api/candles route and consumed by the chart.
// `time` is a UNIX timestamp in SECONDS (what lightweight-charts expects).

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

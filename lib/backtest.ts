// Long/flat trend-filter backtest on daily closes, always reported next to
// buy-and-hold over the same window. The research case for trend filters is
// smaller drawdowns, not higher returns, so judge on max drawdown and Sharpe.
//
// No look-ahead: the signal computed at close t only sets the position held
// from t to t+1. Fees are charged on every position change.

import { DAY, YEAR, utcYearStart } from "./time";

export type Strategy =
  | { kind: "ma"; length: number } // long while close > SMA(length)
  | { kind: "tsmom"; lookback: number }; // long while the lookback return > 0

export const DEFAULT_MA_LENGTH = 200;
export const DEFAULT_TSMOM_LOOKBACK = 365; // 12 months of daily bars
export const DEFAULT_FEE_BP = 10; // per side

export function strategyLabel(s: Strategy): string {
  return s.kind === "ma" ? `ma${s.length}` : `tsmom${s.lookback}`;
}

// sig[t] ∈ {0, 1} uses closes[0..t] only; null while there's not enough history.
export function signals(closes: number[], s: Strategy): (0 | 1 | null)[] {
  const out: (0 | 1 | null)[] = [];
  if (s.kind === "ma") {
    let sum = 0;
    for (let t = 0; t < closes.length; t++) {
      sum += closes[t];
      if (t >= s.length) sum -= closes[t - s.length];
      out.push(t >= s.length - 1 ? (closes[t] > sum / s.length ? 1 : 0) : null);
    }
  } else {
    for (let t = 0; t < closes.length; t++) {
      out.push(
        t >= s.lookback ? (closes[t] > closes[t - s.lookback] ? 1 : 0) : null
      );
    }
  }
  return out;
}

export interface Metrics {
  cagr: number;
  maxDrawdown: number; // negative, e.g. -0.55
  sharpe: number;
  exposure: number; // share of days in the market
  trades: number; // position changes, including the first entry
  days: number;
}

// Simulate from index `from` to `to` (inclusive). At close `from` the strategy
// takes its first position (paying the fee), then earns each day's return with
// the previous close's decision.
export function simulate(
  closes: number[],
  sig: (0 | 1 | null)[],
  from: number,
  to: number,
  feeBp: number
): Metrics {
  const fee = feeBp / 10_000;
  let eq = 1;
  let peak = 1;
  let maxDd = 0;
  let pos: 0 | 1 = 0;
  let trades = 0;
  let inMarket = 0;
  const daily: number[] = [];

  const decide = (t: number) => {
    const next = sig[t] ?? 0;
    if (next !== pos) {
      eq *= 1 - fee;
      trades++;
      pos = next;
    }
  };

  decide(from);
  for (let t = from + 1; t <= to; t++) {
    const before = eq;
    eq *= 1 + pos * (closes[t] / closes[t - 1] - 1);
    if (pos) inMarket++;
    if (t < to) decide(t); // no point trading at the final close
    daily.push(eq / before - 1);
    peak = Math.max(peak, eq);
    maxDd = Math.min(maxDd, eq / peak - 1);
  }

  const days = to - from;
  const m = daily.reduce((s, x) => s + x, 0) / Math.max(daily.length, 1);
  const sd = Math.sqrt(
    daily.reduce((s, x) => s + (x - m) * (x - m), 0) /
      Math.max(daily.length - 1, 1)
  );
  return {
    cagr: Math.pow(eq, YEAR / DAY / Math.max(days, 1)) - 1,
    maxDrawdown: maxDd,
    sharpe: sd ? (m / sd) * Math.sqrt(YEAR / DAY) : NaN,
    exposure: days ? inMarket / days : 0,
    trades,
    days,
  };
}

export interface BacktestRow {
  label: string;
  from: number; // UNIX seconds
  strategy: Metrics;
  buyHold: Metrics;
}

// Run over the full history and the standard sub-periods. `times`/`closes`
// must be closed daily bars (drop the live one first).
export function backtest(
  times: number[],
  closes: number[],
  s: Strategy,
  feeBp = DEFAULT_FEE_BP
): BacktestRow[] {
  const sig = signals(closes, s);
  const hold = closes.map(() => 1 as const);
  const firstSignal = sig.findIndex((x) => x !== null);
  if (firstSignal < 0) return [];
  const last = closes.length - 1;
  const windows = [
    { label: "all", from: times[firstSignal] },
    { label: "2014+", from: utcYearStart(2014) },
    { label: "2017+", from: utcYearStart(2017) },
    { label: "2024+", from: utcYearStart(2024) },
  ];
  const rows: BacktestRow[] = [];
  for (const w of windows) {
    const i = times.findIndex((t) => t >= w.from);
    if (i < firstSignal || i < 0 || last - i < 30) continue;
    rows.push({
      label: w.label,
      from: times[i],
      strategy: simulate(closes, sig, i, last, feeBp),
      buyHold: simulate(closes, hold, i, last, feeBp),
    });
  }
  return rows;
}

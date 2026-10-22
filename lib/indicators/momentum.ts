// Time-series momentum: the % change in close over the last `lookback` bars.
// The best-supported BTC return predictor in the literature (Liu & Tsyvinski,
// RFS 2021; Cheah et al., 2022) — recent rises tend to continue. See README.

import type { Candle } from "../types";

export const DEFAULT_MOMENTUM_LOOKBACK = 20;
export const MIN_MOMENTUM_LOOKBACK = 2;
export const MAX_MOMENTUM_LOOKBACK = 500;

export function isValidLookback(n: number): boolean {
  return (
    Number.isInteger(n) &&
    n >= MIN_MOMENTUM_LOOKBACK &&
    n <= MAX_MOMENTUM_LOOKBACK
  );
}

export interface MomentumPoint {
  time: number;
  value: number; // percent, e.g. 12.5 = +12.5%
}

// Momentum for the bar at `i`, or null while there isn't enough history yet.
export function momentumAt(
  candles: Candle[],
  i: number,
  lookback: number
): MomentumPoint | null {
  if (i < lookback) return null;
  const past = candles[i - lookback].close;
  if (!past) return null;
  return {
    time: candles[i].time,
    value: (candles[i].close / past - 1) * 100,
  };
}

export function momentumSeries(
  candles: Candle[],
  lookback: number
): MomentumPoint[] {
  const out: MomentumPoint[] = [];
  for (let i = lookback; i < candles.length; i++) {
    const p = momentumAt(candles, i, lookback);
    if (p) out.push(p);
  }
  return out;
}

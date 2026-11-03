// Miner economics around the halving cycle, from the mining series in
// lib/series.ts (mempool.space daily history).
//
//   - Revenue multiple: daily miner revenue ÷ its trailing 365-day mean (the
//     Puell multiple, computed on subsidy + fees rather than subsidy alone).
//     Miners sell to cover costs, so a very low multiple means forced selling
//     is exhausted; a very high one means a revenue windfall they can sell.
//   - Hash-ribbon capitulation: the 30-day mean hashrate below the 60-day
//     mean, i.e. miners switching machines off because they lose money. The
//     period ends when the 30-day mean crosses back above.
//   - Halving effect: hashprice (USD per PH/s per day) and hashrate in the
//     30 days before vs after each halving.
//
// Heuristics with a handful of episodes behind them; `cycles miners` reports
// how they lined up with the cycle lows rather than asserting that they do.

import type { Point } from "./align";
import { DAY } from "../time";

export const PUELL_WINDOW_DAYS = 365;
const RIBBON_FAST = 30;
const RIBBON_SLOW = 60;
const MIN_CAPITULATION_DAYS = 7; // ignore one-week wobbles of the crossover

function trailingMean(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

export function revenueMultiple(revenue: Point[]): Point[] {
  const avg = trailingMean(revenue.map((p) => p.value), PUELL_WINDOW_DAYS);
  return revenue.flatMap((p, i) => (avg[i] ? [{ time: p.time, value: p.value / avg[i]! }] : []));
}

export interface Capitulation {
  start: number;
  end: number | null; // null = still going
  days: number;
  hashDrop: number; // worst 30-day-mean hashrate vs its level at the start, e.g. -0.12
}

export function capitulations(hashrate: Point[]): Capitulation[] {
  const v = hashrate.map((p) => p.value);
  const fast = trailingMean(v, RIBBON_FAST);
  const slow = trailingMean(v, RIBBON_SLOW);
  const out: Capitulation[] = [];
  let open: { i: number; worst: number } | null = null;
  const close = (endIdx: number | null) => {
    if (!open) return;
    const endTime = endIdx === null ? null : hashrate[endIdx].time;
    const last = endIdx ?? hashrate.length - 1;
    const days = Math.round((hashrate[last].time - hashrate[open.i].time) / DAY);
    if (days >= MIN_CAPITULATION_DAYS) {
      out.push({
        start: hashrate[open.i].time,
        end: endTime,
        days,
        hashDrop: open.worst / fast[open.i]! - 1,
      });
    }
    open = null;
  };
  for (let i = 0; i < v.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f === null || s === null) continue;
    if (f < s) {
      if (!open) open = { i, worst: f };
      else open.worst = Math.min(open.worst, f);
    } else close(i);
  }
  close(null);
  return out;
}

// Mean of the points in [from, to).
export function meanBetween(points: Point[], from: number, to: number): number | null {
  let s = 0;
  let n = 0;
  for (const p of points) {
    if (p.time >= from && p.time < to) {
      s += p.value;
      n++;
    }
  }
  return n ? s / n : null;
}

// The value in force at `t`: the last point at or before it.
export function pointAt(points: Point[], t: number): number | null {
  let lo = 0;
  let hi = points.length - 1;
  if (hi < 0 || t < points[0].time) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  return points[lo].value;
}

export interface HalvingEffect {
  hashpriceBefore: number | null; // 30-day mean, USD per PH/s per day
  hashpriceAfter: number | null;
  hashrateChange: number | null; // 30 days after vs 30 days before
  feeShareAfter: number | null; // % of revenue, 30 days after
}

export function halvingEffect(
  halvingTime: number,
  series: { hashprice: Point[]; hashrate: Point[]; feeshare: Point[] }
): HalvingEffect {
  const before = [halvingTime - 30 * DAY, halvingTime] as const;
  const after = [halvingTime + DAY, halvingTime + 31 * DAY] as const;
  const hrBefore = meanBetween(series.hashrate, ...before);
  const hrAfter = meanBetween(series.hashrate, ...after);
  return {
    hashpriceBefore: meanBetween(series.hashprice, ...before),
    hashpriceAfter: meanBetween(series.hashprice, ...after),
    hashrateChange: hrBefore && hrAfter ? hrAfter / hrBefore - 1 : null,
    feeShareAfter: meanBetween(series.feeshare, ...after),
  };
}

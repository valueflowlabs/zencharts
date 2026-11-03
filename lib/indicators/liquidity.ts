// Liquidity vs Bitcoin: the competing explanation for the four-year rhythm
// (some research ties it to global liquidity cycles rather than halvings).
// This tests the US part of that claim on our own data, honestly:
//
//   - Overlapping 12-month changes correlate easily — two trending series
//     share most of each window — so that number is shown, but flagged.
//   - Non-overlapping monthly changes are the fairer test; noise for n
//     months is roughly ±2/√n, printed alongside.
//   - Liquidity values are stamped when they were published, and BTC is
//     compared with liquidity known `lag` months earlier: no look-ahead.

import type { Point } from "./align";
import { pointAt } from "./miners";

// Month-end values of a point series: the last value known at the end of
// each calendar month, keyed by that month's start (UTC seconds).
export function monthly(points: Point[]): Point[] {
  const out: Point[] = [];
  if (!points.length) return out;
  const first = new Date(points[0].time * 1000);
  let y = first.getUTCFullYear();
  let m = first.getUTCMonth();
  const end = points[points.length - 1].time;
  for (;;) {
    const start = Date.UTC(y, m, 1) / 1000;
    const next = Date.UTC(y, m + 1, 1) / 1000;
    if (start > end) break;
    const v = pointAt(points, next - 1);
    if (v !== null) out.push({ time: start, value: v });
    m++;
    if (m === 12) {
      m = 0;
      y++;
    }
  }
  return out;
}

// Log change over `step` months, keyed by the later month.
export function logChange(months: Point[], step: number): Map<number, number> {
  const out = new Map<number, number>();
  for (let i = step; i < months.length; i++) {
    if (months[i].value > 0 && months[i - step].value > 0) {
      out.set(months[i].time, Math.log(months[i].value / months[i - step].value));
    }
  }
  return out;
}

export function correlation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

const monthShift = (t: number, k: number) => {
  const d = new Date(t * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - k, 1) / 1000;
};

// Correlation of BTC's change at month m with liquidity's change at m − lag.
export function lagCorrelation(
  btc: Map<number, number>,
  liq: Map<number, number>,
  lag: number,
  since: number
): { r: number; n: number } {
  const x: number[] = [];
  const y: number[] = [];
  for (const [t, b] of btc) {
    if (t < since) continue;
    const l = liq.get(monthShift(t, lag));
    if (l !== undefined) {
      x.push(l);
      y.push(b);
    }
  }
  return { r: correlation(x, y), n: x.length };
}

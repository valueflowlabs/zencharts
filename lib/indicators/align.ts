// Snap an external series (funding every 8h, DVOL daily, …) onto the chart's
// bar grid. lightweight-charts' time scale is the union of every series'
// timestamps, so an off-grid point would insert an empty slot between candles.
// Each output point sits on an existing candle time; bars with no new reading
// carry the previous value forward.

import type { TimeframeKey } from "../timeframes";
import { barStart } from "../time";

export interface Point {
  time: number; // UNIX seconds — when the value became known
  value: number;
}

export function snapToBars(
  points: Point[],
  barTimes: number[],
  interval: TimeframeKey,
  how: "mean" | "last"
): Point[] {
  const buckets = new Map<number, { sum: number; n: number; last: number }>();
  for (const p of points) {
    const t = barStart(p.time, interval);
    const b = buckets.get(t);
    if (b) {
      b.sum += p.value;
      b.n++;
      b.last = p.value;
    } else {
      buckets.set(t, { sum: p.value, n: 1, last: p.value });
    }
  }
  const lastKnown = points.length ? points[points.length - 1].time : -Infinity;
  const out: Point[] = [];
  let carry: number | undefined;
  for (const t of barTimes) {
    const b = buckets.get(t);
    if (b) carry = how === "mean" ? b.sum / b.n : b.last;
    else if (t > lastKnown + 7 * 86400) carry = undefined; // source went quiet
    if (carry !== undefined) out.push({ time: t, value: carry });
  }
  return out;
}

// Latest value known at or before `timeSec` (points sorted by time).
export function valueAt(points: Point[], timeSec: number): number | undefined {
  let lo = 0;
  let hi = points.length - 1;
  let found: number | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].time <= timeSec) {
      found = points[mid].value;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

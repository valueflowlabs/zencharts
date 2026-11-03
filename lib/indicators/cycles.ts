// Bitcoin halving cycles: the block subsidy halves every 210,000 blocks
// (~4 years), and each cycle so far has run halving → top → deep low →
// recovery into the next halving. This module finds those turning points in
// the price data itself (no hand-picked tops), so the markers and the
// terminal's table come from the same closes the chart shows.
//
// Caveats it keeps visible: four completed-ish cycles is a tiny sample; the
// current cycle's top is only the high *so far*, and a low is only final once
// the next halving arrives. A pattern, not a law.

import { dieboldMariano } from "./stats";
import { DAY, isoDate } from "../time";

export const HALVING_INTERVAL = 210_000; // blocks
const TARGET_BLOCK_SECONDS = 600;

// Halving block timestamps (UTC). The genesis block opens cycle 0, which has
// no usable USD price history, so it is not listed.
export const HALVINGS = [
  { n: 1, height: 210_000, time: Date.UTC(2012, 10, 28) / 1000 },
  { n: 2, height: 420_000, time: Date.UTC(2016, 6, 9) / 1000 },
  { n: 3, height: 630_000, time: Date.UTC(2020, 4, 11) / 1000 },
  { n: 4, height: 840_000, time: Date.UTC(2024, 3, 20) / 1000 },
] as const;

// Next halving at the protocol's 10-minute target. Real blocks have run a
// little faster, so the actual date tends to land some weeks earlier.
export function nextHalvingEstimate(): { n: number; height: number; time: number } {
  const last = HALVINGS[HALVINGS.length - 1];
  return {
    n: last.n + 1,
    height: last.height + HALVING_INTERVAL,
    time: last.time + HALVING_INTERVAL * TARGET_BLOCK_SECONDS,
  };
}

export interface CyclePoint {
  time: number; // bar open time (seconds)
  price: number; // close
}

export interface Cycle {
  n: number; // halving number that opens the cycle
  halving: CyclePoint; // the bar that contains the halving
  top: CyclePoint; // peak before the cycle's deepest drawdown; live cycle: high so far
  low: CyclePoint | null; // bottom of that drawdown; null for the live cycle
  end: number; // next halving time (estimated for the live cycle)
  complete: boolean; // the next halving has happened
}

// Phase of a bar, for shading. "rise": halving → top; "fall": top → low;
// "base": low → next halving. The live cycle shades only "rise" up to the
// high so far: its top and low are not known yet.
export type Phase = "rise" | "fall" | "base";

export function computeCycles(times: number[], closes: number[]): Cycle[] {
  const out: Cycle[] = [];
  const next = nextHalvingEstimate();
  // Bar length from the data, so daily and weekly bars both work.
  const step = times.length > 1 ? times[1] - times[0] : DAY;
  HALVINGS.forEach((h, i) => {
    const end = i + 1 < HALVINGS.length ? HALVINGS[i + 1].time : next.time;
    // The cycle opens at the bar that contains the halving.
    const start = times.findIndex((t) => t + step > h.time);
    if (start < 0) return;
    let stop = times.findIndex((t) => t >= end);
    if (stop < 0) stop = times.length;
    if (stop - start < 2) return;
    const complete = i + 1 < HALVINGS.length;
    // A completed cycle's top and low bracket its deepest drawdown: the top
    // is the peak before the crash. The highest close is not enough — cycle
    // 3's highest close is the March 2024 run-up into the next halving, above
    // the November 2021 top. The live cycle has no crash to bracket yet, so
    // its top is the high so far and it has no low.
    let top = start;
    let low = -1;
    if (complete) {
      let peak = start;
      let worst = 1;
      for (let j = start + 1; j < stop; j++) {
        if (closes[j] > closes[peak]) peak = j;
        const dd = closes[j] / closes[peak];
        if (dd < worst) {
          worst = dd;
          top = peak;
          low = j;
        }
      }
    } else {
      for (let j = start; j < stop; j++) if (closes[j] > closes[top]) top = j;
    }
    out.push({
      n: h.n,
      halving: { time: times[start], price: closes[start] },
      top: { time: times[top], price: closes[top] },
      low: low >= 0 ? { time: times[low], price: closes[low] } : null,
      end,
      complete,
    });
  });
  return out;
}

export function phaseAt(c: Cycle, time: number): Phase | null {
  if (time < c.halving.time || time >= c.end) return null;
  if (time <= c.top.time) return "rise";
  if (!c.complete) return null; // after the live cycle's high so far: unknown
  if (c.low && time <= c.low.time) return "fall";
  return "base";
}

export const daysBetween = (a: number, b: number) => Math.round((b - a) / DAY);

// Where today sits in the live cycle, against earlier cycles at the same day.
export interface CycleNow {
  cycle: Cycle;
  day: number; // days since the halving
  sinceHalving: number; // return since the halving close, e.g. 0.42 = +42%
  fromTop: number; // drawdown from the high so far, e.g. -0.2
  peers: { n: number; sinceHalving: number }[]; // earlier cycles at the same day
}

export function cycleNow(times: number[], closes: number[], cycles: Cycle[]): CycleNow | null {
  const live = cycles[cycles.length - 1];
  if (!live || live.complete || !times.length) return null;
  const t = times[times.length - 1];
  const price = closes[closes.length - 1];
  const day = daysBetween(live.halving.time, t);
  const peers = cycles
    .filter((c) => c.complete)
    .flatMap((c) => {
      const at = times.findIndex((x) => x >= c.halving.time + day * DAY);
      return at >= 0 && times[at] < c.end
        ? [{ n: c.n, sinceHalving: closes[at] / c.halving.price - 1 }]
        : [];
    });
  return {
    cycle: live,
    day,
    sinceHalving: price / live.halving.price - 1,
    fromTop: price / live.top.price - 1,
    peers,
  };
}

// ---- supply: how big each halving's shock is ------------------------------------

const BLOCKS_PER_YEAR = 52_560; // 365 days of 10-minute blocks

// Coins in existence at a block height (subsidy era by era).
export function supplyAt(height: number): number {
  let supply = 0;
  for (let era = 0; era * HALVING_INTERVAL < height; era++) {
    const blocks = Math.min(HALVING_INTERVAL, height - era * HALVING_INTERVAL);
    supply += blocks * (50 / 2 ** era);
  }
  return supply;
}

// Annual new issuance as a share of supply, just before and just after each
// halving. The cut shrinks every cycle — the strongest argument that the
// halving itself matters less each time.
export function issuanceShock(height: number): { before: number; after: number } {
  const era = height / HALVING_INTERVAL; // the era that starts at this height
  const supply = supplyAt(height);
  return {
    before: (BLOCKS_PER_YEAR * (50 / 2 ** (era - 1))) / supply,
    after: (BLOCKS_PER_YEAR * (50 / 2 ** era)) / supply,
  };
}

// ---- alignment: earlier cycles laid over the live one ---------------------------

export type Align = "halving" | "low";
export const ALIGNS: Align[] = ["halving", "low"];

// Anchor times per cycle segment. Halvings are known in advance; a low is only
// known to be *the* low once the next halving arrives, so `confirmedAt` says
// when an anchor could first have been used without hindsight.
export function anchorsOf(
  cycles: Cycle[],
  align: Align,
  shiftDays = 0
): { n: number; time: number; confirmedAt: number }[] {
  const shift = shiftDays * DAY;
  if (align === "halving") {
    return cycles.map((c) => ({ n: c.n, time: c.halving.time + shift, confirmedAt: c.halving.time + shift }));
  }
  return cycles
    .filter((c) => c.complete && c.low)
    .map((c) => ({ n: c.n, time: c.low!.time + shift, confirmedAt: c.end }));
}

// Last close at or before `t` (binary search on ascending times).
export function closeAt(times: number[], closes: number[], t: number): number | null {
  let lo = 0;
  let hi = times.length - 1;
  if (hi < 0 || t < times[0]) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return closes[lo];
}

export interface Ghost {
  n: number; // source cycle
  points: { time: number; value: number }[];
}

// Each earlier segment's path, scaled so it starts at the live anchor's price
// and shifted to start at the live anchor, sampled on `grid` (bar times,
// including future ones). The live segment is the last anchor.
export function buildGhosts(
  times: number[],
  closes: number[],
  cycles: Cycle[],
  align: Align,
  grid: number[]
): { anchor: number; ghosts: Ghost[] } | null {
  const anchors = anchorsOf(cycles, align);
  if (anchors.length < 2) return null;
  const live = anchors[anchors.length - 1];
  const livePrice = closeAt(times, closes, live.time);
  const lastTime = times[times.length - 1];
  if (!livePrice) return null;
  const ghosts: Ghost[] = [];
  for (const a of anchors.slice(0, -1)) {
    const base = closeAt(times, closes, a.time);
    if (!base) continue;
    const points: Ghost["points"] = [];
    for (const t of grid) {
      if (t < live.time) continue;
      const src = a.time + (t - live.time);
      if (src > lastTime) break;
      const p = closeAt(times, closes, src);
      if (p) points.push({ time: t, value: (p / base) * livePrice });
    }
    if (points.length) ghosts.push({ n: a.n, points });
  }
  return { anchor: live.time, ghosts };
}

// ---- self-test: is the cycle analogue a better forecast than "no change"? --------

export interface CycleScore {
  label: string;
  origins: number;
  from: string;
  to: string;
  rmseModel: number; // log10
  rmseRandomWalk: number;
  winRate: number;
  dm: { stat: number; p: number }; // negative favours the cycle analogue
}

// Walk-forward. Every `stepDays`, at day d of the current segment, forecast
// the log return over the next `horizonDays` as the mean of what the earlier
// segments did from their day d — using only anchors confirmed by then and
// prices already printed. Compare with the random walk (zero return).
export function scoreCycles(
  times: number[],
  closes: number[],
  cycles: Cycle[],
  align: Align,
  shiftDays: number,
  label: string,
  horizonDays = 365,
  stepDays = 30
): CycleScore | null {
  const anchors = anchorsOf(cycles, align, shiftDays);
  if (anchors.length < 2) return null;
  const h = horizonDays * DAY;
  const lastTime = times[times.length - 1];
  const errModel: number[] = [];
  const errRw: number[] = [];
  let first = 0;
  let last = 0;
  for (let t = anchors[1].time; t + h <= lastTime; t += stepDays * DAY) {
    // The segment the origin sits in, and the earlier ones usable as analogues.
    const usable = anchors.filter((a) => a.confirmedAt <= t && a.time <= t);
    if (usable.length < 2) continue;
    const seg = usable[usable.length - 1];
    const d = t - seg.time;
    const rets: number[] = [];
    for (const a of usable.slice(0, -1)) {
      const p0 = closeAt(times, closes, a.time + d);
      const p1 = closeAt(times, closes, a.time + d + h);
      if (p0 && p1 && a.time + d + h <= t) rets.push(Math.log10(p1 / p0));
    }
    const now = closeAt(times, closes, t);
    const later = closeAt(times, closes, t + h);
    if (!rets.length || !now || !later) continue;
    const actual = Math.log10(later / now);
    errModel.push(rets.reduce((s, x) => s + x, 0) / rets.length - actual);
    errRw.push(-actual);
    if (!first) first = t;
    last = t;
  }
  if (errModel.length < 12) return null;
  const sq = (e: number[]) => e.map((x) => x * x);
  const m = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const sqRw = sq(errRw);
  const d = sq(errModel).map((x, i) => x - sqRw[i]);
  return {
    label,
    origins: errModel.length,
    from: isoDate(first),
    to: isoDate(last),
    rmseModel: Math.sqrt(m(sq(errModel))),
    rmseRandomWalk: Math.sqrt(m(sqRw)),
    winRate: m(errModel.map((e, i) => (Math.abs(e) < Math.abs(errRw[i]) ? 1 : 0))),
    dm: dieboldMariano(d, Math.ceil(horizonDays / stepDays)),
  };
}

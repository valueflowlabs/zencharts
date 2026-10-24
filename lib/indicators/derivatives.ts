// Fragility gauges from the derivatives market, and the in-app tests that
// decide whether they deserve screen space.
//
//   - Funding: perpetual-futures funding rate. High funding means crowded
//     leveraged longs; the evidence (BIS WP 1087) says high carry predicts the
//     size and likelihood of crashes, not lower average returns.
//   - DVOL: Deribit's 30-day implied-vol index. Shown with trailing realised
//     vol; implied usually sits above realised (the variance risk premium).

import type { Point } from "./align";
import { logReturns, mean, ols } from "./stats";
import { DAY, YEAR, barStart, utcYearStart } from "../time";

// Raw funding events carry the rate per funding period (8h on Binance BTC,
// shorter on some contracts). Annualise each one by its own interval, in %.
export function annualiseFunding(events: Point[]): Point[] {
  return events.map((e, i) => {
    const gap = i ? e.time - events[i - 1].time : 8 * 3600;
    const period = Math.min(Math.max(gap, 3600), 8 * 3600);
    return { time: e.time, value: e.value * (YEAR / period) * 100 };
  });
}

// Trailing realised vol, annualised %, over ~`days` of bars.
export function realisedVolSeries(
  times: number[],
  closes: number[],
  barSeconds: number,
  days = 30
): Point[] {
  const w = Math.max(10, Math.round((days * DAY) / barSeconds));
  const r = logReturns(closes);
  const out: Point[] = [];
  let sumSq = 0;
  for (let i = 0; i < r.length; i++) {
    sumSq += r[i] * r[i];
    if (i >= w) sumSq -= r[i - w] * r[i - w];
    if (i >= w - 1) {
      out.push({
        time: times[i + 1],
        value: Math.sqrt((Math.max(sumSq, 0) / w) * (YEAR / barSeconds)) * 100,
      });
    }
  }
  return out;
}

// ---- funding test: does high funding come before bigger drawdowns? ----------

export interface FundingGroup {
  n: number;
  meanDrawdown: number; // mean worst close over the next 30 days vs today
  meanReturn: number; // mean 30-day forward return
}

export interface FundingScoreRow {
  label: string;
  top: FundingGroup; // days in the top decile of funding so far
  rest: FundingGroup;
}

export const FUNDING_FORWARD_DAYS = 30;
const MIN_HISTORY_DAYS = 180;

// Daily test: each day's mean annualised funding is compared against the 90th
// percentile of all earlier days (expanding, so no look-ahead), then the next
// 30 days' drawdown and return are grouped by whether it was in the top decile.
export function scoreFunding(
  times: number[],
  closes: number[],
  fundingAnnual: Point[]
): FundingScoreRow[] {
  const byDay = new Map<number, { sum: number; n: number }>();
  for (const p of fundingAnnual) {
    const d = barStart(p.time, "1d");
    const b = byDay.get(d) ?? { sum: 0, n: 0 };
    b.sum += p.value;
    b.n++;
    byDay.set(d, b);
  }

  const halves = [
    { label: "before 2024", from: -Infinity, to: utcYearStart(2024) },
    { label: "2024+", from: utcYearStart(2024), to: Infinity },
  ];
  const acc = halves.map(() => ({
    top: { n: 0, dd: 0, ret: 0 },
    rest: { n: 0, dd: 0, ret: 0 },
  }));

  const history: number[] = []; // sorted funding of earlier days
  const insert = (x: number) => {
    let lo = 0;
    let hi = history.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (history[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    history.splice(lo, 0, x);
  };

  for (let t = 0; t + FUNDING_FORWARD_DAYS < closes.length; t++) {
    const b = byDay.get(times[t]);
    if (!b) continue;
    const f = b.sum / b.n;
    if (history.length >= MIN_HISTORY_DAYS) {
      const threshold = history[Math.floor(history.length * 0.9)];
      let worst = Infinity;
      for (let k = 1; k <= FUNDING_FORWARD_DAYS; k++) {
        worst = Math.min(worst, closes[t + k] / closes[t]);
      }
      const ret = closes[t + FUNDING_FORWARD_DAYS] / closes[t] - 1;
      const hi = halves.findIndex((h) => times[t] >= h.from && times[t] < h.to);
      const g = f >= threshold ? acc[hi].top : acc[hi].rest;
      g.n++;
      g.dd += worst - 1;
      g.ret += ret;
    }
    insert(f);
  }

  const group = (g: { n: number; dd: number; ret: number }): FundingGroup => ({
    n: g.n,
    meanDrawdown: g.n ? g.dd / g.n : NaN,
    meanReturn: g.n ? g.ret / g.n : NaN,
  });
  return halves.map((h, i) => ({
    label: h.label,
    top: group(acc[i].top),
    rest: group(acc[i].rest),
  }));
}

// ---- DVOL test: does implied vol forecast the next 30 days' realised vol? ---

export interface DvolScore {
  n: number;
  meanDvol: number;
  meanRealised: number; // forward 30-day realised vol, annualised %
  premiumShare: number; // share of days DVOL > subsequent realised vol
  fit: { intercept: number; slope: number; r2: number }; // realised ~ DVOL
  rmseDvol: number; // DVOL as the forecast of forward realised vol
  rmseTrailing: number; // naive baseline: trailing 30-day realised vol
}

export const DVOL_FORWARD_DAYS = 30;

// `dvolAt(t)` returns the DVOL known at the close of the daily bar opening at t.
export function scoreDvol(
  times: number[],
  closes: number[],
  dvolAt: (t: number) => number | undefined
): DvolScore | null {
  const h = DVOL_FORWARD_DAYS;
  const r = logReturns(closes); // r[i]: close i -> close i+1
  const annual = (sumSq: number) => Math.sqrt((sumSq / h) * (YEAR / DAY)) * 100;
  const dvol: number[] = [];
  const fwd: number[] = [];
  const trailing: number[] = [];
  for (let t = h; t + h < closes.length; t++) {
    const d = dvolAt(times[t]);
    if (d === undefined) continue;
    let f = 0;
    let p = 0;
    for (let k = 0; k < h; k++) {
      f += r[t + k] ** 2; // closes t..t+h
      p += r[t - 1 - k] ** 2; // closes t-h..t
    }
    dvol.push(d);
    fwd.push(annual(f));
    trailing.push(annual(p));
  }
  if (dvol.length < 60) return null;
  const rmse = (pred: number[]) =>
    Math.sqrt(mean(pred.map((x, i) => (x - fwd[i]) ** 2)));
  return {
    n: dvol.length,
    meanDvol: mean(dvol),
    meanRealised: mean(fwd),
    premiumShare: mean(dvol.map((d, i) => (d > fwd[i] ? 1 : 0))),
    fit: ols(dvol, fwd),
    rmseDvol: rmse(dvol),
    rmseTrailing: rmse(trailing),
  };
}

// Power-law corridor: log10(price) = a + b·log10(days since genesis), fitted by
// OLS on BTC's daily history, with empirical residual quantiles as the band.
// The one long-horizon level model with walk-forward support (Baquero &
// Menezes, arXiv 2605.21316) — useful as a wide 12–24-month trend anchor, not
// as a law: the fitted slope drifts as data arrives. `scorePowerLaw` re-checks
// that claim on our own data.

import { dieboldMariano, mean, quantile } from "./stats";
import { DAY, isoDate, utcYearStart } from "../time";

export const GENESIS = Date.UTC(2009, 0, 3) / 1000; // block 0, 2009-01-03
export const CORRIDOR_QUANTILES = [0.025, 0.5, 0.975] as const;
export const FUTURE_DAYS = 365; // how far the corridor is extended forward

export function logDays(timeSec: number): number {
  return Math.log10((timeSec - GENESIS) / DAY);
}

export interface PowerLawFit {
  a: number; // intercept
  b: number; // slope (exponent)
  residualQ: number[]; // residual quantile per CORRIDOR_QUANTILES entry
  n: number;
}

export function fitPowerLaw(times: number[], closes: number[]): PowerLawFit | null {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] > GENESIS && closes[i] > 0) {
      x.push(logDays(times[i]));
      y.push(Math.log10(closes[i]));
    }
  }
  if (x.length < 365) return null;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) * (x[i] - mx);
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  const resid = x.map((xi, i) => y[i] - (a + b * xi));
  return {
    a,
    b,
    residualQ: CORRIDOR_QUANTILES.map((q) => quantile(resid, q)),
    n: x.length,
  };
}

export function powerLawPrice(fit: PowerLawFit, timeSec: number, qIndex: number): number {
  return Math.pow(10, fit.a + fit.b * logDays(timeSec) + fit.residualQ[qIndex]);
}

// ---- self-test: does it beat a random walk 12 months out? -------------------

export interface PowerLawScore {
  origins: number; // forecast dates scored
  from: string;
  to: string;
  rmseModel: number; // in log10 units
  rmseRandomWalk: number;
  winRate: number; // share of origins where the model's error was smaller
  dm: { stat: number; p: number }; // negative stat favours the model
  slopes: { date: string; b: number }[]; // how the fitted exponent drifted
}

// Expanding-window walk-forward on daily closes. Every `stepDays` from 2015,
// fit on data up to that day only, forecast the close `horizonDays` later and
// compare with "no change" (the random walk). Prefix sums keep each refit O(1).
export function scorePowerLaw(
  times: number[],
  closes: number[],
  horizonDays = 365,
  stepDays = 30
): PowerLawScore | null {
  const xs: number[] = [];
  const ys: number[] = [];
  const ts: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] > GENESIS && closes[i] > 0) {
      xs.push(logDays(times[i]));
      ys.push(Math.log10(closes[i]));
      ts.push(times[i]);
    }
  }
  const n = xs.length;
  const sx = [0];
  const sy = [0];
  const sxx = [0];
  const sxy = [0];
  for (let i = 0; i < n; i++) {
    sx.push(sx[i] + xs[i]);
    sy.push(sy[i] + ys[i]);
    sxx.push(sxx[i] + xs[i] * xs[i]);
    sxy.push(sxy[i] + xs[i] * ys[i]);
  }
  // OLS on points 0..k inclusive.
  const fitTo = (k: number) => {
    const m = k + 1;
    const b =
      (m * sxy[m] - sx[m] * sy[m]) / (m * sxx[m] - sx[m] * sx[m]);
    return { a: (sy[m] - b * sx[m]) / m, b };
  };

  // Index by day for the "close h days later" lookup (daily data has gaps
  // only in the 2011 Bitstamp era, so look up by timestamp, not offset).
  const byTime = new Map<number, number>();
  ts.forEach((t, i) => byTime.set(t, i));

  const errModel: number[] = [];
  const errRw: number[] = [];
  const slopes: { date: string; b: number }[] = [];
  let first = "";
  let last = "";
  const start = utcYearStart(2015);
  let nextSlopeYear = 2015;
  for (let k = 0; k < n; k++) {
    // An origin every `stepDays` from 1 Jan 2015 (daily bars sit on midnight).
    if (ts[k] < start || (ts[k] - start) % (stepDays * DAY) !== 0) continue;
    const target = byTime.get(ts[k] + horizonDays * DAY);
    const { a, b } = fitTo(k);
    const year = new Date(ts[k] * 1000).getUTCFullYear();
    if (year >= nextSlopeYear) {
      slopes.push({ date: isoDate(ts[k]), b });
      nextSlopeYear = year + 3;
    }
    if (target === undefined) continue;
    const forecast = a + b * xs[target];
    errModel.push(forecast - ys[target]);
    errRw.push(ys[k] - ys[target]);
    if (!first) first = isoDate(ts[k]);
    last = isoDate(ts[k]);
  }
  if (errModel.length < 12) return null;

  const latest = fitTo(n - 1);
  slopes.push({ date: isoDate(ts[n - 1]), b: latest.b });

  const sq = (e: number[]) => e.map((x) => x * x);
  const sqRw = sq(errRw);
  const d = sq(errModel).map((x, i) => x - sqRw[i]);
  return {
    origins: errModel.length,
    from: first,
    to: last,
    rmseModel: Math.sqrt(mean(sq(errModel))),
    rmseRandomWalk: Math.sqrt(mean(sqRw)),
    winRate: mean(errModel.map((e, i) => (Math.abs(e) < Math.abs(errRw[i]) ? 1 : 0))),
    // Origins overlap: a 365-day horizon sampled every 30 days shares ~12 lags.
    dm: dieboldMariano(d, Math.ceil(horizonDays / stepDays)),
    slopes,
  };
}

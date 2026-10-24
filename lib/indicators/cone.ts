// Volatility cone: the range price is likely to stay within over the next N
// bars, drawn as log-normal quantile bands around the current price. It shows
// uncertainty, not direction — the centre line is today's price (zero drift).
//
// BTC volatility clusters and persists, so it is forecastable even though
// direction isn't (Bergsli et al., RIBAF 2022). Three variance models:
//   - ewma:  RiskMetrics, λ = 0.94. Flat forecast, so the cone widens as √h.
//   - garch: GARCH(1,1) with variance targeting. Bends toward long-run vol.
//   - dvol:  Deribit's 30-day implied vol — the options market's own estimate.
// See reports/Bitcoin price prediction evidence.md.

import { logReturns, variance } from "./stats";
import { DAY, YEAR, utcYearStart } from "../time";

export type ConeModel = "ewma" | "garch" | "dvol";
export const CONE_MODELS: ConeModel[] = ["ewma", "garch", "dvol"];

export const DEFAULT_CONE_HORIZON = 30;
export const MIN_CONE_HORIZON = 2;
export const MAX_CONE_HORIZON = 365;

export function isValidConeModel(m: unknown): m is ConeModel {
  return CONE_MODELS.includes(m as ConeModel);
}

export function isValidConeHorizon(n: number): boolean {
  return (
    Number.isInteger(n) && n >= MIN_CONE_HORIZON && n <= MAX_CONE_HORIZON
  );
}

// Two-sided bands: 80% and 95% of outcomes should land inside.
export const CONE_LEVELS = [
  { coverage: 0.8, z: 1.2816 },
  { coverage: 0.95, z: 1.96 },
] as const;

export const EWMA_LAMBDA = 0.94;
const SEED_BARS = 30;

// One-step variance forecasts: v[t] is the variance of r[t] predicted from
// r[0..t-1] only. v has r.length + 1 entries; the last is for the next,
// not-yet-seen return.
export function ewmaFilter(r: number[], lambda = EWMA_LAMBDA): number[] {
  const seed = r.slice(0, SEED_BARS);
  const v = [seed.reduce((s, x) => s + x * x, 0) / Math.max(seed.length, 1)];
  for (let t = 0; t < r.length; t++) {
    v.push(lambda * v[t] + (1 - lambda) * r[t] * r[t]);
  }
  return v;
}

export interface Garch {
  omega: number;
  alpha: number;
  beta: number;
  longRunVar: number; // ω / (1 − α − β)
}

// Same shape as ewmaFilter: v[t] predicts r[t] from r[0..t-1].
export function garchFilter(r: number[], g: Garch): number[] {
  const v = [g.longRunVar];
  for (let t = 0; t < r.length; t++) {
    v.push(g.omega + g.alpha * r[t] * r[t] + g.beta * v[t]);
  }
  return v;
}

// Gaussian negative log-likelihood (up to a constant).
function garchNll(r: number[], g: Garch): number {
  const v = garchFilter(r, g);
  let nll = 0;
  for (let t = 0; t < r.length; t++) {
    nll += Math.log(v[t]) + (r[t] * r[t]) / v[t];
  }
  return nll / 2;
}

function garchFrom(alpha: number, beta: number, longRunVar: number): Garch {
  return { omega: longRunVar * (1 - alpha - beta), alpha, beta, longRunVar };
}

// Fit GARCH(1,1) by variance targeting (long-run variance = sample variance)
// and a coarse-then-fine grid over (α, β). Slower than an optimiser but easy
// to check: it can only return a point on the grid with the lowest NLL.
export function fitGarch(r: number[]): Garch {
  const lrv = variance(r);
  let best = garchFrom(0.1, 0.85, lrv);
  let bestNll = Infinity;
  const search = (
    aFrom: number,
    aTo: number,
    bFrom: number,
    bTo: number,
    step: number
  ) => {
    for (let a = aFrom; a <= aTo + 1e-9; a += step) {
      for (let b = bFrom; b <= bTo + 1e-9; b += step) {
        if (a <= 0 || b < 0 || a + b >= 0.999) continue;
        const g = garchFrom(a, b, lrv);
        const nll = garchNll(r, g);
        if (nll < bestNll) {
          bestNll = nll;
          best = g;
        }
      }
    }
  };
  search(0.02, 0.3, 0.5, 0.98, 0.02);
  const { alpha: a, beta: b } = best;
  search(a - 0.02, a + 0.02, b - 0.02, b + 0.02, 0.005);
  return best;
}

// Variance of the k-step log return for k = 1..horizon, given the one-step
// forecast `v1` for the next bar.
export function cumulativeVariance(
  model: ConeModel,
  v1: number,
  horizon: number,
  garch?: Garch
): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let k = 1; k <= horizon; k++) {
    if (model === "garch" && garch) {
      const p = garch.alpha + garch.beta;
      sum += garch.longRunVar + Math.pow(p, k - 1) * (v1 - garch.longRunVar);
    } else {
      sum += v1; // ewma and dvol: flat per-bar variance
    }
    out.push(sum);
  }
  return out;
}

// Per-bar variance implied by an annualised DVOL reading (in %).
export function dvolBarVariance(dvol: number, barSeconds: number): number {
  const sigmaAnnual = dvol / 100;
  return sigmaAnnual * sigmaAnnual * (barSeconds / YEAR);
}

export interface ConePoint {
  time: number;
  value: number;
}

export interface Cone {
  model: ConeModel;
  sigmaAnnual: number; // the one-step vol, annualised, for display
  centre: ConePoint[];
  // One { upper, lower } pair per CONE_LEVELS entry, in the same order.
  bands: { coverage: number; upper: ConePoint[]; lower: ConePoint[] }[];
}

export interface ConeInput {
  closes: number[]; // closed bars only — the live bar is excluded
  anchorTime: number; // time of the bar the cone starts from
  anchorPrice: number; // the current price
  barSeconds: number;
  horizon: number;
  model: ConeModel;
  dvol?: number; // latest DVOL reading, required for model "dvol"
}

// Build the cone, or null when there isn't enough data for the model.
export function buildCone(input: ConeInput): Cone | null {
  const { closes, anchorTime, anchorPrice, barSeconds, horizon, model } = input;
  const r = logReturns(closes);
  if (r.length < SEED_BARS * 2) return null;

  let v1: number;
  let garch: Garch | undefined;
  if (model === "dvol") {
    if (!input.dvol) return null;
    v1 = dvolBarVariance(input.dvol, barSeconds);
  } else if (model === "garch") {
    garch = fitGarch(r);
    v1 = garchFilter(r, garch)[r.length];
  } else {
    v1 = ewmaFilter(r)[r.length];
  }

  const cum = cumulativeVariance(model, v1, horizon, garch);
  const at = (k: number) => anchorTime + k * barSeconds;
  const start = { time: anchorTime, value: anchorPrice };
  return {
    model,
    sigmaAnnual: Math.sqrt(v1 * (YEAR / barSeconds)),
    centre: [start, ...cum.map((_, i) => ({ time: at(i + 1), value: anchorPrice }))],
    bands: CONE_LEVELS.map(({ coverage, z }) => ({
      coverage,
      upper: [
        start,
        ...cum.map((v, i) => ({
          time: at(i + 1),
          value: anchorPrice * Math.exp(z * Math.sqrt(v)),
        })),
      ],
      lower: [
        start,
        ...cum.map((v, i) => ({
          time: at(i + 1),
          value: anchorPrice * Math.exp(-z * Math.sqrt(v)),
        })),
      ],
    })),
  };
}

// ---- self-test: are the bands calibrated? -----------------------------------

export interface ConeScoreRow {
  label: string;
  n: number; // forecast origins scored
  breach: number[]; // breach rate per CONE_LEVELS entry, 0..1
}

export interface ConeScore {
  model: ConeModel;
  horizon: number; // days
  rows: ConeScoreRow[];
}

const WARMUP_DAYS = 365;

// Walk forward over daily closes: at each day t, build the h-day band from
// data up to t only, then check whether the close at t+h landed outside it.
// A calibrated 80% band is breached ~20% of the time. GARCH is refitted each
// 1 January on past data only. `dvolAt(t)` returns the DVOL known at the
// close of day t (or undefined).
export function scoreCone(
  times: number[],
  closes: number[],
  model: ConeModel,
  horizon: number,
  dvolAt?: (t: number) => number | undefined
): ConeScore {
  const r = logReturns(closes);
  const n = closes.length;
  // vNext[t] = variance forecast for the return from close t to close t+1.
  const vNext: (number | undefined)[] = new Array(n).fill(undefined);
  const garchByOrigin: (Garch | undefined)[] = new Array(n).fill(undefined);

  if (model === "ewma") {
    const v = ewmaFilter(r);
    for (let t = 0; t < n; t++) vNext[t] = v[t];
  } else if (model === "garch") {
    let g: Garch | undefined;
    let fittedYear = -1;
    let v: number[] = [];
    for (let t = WARMUP_DAYS; t < n; t++) {
      const year = new Date(times[t] * 1000).getUTCFullYear();
      if (year !== fittedYear) {
        // Fit on returns realised by the close of the last day of last year.
        const cutoff = utcYearStart(year);
        let last = t;
        while (last > 0 && times[last] >= cutoff) last--;
        g = fitGarch(r.slice(0, last));
        v = garchFilter(r, g);
        fittedYear = year;
      }
      vNext[t] = v[t];
      garchByOrigin[t] = g;
    }
  } else {
    for (let t = 0; t < n; t++) {
      const d = dvolAt?.(times[t]);
      if (d) vNext[t] = dvolBarVariance(d, DAY);
    }
  }

  const windows = [
    { label: "all", from: 0 },
    { label: "2017+", from: utcYearStart(2017) },
    { label: "2024+", from: utcYearStart(2024) },
  ];
  const rows = windows.map((w) => ({
    label: w.label,
    n: 0,
    hits: CONE_LEVELS.map(() => 0),
  }));

  for (let t = WARMUP_DAYS; t + horizon < n; t++) {
    const v1 = vNext[t];
    if (v1 === undefined) continue;
    const cum = cumulativeVariance(model, v1, horizon, garchByOrigin[t])[
      horizon - 1
    ];
    const move = Math.abs(Math.log(closes[t + horizon] / closes[t]));
    for (let wi = 0; wi < windows.length; wi++) {
      if (times[t] < windows[wi].from) continue;
      rows[wi].n++;
      CONE_LEVELS.forEach(({ z }, li) => {
        if (move > z * Math.sqrt(cum)) rows[wi].hits[li]++;
      });
    }
  }

  return {
    model,
    horizon,
    rows: rows.map((row) => ({
      label: row.label,
      n: row.n,
      breach: row.hits.map((h) => (row.n ? h / row.n : NaN)),
    })),
  };
}

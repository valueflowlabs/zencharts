// Small statistics helpers for the forecasting indicators. Hand-written to
// keep the app dependency-free; each is a few lines.

// Log returns: r[i] = ln(closes[i+1] / closes[i]), so r[i] is realised at bar i+1.
export function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    r.push(Math.log(closes[i] / closes[i - 1]));
  }
  return r;
}

export function mean(xs: number[]): number {
  if (!xs.length) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function variance(xs: number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return xs.length > 1 ? s / (xs.length - 1) : NaN;
}

// Linear-interpolated quantile (q in [0, 1]) of an unsorted sample.
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export interface Ols {
  intercept: number;
  slope: number;
  r2: number;
}

export function ols(x: number[], y: number[]): Ols {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) * (x[i] - mx);
    syy += (y[i] - my) * (y[i] - my);
  }
  const slope = sxy / sxx;
  return {
    intercept: my - slope * mx,
    slope,
    r2: syy ? (sxy * sxy) / (sxx * syy) : NaN,
  };
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7).
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

// Diebold–Mariano test on a loss-differential series d = lossA - lossB, with a
// Newey–West long-run variance (Bartlett weights) to allow for the overlap of
// multi-step forecasts. Negative stat means A has lower loss than B.
export function dieboldMariano(
  d: number[],
  lags: number
): { stat: number; p: number } {
  const n = d.length;
  const m = mean(d);
  const gamma = (k: number) => {
    let s = 0;
    for (let t = k; t < n; t++) s += (d[t] - m) * (d[t - k] - m);
    return s / n;
  };
  let lrv = gamma(0);
  for (let k = 1; k <= Math.min(lags, n - 1); k++) {
    lrv += 2 * (1 - k / (lags + 1)) * gamma(k);
  }
  const stat = m / Math.sqrt(lrv / n);
  return { stat, p: 2 * (1 - normalCdf(Math.abs(stat))) };
}

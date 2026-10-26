// Display formatting for the finder UI.

export function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// Memecoin prices span 1e-10..1e3: keep ~4 significant digits.
export function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1) return n.toFixed(a >= 1000 ? 0 : 4);
  const zeros = Math.floor(-Math.log10(a));
  return n.toFixed(Math.min(zeros + 4, 14));
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const s = Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
  return `${n > 0 ? "+" : ""}${s}%`;
}

export function fmtAgo(ms: number | null): string {
  if (!ms) return "—";
  const min = (Date.now() - ms) / 60_000;
  if (min < 60) return `${Math.max(0, Math.round(min))}m`;
  if (min < 48 * 60) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}

export function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

// Tradable instruments the app can chart. Each maps to the provider-specific
// symbols used by lib/sources.ts. Add one here (plus its provider symbols) and
// it becomes available to the API, the chart, and the console automatically.

export interface Instrument {
  id: string; // short id used in the API/console (e.g. "btc")
  label: string; // display label (e.g. "BTC/USD")
  binance: string; // Binance symbol (e.g. "BTCUSDT")
  bitstamp?: string; // optional Bitstamp pair for deep-history backfill
}

export const INSTRUMENTS: Record<string, Instrument> = {
  btc: { id: "btc", label: "BTC/USD", binance: "BTCUSDT", bitstamp: "btcusd" },
  zec: { id: "zec", label: "ZEC/USD", binance: "ZECUSDT", bitstamp: "zecusd" },
};

export const DEFAULT_SYMBOL = "btc";

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS[id] ?? INSTRUMENTS[DEFAULT_SYMBOL];
}

export function isValidSymbol(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id);
}

export function instrumentList(): { id: string; label: string }[] {
  return Object.values(INSTRUMENTS).map((i) => ({ id: i.id, label: i.label }));
}

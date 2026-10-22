# zencharts

Zen-mode crypto/USD candlestick charts. Just the chart. Nothing else.

A full-screen candlestick chart across multiple timeframes — no order books, no
news, no watchlists, no noise. Switch timeframes from a minimal bar that fades
into the background, and switch instruments from the configuration console.

## Features

- **Full-bleed zen view** — the chart is the entire screen.
- **Instruments:** BTC/USD and ZEC/USD (switch via the console; see below).
- **Timeframes:** 15m, 30m, 1H, 4H, 1D, 1W (15m is the lowest granularity).
- **Live last candle** — the most recent bar updates on a timeframe-aware poll.
- **Free, good-quality data** — Binance public market-data endpoint, no API key.

## Stack

- **Next.js** (App Router, TypeScript) — UI + a thin server-side data proxy.
- **TradingView `lightweight-charts`** — the candlestick rendering.
- No NestJS: a Next.js route handler (`app/api/candles/route.ts`) is enough to
  proxy the data provider (avoids browser CORS and hides the upstream). See
  "Why no NestJS?" below if you ever want to split the backend out.

## Data sources

Candles come from two free, keyless, read-only public market-data hosts, proxied
and stitched server-side for maximum history:

- **Binance** `data-api.binance.vision` (`GET /api/v3/klines`) — primary;
  every timeframe, high quality. Uses USDT pairs (e.g. `BTCUSDT`, `ZECUSDT`),
  the most liquid markets and standard stand-ins for USD.
- **Bitstamp** `GET /api/v2/ohlc/<pair>` — true USD, used to backfill the years
  before the Binance pair existed (BTC reaches 2011; ZEC reaches ~2019).

Instruments are defined in `lib/instruments.ts`, each mapping its id to the
provider-specific symbols (`binance`, optional `bitstamp`). Add an entry there
and it is immediately available to the API, the chart, and the console. The
request shape is `GET /api/candles?symbol=<id>&interval=<tf>` (full history), or
with `&limit=<n>` for a fast recent fetch (used by the live poll).

## Configuration console

A minimal in-app terminal (bottom-right button, or the `` ` `` key) configures
the app at runtime. It is a small command engine, not a one-off toggle, so it
can grow:

- `help` — list commands · `help <cmd>` for usage
- `theme list` / `theme set <name>` / `theme <name>` — change color theme
  (`zen-dark`, `zen-light`, `midnight`, `matrix`, `grey`, `light-grey`);
  persisted to `localStorage`
- `symbol list` / `symbol set <id>` / `symbol <id>` (aliases: `chart`, `pair`)
  — switch the charted instrument (`btc`, `zec`); persisted to `localStorage`
- `config show` — dump current settings
- `clear`, `about`, `exit`
- ↑/↓ history (persisted), Tab-completion, Esc to close

Add a command by appending to `lib/terminal/commands.ts` — the registry, help,
and completion pick it up automatically. Commands receive a `ctx` with
`print/clear/close` and a `config` API, and never touch React directly.
Themes live in `lib/themes.ts` and drive both the page chrome (CSS variables)
and the chart colors (lightweight-charts). Instruments live in
`lib/instruments.ts`, mapping each to its Binance/Bitstamp symbols.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Project layout

```
app/
  layout.tsx            # root layout, dark theme, viewport
  page.tsx              # zen page: <Chart> + <TimeframeSelector>
  globals.css           # full-bleed dark styling + fading timeframe bar
  api/candles/route.ts  # server-side proxy -> Binance klines, normalized
components/
  Chart.tsx             # lightweight-charts candlestick + live polling
  TimeframeSelector.tsx # minimal timeframe switcher
lib/
  timeframes.ts         # allowed timeframes (single source of truth)
  types.ts              # Candle shape
```

## Why no NestJS?

The only backend need here is proxying one upstream endpoint and normalizing its
payload — a single Next.js route handler does that with zero extra deployables.
If you later want a dedicated backend (auth, caching layer, websockets, more
instruments), move `lib/` + the klines logic into a NestJS service and point the
frontend's fetch at it via an `NEXT_PUBLIC_API_URL` env var. The data contract
(`{ symbol, interval, candles: Candle[] }`) stays the same.

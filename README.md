# zencharts

Zen-mode BTC/USD candlestick charts. Just the chart. Nothing else.

A full-screen candlestick chart of Bitcoin across multiple timeframes — no
order books, no news, no watchlists, no noise. Switch timeframes from a minimal
bar that fades into the background until you reach for it.

## Features

- **Full-bleed zen view** — the chart is the entire screen.
- **Timeframes:** 15m, 30m, 1H, 4H, 1D, 1W (15m is the lowest granularity).
- **Live last candle** — the most recent bar updates on a timeframe-aware poll.
- **Free, good-quality data** — Binance public market-data endpoint, no API key.

## Stack

- **Next.js** (App Router, TypeScript) — UI + a thin server-side data proxy.
- **TradingView `lightweight-charts`** — the candlestick rendering.
- No NestJS: a Next.js route handler (`app/api/candles/route.ts`) is enough to
  proxy the data provider (avoids browser CORS and hides the upstream). See
  "Why no NestJS?" below if you ever want to split the backend out.

## Data source

Candles come from Binance's public, read-only market-data host
`data-api.binance.vision` (`GET /api/v3/klines`). It is free, needs no API key,
is not geo-restricted, and has excellent historical depth and quality.

The pair is **BTC/USDT** (`BTCUSDT`), the most liquid Bitcoin market and a
standard stand-in for BTC/USD — USDT tracks USD closely enough that the candles
are visually identical to a true USD feed. To use a literal USD pair instead,
swap the proxy to Coinbase (`https://api.exchange.coinbase.com/products/BTC-USD/candles`),
though it offers fewer timeframes and smaller page sizes.

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

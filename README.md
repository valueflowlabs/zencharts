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

## Research: signals for anticipating BTC price

_Researched 2026-10-22. The "Source" column lists endpoints that responded
without an API key when checked that day._

No single signal reliably predicts Bitcoin's price. The aim here is to add a
few signals the research suggests carry some information, then test them
against our own history before trusting any of them.

### What the evidence says

- **Momentum is the best-supported signal.** Liu & Tsyvinski (Review of
  Financial Studies, 2021) found strong momentum in crypto returns: recent rises
  tend to continue. Cheah et al. (2022) compared many predictors and found
  momentum and economic-uncertainty measures did best, including on data the
  models hadn't seen.
- **Investor attention also forecasts returns.** That is Liu & Tsyvinski's
  second finding.
- **The Fear & Greed index has weak, mixed evidence.** Buying at "extreme fear"
  has historically paid off on median returns, but the sample is small and
  prices sometimes kept falling. It can sit at "greed" for months during a bull
  market.
- **Funding rates and on-chain measures like MVRV have little rigorous
  testing.** There is a 2019 preprint suggesting funding rates may signal trend,
  and otherwise mostly trader commentary.

### Candidates, grouped by how much work they are

| # | Signal | What it tells you | Source (free, no API key) | Effort | Fits "just the chart"? |
|---|---|---|---|---|---|
| 1 | **Volume** | Whether a move has participation behind it; several other indicators need it | Already fetched: Binance kline `row[5]`, Bitstamp `volume`. `Candle` currently drops it | Tiny | Thin histogram at the bottom |
| 2 | **Moving averages** (200-day, 200-week, 50/200 cross) | Trend and momentum, the best-supported signal | Computed from existing candles | Small | Thin line overlays |
| 3 | **RSI / momentum** | Overbought/oversold, momentum | Computed from existing candles | Small | Optional lower pane |
| 4 | **Power-law trend band** (log price vs. log of days since 2009) | Where price sits against its long-run trend | Fitted to daily data back to 2011 | Small | 1D/1W overlay |
| 5 | **Halving countdown and cycle position** | Where we are in the 4-year cycle | Block height from `mempool.space` | Small | One line in the console |
| 6 | **Fear & Greed index** | Crowd sentiment, useful mainly at extremes | `api.alternative.me/fng/?limit=0` (full daily history) | Small | Console readout or a colour strip |
| 7 | **Funding rate and open interest** | How crowded leveraged positions are; squeeze risk | `fapi.binance.com`, with Bybit and OKX as fallbacks | Medium | Lower pane |
| 8 | **Implied volatility (Deribit DVOL)** | How big a move the options market expects | Deribit public API | Medium | Lower pane |
| 9 | **MVRV, active addresses, market cap** | Valuation against investors' average cost basis (cycle tops and bottoms) | CoinMetrics Community API; MVRV is in the free tier | Medium | 1D/1W pane |
| 10 | **Hashrate and difficulty** | Miner health; "hash ribbons" signal | `mempool.space`, `api.blockchain.info` | Medium | Lower pane |
| 11 | **Coinbase premium** | US spot demand (Coinbase BTC-USD price vs. Binance BTC-USDT) | `api.exchange.coinbase.com` | Small | Line |
| — | US dollar index / S&P 500 correlation | Macro risk-on vs. risk-off | Stooq blocks scripted requests; FRED needs a key | — | Skip for now |
| — | Spot ETF flows | Institutional demand | Farside only offers a web page to scrape | — | Skip |

**Deployment risk:** Binance futures (`fapi`) and Bybit generally refuse
requests from US servers. If the app is deployed to a US region (Vercel's
default), plan for OKX or Deribit as the fallback.

### Recommended order

1. **Add volume to `Candle`, then moving averages and RSI computed on the
   client.** This needs no new data sources and covers the signal with the
   strongest research behind it.
2. **Add a `/api/signals` route modelled on `app/api/candles/route.ts`.** It
   would serve Fear & Greed, funding rate and MVRV, and the console would toggle
   each one, e.g. `signal on fng`.
3. **Add a backtest console command, e.g. `backtest ma200`.** It would measure
   how much each signal actually helped on the 2011+ history before we trust
   it. This matters more than any single indicator.

Machine-learning price forecasts are left out on purpose. They tend to look good
on past data and fail on future prices, and they would clutter the chart.

### Sources

- [Liu & Tsyvinski, Risks and Returns of Cryptocurrency (SSRN)](https://papers.ssrn.com/abstract=3226806) · [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf) · [RFS listing](https://ideas.repec.org/a/oup/rfinst/v34y2021i6p2689-2727..html)
- [Liu, Tsyvinski & Wu, Common Risk Factors in Cryptocurrency](https://papers.ssrn.com/abstract=3379131)
- [Predictability of Bitcoin returns (Cheah et al.)](https://discovery.dundee.ac.uk/en/publications/predictability-of-bitcoin-returns/)
- [Funding rate preprint (arXiv 1912.03270)](https://arxiv.org/abs/1912.03270) · [BitMEX funding mean-reversion post](https://www.bitmex.com/blog/xbtusd-funding-mean-reversion-strategy)
- [K33: returns after extreme fear](https://k33.com/research/archive/articles/fear-and-greed-index-touched-2020-lows) · [Fear & Greed and Bitcoin returns study](https://virtusinterpress.org/How-does-the-Bitcoin-Sentiment-Index-of-Fear-Greed-affect-Bitcoin-returns.html) · [Fear & Greed Granger-causality paper](https://www.emerald.com/insight/content/doi/10.1108/RBF-08-2023-0224/full/html) · [Fear & Greed practitioner write-up](https://codealchemy.substack.com/p/measuring-bitcoin-market-psychology)
- [MVRV momentum note (KuCoin)](https://www.kucoin.com/news/flash/bitcoin-mvrv-momentum-turns-positive-echoing-2019-and-2023)

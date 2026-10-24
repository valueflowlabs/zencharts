# Building BTC forecasting features into zencharts: implementation notes

_Researched 2026-10-23. Live API checks were run with curl from a Polish IP (`ipinfo.io/country` → `PL`), read-only. No repo files were modified._

**Codebase context (read from repo).** Next 16 + React 19, `lightweight-charts` **4.2.3** (`package.json`, `node_modules/lightweight-charts/package.json`). `Candle` = `{time, open, high, low, close}`; volume is fetched but dropped (`lib/types.ts`, `toCandleBinance` in `lib/sources.ts`). The momentum "pane" is a v4-style fake pane: a histogram on its own `priceScaleId: "momentum"` with `scaleMargins {top: 0.8}` while the candles' margins shrink (`components/Chart.tsx`, lines ~111–190). The server cache is an in-memory `Map` with a 10-minute TTL (`lib/sources.ts`). Console commands are plain objects appended to `COMMANDS` in `lib/terminal/commands.ts` and persisted through the `config` API and localStorage. Daily history reaches 2011 through the Bitstamp backfill, which is enough for daily/weekly volatility, power-law and backtest work.

---

## 1. Probabilistic forecast displays: volatility cones, forecast fans, quantile bands, power-law corridor

### Takeaway
A volatility cone (EWMA, GARCH(1,1) or DVOL-scaled) and a power-law corridor fit the app well. Both are cheap closed-form computations on candles the app already has. Draw each as a few `LineSeries` (or an area pair) whose points are dated after the last candle. lightweight-charts has no "future" API: the time scale is the union of all series' timestamps, so you extend it with future-dated points or `WhitespaceData` (time only). Keep in mind that a cone shows uncertainty, not direction: its centre should be the current price or a zero/tiny drift, not a prediction.

### Cited Findings
- `WhitespaceData` is "a data point without a value", with a required `time` and optional `customValues`. `OhlcData`/`SingleValueData` extend it, so any series can carry whitespace entries. The docs do not say outright that whitespace extends the time scale into the future — [LWC docs: WhitespaceData](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/WhitespaceData)
- No built-in way exists to extend the time scale past the last bar. The community workaround in GitHub discussion #1462 (no maintainer reply) appends `WhitespaceData` with future timestamps after the last candle, optionally on a separate carrier series. It then extends that data inside `timeScale().subscribeVisibleLogicalRangeChange(...)` using `barsInLogicalRange` when the user scrolls past the end. Primitives drawn in the future area must be attached to the series that holds the future whitespace — [GitHub discussion #1462](https://github.com/tradingview/lightweight-charts/discussions/1462)
- v4.1.1 added `allowShiftVisibleRangeOnWhitespaceReplacement`, which controls scroll behaviour when real data replaces existing whitespace. This matters because the live poll will turn "future" whitespace into real bars — [search summary of releases / discussion](https://github.com/tradingview/lightweight-charts/releases/tag/v4.1.0) _(option name taken from a search snippet, not read on the release page itself)_
- v5.0.9 added `rightOffsetPixels`, which leaves blank space right of the last bar without data. Blank space alone does not let you plot values there — [LWC releases](https://github.com/tradingview/lightweight-charts/releases)
- EWMA (RiskMetrics) variance: σ²ₜ = λσ²ₜ₋₁ + (1−λ)r²ₜ₋₁, with λ = 0.94 for daily data (0.97 monthly). EWMA is GARCH(1,1) with ω = 0 and α + β = 1, so it has no mean reversion: its multi-step forecast is flat, and the cone widens exactly as √h — [arch docs: EWMAVariance (default lam=0.94)](https://arch.readthedocs.io/en/latest/univariate/generated/arch.univariate.EWMAVariance.html); [MetricGate EWMA note](https://metricgate.com/docs/ewma-volatility-riskmetrics/) (secondary sources; the original 1996 RiskMetrics Technical Document was not retrieved)
- Deribit DVOL (BTC 30-day implied-vol index, annualised %) is available keyless as daily OHLC via `public/get_volatility_index_data` (details in section 4). One option: σ_daily ≈ DVOL/100/√365 for a market-implied cone — [Deribit API](https://docs.deribit.com/) (endpoint verified by curl; see section 4)
- The `garch` npm package (v2.0.0, published 2026-07-07, MIT, zero dependencies) states that it implements "Realized GARCH, Realized EGARCH, Realized GJR-GARCH, HAR-RV and NoVaS" in TypeScript. `predict(candles, interval, currentPrice?, confidence?)` returns a **t+1** log-normal price band `P·exp(±z·σ)`, with `z` calibrated from empirical residual quantiles blended with a Student-t — [npm registry: garch](https://registry.npmjs.org/garch) (README read via registry JSON; no repository field; maintenance track record unknown)

### Inferences (implementation recipe)
- **Cone maths (log-normal).** With last close P₀ and per-bar σ (log-return), the quantile-q band at horizon h bars is `P₀ · exp(μh + z_q · σ · √h)`. For GARCH(1,1), replace σ√h with the square root of the summed forecast variances: `σ²_{t+k} = σ̄² + (α+β)^{k-1}(σ²_{t+1} − σ̄²)`, where `σ̄² = ω/(1−α−β)`. The cone then bends toward long-run vol instead of growing as a pure √h. Use μ = 0, or −σ²/2 for a median-preserving cone. Do not use fitted drift, which smuggles in a directional "prediction".
- **Quantile bands.** Draw 3 pairs, for example 50% (z = ±0.674), 80% (±1.282) and 95% (±1.96), or better, **empirical** quantiles of standardised residuals rₜ/σₜ from history, because BTC returns are fat-tailed. Five `LineSeries` (median plus 2×2 bands) with decreasing opacity work in both v4 and v5. A filled fan needs either stacked `AreaSeries` (awkward: areas fill to the bottom of the pane) or a custom series/primitive. For a zen look, thin dashed lines (`lineStyle: LineStyle.Dashed`, `lastValueVisible: false`, `priceLineVisible: false`, `crosshairMarkerVisible: false`) are enough.
- **Future timestamps.** Generate `t = lastCandle.time + k·barSeconds` for k = 1..H. For `1w`, step 7×86400, matching the Monday anchor in `dailyToWeekly`. For `1d`, step 86400 UTC. Crypto trades 24/7, so there are no session gaps. Put the cone series' data at those future times, starting the cone at k = 0 (last close) so it attaches visually. All series share one time scale, so the candle series does not need whitespace if the cone series already has future points. _Expected from LWC's time-scale-union behaviour; not verified by running it in this app._ Set `timeScale().applyOptions({ rightOffset })` or call `scrollToPosition` so the cone is in view on load.
- **Live poll interaction.** When a new candle lands at a time that already exists in the cone series, nothing breaks, because they are different series. Recompute the cone on each closed bar (not on every 5 s tick) to avoid flicker and wasted work.
- **Power-law corridor.** Fit `log10(price) = a + b·log10(days since 2009-01-03 genesis)` by OLS on daily closes, which the app has back to 2011 via Bitstamp. Take empirical residual quantiles (for example 2.5%/50%/97.5%) as the corridor and extrapolate to future dates as above. It is closed form (`simple-statistics.linearRegression`, or 10 lines by hand). It only makes sense on 1D/1W with a log price scale (`rightPriceScale: { mode: PriceScaleMode.Logarithmic }`). To be honest about it, also fit it **expanding-window** (only data ≤ t) and show how the fitted slope and corridor drifted over time. In-sample fits look far better than they forecast.
- **DVOL-scaled cone.** Fetch daily DVOL server-side (it has CORS `*`, so the client could fetch it directly, but caching is better on the server). Use the last DVOL close for σ. Comparing the realised-vol cone with the implied-vol cone is a cheap, informative visual: implied usually sits above realised (the variance risk premium) _(general finance knowledge; no source retrieved here)_.
- **Console UX.** `cone on|off`, `cone model ewma|garch|dvol`, `cone horizon <bars>`, `powerlaw on|off`. Persist them like `momentum`.

### Gaps
- I did not run a v4.2.3 demo to confirm that a `LineSeries` with only future-dated points renders correctly beside a candle series whose last bar is earlier. LWC's union time scale makes this expected, but it is unverified here.
- The power-law model's academic support was not researched here. The commonly cited sources are informal (blogs/tweets) and out of scope.
- The `garch` package's source repo, tests and correctness were not reviewed. Its API forecasts only t+1, so multi-step cones still need your own recursion.

---

## 2. JS/TS libraries for indicators, statistics and ML

### Takeaway
For this app, `simple-statistics` (about 10 KB gzip, actively maintained) plus hand-written EWMA/GARCH (around 100 lines) is the right weight. `trading-signals` is the maintained indicator library, if one is wanted at all. `technicalindicators` is effectively abandoned (last release 2020). TensorFlow.js and ONNX Runtime Web are heavy and unjustified for the weak predictive evidence on BTC. GARCH(1,1) is simple to write: a log-likelihood plus a bounded optimiser, or even a coarse grid search, over three parameters.

### Cited Findings
npm registry metadata, fetched 2026-10-23 (latest version, publish date of latest, license, runtime deps):
- `trading-signals` **8.3.0**, 2026-08-11, MIT, 0 deps; bundlephobia 96.9 KB min / **21.5 KB gzip** — [npm](https://registry.npmjs.org/trading-signals), [bundlephobia](https://bundlephobia.com/package/trading-signals)
- `technicalindicators` **3.1.0**, published **2020-03-16** (registry modified 2023), MIT; 52 KB min / 10.3 KB gzip; lists `@types/node` as a runtime dependency — [npm](https://registry.npmjs.org/technicalindicators), [bundlephobia](https://bundlephobia.com/package/technicalindicators)
- `simple-statistics` **7.12.1**, 2026-09-27, ISC, 0 deps; 27.4 KB min / **10.2 KB gzip** (tree-shakeable functions: `mean`, `standardDeviation`, `quantile`, `linearRegression`, `sampleCorrelation`, …) — [npm](https://registry.npmjs.org/simple-statistics), [bundlephobia](https://bundlephobia.com/package/simple-statistics)
- `ml-matrix` **6.15.1**, 2026-10-19, MIT; `ml-regression` 6.3.0, 2025-05-16 (pulls in ml-matrix, ml-kernel, …) — [npm ml-matrix](https://registry.npmjs.org/ml-matrix), [npm ml-regression](https://registry.npmjs.org/ml-regression) (bundlephobia did not return sizes)
- `indicatorts` 2.2.2 (2025-02-26), `@ixjb94/indicators` 1.2.6 (2026-06-26) are alternative zero-dependency indicator libraries — [npm indicatorts](https://registry.npmjs.org/indicatorts), [npm @ixjb94/indicators](https://registry.npmjs.org/@ixjb94/indicators)
- `@tensorflow/tfjs` **4.22.0**, last published **2024-10-21**, ~147 MB unpacked — [npm](https://registry.npmjs.org/@tensorflow/tfjs)
- `onnxruntime-web` **1.30.0**, 2026-09-14, ~145 MB unpacked (ships WASM/WebGPU binaries) — [npm](https://registry.npmjs.org/onnxruntime-web)
- `garch` **2.0.0** (2026-07-07): "GARCH and EGARCH volatility models for TypeScript", zero dependencies, auto-selects a model by QLIKE — [npm](https://registry.npmjs.org/garch)
- For comparison, `lightweight-charts@5.2.1` is 194 KB min / **61.6 KB gzip** on bundlephobia (the whole package, not tree-shaken) — [bundlephobia](https://bundlephobia.com/package/lightweight-charts@5.2.1)

### Inferences
- **The momentum module is the pattern to copy.** Pure functions on `Candle[]` (`xxxSeries`, `xxxAt` for the live tick) need no library. EMA, SMA, RSI, EWMA vol, rolling z-score and realised vol are each 5–20 lines and avoid a dependency plus its float/streaming semantics.
- **Writing GARCH(1,1) yourself.** r = log returns × 100, demeaned. Recursion `h_t = ω + α r²_{t-1} + β h_{t-1}`, with h₀ = sample variance. Negative log-likelihood (Gaussian) `½Σ(log h_t + r²_t/h_t)`. Constraints ω > 0, α ≥ 0, β ≥ 0, α + β < 1. Optimise with Nelder–Mead on transformed parameters (`ω = e^x₁`, `α = σ(x₂)·σ(x₃)`, `β = σ(x₂)·(1−σ(x₃))`, where σ is the logistic) for 200–500 iterations. On about 5,000 daily BTC returns this takes milliseconds in the browser. Student-t innovations add one parameter. Refit on demand (console command) or daily server-side; do not refit on every tick.
- **Skip TF.js/ONNX** unless there is a pre-trained model with out-of-sample evidence. The download cost (MBs of WASM/weights) clashes with the minimal app, and the README's own evidence summary says only momentum has robust support.
- If an indicator library is added, prefer `trading-signals` (maintained, TS-native, streaming `update()` API that suits the live-tick pattern) over `technicalindicators`.

### Gaps
- Bundlephobia did not return sizes for `ml-matrix`, `garch`, `@tensorflow/tfjs` or `lightweight-charts@4.2.3` (the API call failed or timed out).
- The `garch` package's GitHub repo, test coverage and author track record were not checked.

---

## 3. In-browser backtesting: walk-forward evaluation, metrics, look-ahead bias

### Takeaway
A daily-bar backtester of a 200-day-MA filter or TSMOM versus buy-and-hold is about 100 lines of TS on the existing `/api/candles?interval=1d` data. Its output can be a console report (`backtest ma200`) plus an optional equity-curve line in a pane. Honesty comes from three things. First, a signal computed on close t is only traded from bar t+1. Second, fees are charged on each position change. Third, any parameter choice is made on past data only (walk-forward), with the results reported over the whole period and per sub-period.

### Cited Findings
- Standard overfitting safeguards such as a single hold-out "tend to be unreliable and inaccurate" for investment backtests. Bailey, Borwein, López de Prado & Zhu propose estimating the Probability of Backtest Overfitting with combinatorially symmetric cross-validation (CSCV) — [The Probability of Backtest Overfitting, J. Computational Finance 20(4), 2017](https://papers.ssrn.com/abstract=2326253); [R `pbo` package readme](https://archive.linux.duke.edu/cran/web/packages/pbo/readme/README.html)
- The app already contains the evidence summary for momentum (Liu & Tsyvinski 2021; Cheah et al. 2022) in `README.md` → "Research". That summary is not re-sourced here.

### Inferences (implementation recipe)
- **Data.** Daily closes (Binance after 2017-08, Bitstamp before). Mark the stitch date: pre-2014 Bitstamp liquidity and the Mt.Gox era make early results less representative, so report results from 2014+ and from 2017+ separately.
- **Signal → position without look-ahead.**
  ```ts
  // sig[t] uses closes[0..t] only; position held over (t, t+1] is pos[t+1] = sig[t]
  const ret = closes.map((c, t) => t ? c / closes[t-1] - 1 : 0);
  let eq = 1, pos = 0;
  for (let t = 1; t < n; t++) {
    eq *= 1 + pos * ret[t];                 // earn today's return with yesterday's decision
    const next = sig(t);                    // decide at close t (MA200 uses closes[t-199..t])
    if (next !== pos) eq *= 1 - feeRate * Math.abs(next - pos);   // e.g. 0.001 per side + slippage
    pos = next;
  }
  ```
  The classic bug is `eq *= 1 + sig(t) * ret[t]`, which lets the decision use the same close it profits from. Unit test: shuffle-future test, where changing `closes[t+1..]` must not change `sig(t)`. A second guard is to compute the signal from a sliced array `closes.slice(0, t+1)` in a slow reference implementation and assert that it equals the fast rolling version.
- **No in-progress bar.** Exclude the last candle while it is still open (the live poll updates it). Only closed bars enter the backtest.
- **Walk-forward.** For parameterised signals (MA length, TSMOM lookback), choose the parameter at each yearly re-fit date by maximising Sharpe over the past N years only. Apply it for the next year and concatenate the out-of-sample years. Show the fixed-parameter (MA200 / 12-month TSMOM, the literature defaults) result next to it as the "no tuning" reference.
- **Metrics (daily bars, crypto annualisation 365).**
  - CAGR = eq_end^(365/days) − 1
  - Max drawdown = min over t of eq_t / max(eq_≤t) − 1
  - Sharpe = mean(dailyRet)/std(dailyRet)·√365 (rf ≈ 0, or state the assumption)
  - Hit rate = share of days, or better of trades, with positive return while in position
  - Exposure = share of days in market; number of trades; total fees paid
  - Always show the same metrics for buy-and-hold over the identical window.
- **Display.** Print a compact table in the console (the app's console already prints aligned text). Optionally add a `LineSeries` equity curve (log scale) in a pane, plus series markers for entries and exits. Markers are `series.setMarkers` in v4 and `createSeriesMarkers(series, markers)` in v5.
- **Run it in a Web Worker** if it does walk-forward grids, so the chart stays smooth. A single pass over about 5,500 daily bars is sub-millisecond on the main thread.
- **Honesty notes to print with results:** in-sample versus out-of-sample period; parameter count tried; fees/slippage assumption; "USDT ≈ USD" caveat; no taxes or funding.

### Gaps
- I did not run a backtest here, so no numeric results are reported. Any claimed MA200/TSMOM edge on BTC should come from the app's own run, not these notes.
- The Deflated Sharpe Ratio (Bailey & López de Prado 2014) is a natural add-on, but its paper was not fetched.

---

## 4. Free keyless data APIs: live verification (2026-10-23, from PL)

### Takeaway
Every endpoint below answered HTTP 200 without a key from Poland. Fear & Greed, CoinMetrics Community, mempool.space, Deribit and Coinbase Exchange send `Access-Control-Allow-Origin: *`, so they are browser-callable. OKX and Bybit sent **no** CORS header and need the server proxy. The main deployment risk is **Vercel's default function region `iad1` (US)**: Binance (spot `api.binance.com` and futures `fapi`) and Bybit are reported to geo-block US/cloud IPs. Pin the proxy routes to an EU region or fetch those sources from the client.

### Cited Findings (each endpoint was hit with curl; results as observed)
- **alternative.me Fear & Greed**: `GET https://api.alternative.me/fng/?limit=0` returns the full daily history, **3,182 points from 2018-02-01** (timestamp 1517443200) to 2026-10-20 (value 68, "Greed"). Values are strings, with `time_until_update`. CORS `*` — [api.alternative.me/fng](https://api.alternative.me/fng/?limit=2) (curl-verified)
- **CoinMetrics Community API** (`community-api.coinmetrics.io/v4/timeseries/asset-metrics`), keyless, CORS `*`:
  - The catalog lists **31 free BTC metrics** with 1d frequency: AdrActCnt, AdrBalCnt, BlkCnt, **CapMVRVCur**, CapMrktCurUSD, CapMrktEstUSD, FeeTotNtv, FlowInExNtv/USD, FlowOutExNtv/USD, **HashRate**, IssTotNtv/USD, PriceBTC, PriceUSD, ROI1yr, ROI30d, ReferenceRate(+ETH/EUR/USD), SplyCur, SplyExNtv/USD, SplyExpFut10yr, TxCnt, TxTfrCnt, volume_reported_spot_usd_1d, and others — [catalog-v2](https://community-api.coinmetrics.io/v4/catalog-v2/asset-metrics?assets=btc) (curl-verified)
  - `CapMVRVCur` history starts **2010-07-18**. The latest value on 2026-10-23 was dated **2026-10-21** (≈2-day lag; MVRV 1.56, AdrActCnt 633,851) (curl-verified)
  - **Not free (HTTP 403 "not available with supplied credentials")**: `CapRealUSD` (realised cap), `SplyAct1yr`, `NVTAdj`, `CapMVRVFF` (curl-verified)
  - Pagination: `page_size` (≤10,000 per docs; not verified), `paging_from=start|end`, `next_page_token` / `next_page_url` (curl-verified)
  - Rate limit per docs: "**10 requests per 6 seconds per IP address**", max 10 parallel, HTTP 429 when exceeded. License: CC BY-NC 4.0 — [CoinMetrics API v4 docs](https://docs.coinmetrics.io/api/v4/). Conflict: the live response headers said `x-ratelimit-limit: 6000, 6000;w=20` with `x-ratelimit-plan: download` (curl). Treat the documented 10/6 s as the safe budget.
- **mempool.space**: `/api/blocks/tip/height` → 972664; `/api/v1/difficulty-adjustment` (progress %, est. change +3.25%, retarget ETA); `/api/v1/mining/hashrate/all` (daily avgHashrate since 2009). CORS `*`, `cache-control: max-age=120` on hashrate — [mempool.space API](https://mempool.space/docs/api/rest) (curl-verified; rate limits not documented in what I checked)
- **Deribit public** (CORS `*`):
  - `public/get_volatility_index_data?currency=BTC&start_timestamp=…&end_timestamp=…&resolution=1D` returns `[ts, open, high, low, close]`. **Max 1,000 rows per call** plus a `continuation` timestamp for paging backwards. Daily **DVOL history begins 2021-03-24** (first row 1616544000000, ~84.8). Latest close 38.48 on 2026-10-20 (curl-verified)
  - `public/get_funding_rate_history?instrument_name=BTC-PERPETUAL&start_timestamp&end_timestamp` returns hourly `interest_1h`, `interest_8h`, `index_price` (curl-verified) — [Deribit API docs](https://docs.deribit.com/)
- **Binance USDⓈ-M futures** (`fapi.binance.com`, CORS `*`, reachable from PL):
  - `/fapi/v1/fundingRate?symbol=BTCUSDT` (8-hourly). History reaches **2019-09-10** (first fundingTime 1568102400000) (curl-verified)
  - `/futures/data/openInterestHist?symbol=BTCUSDT&period=1d` works, but "**Only the data of the latest 1 month is available**", max limit 500, and a separate IP limit of 1,000 req / 5 min — [Binance docs: Open Interest Statistics](https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest-Statistics). So historical OI must be accumulated by the app itself, or taken from OKX.
- **OKX**: `/api/v5/public/funding-rate-history?instId=BTC-USDT-SWAP` and `/api/v5/rubik/stat/contracts/open-interest-volume?ccy=BTC&period=1D` (daily `[ts, OI USD, volume USD]`) both returned 200, but **without** an `Access-Control-Allow-Origin` header, so they must go through the server proxy (curl-verified) — [OKX API v5](https://www.okx.com/docs-v5/en/)
- **Bybit v5**: `/v5/market/funding/history?category=linear&symbol=BTCUSDT` and `/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1d` returned 200 with cursor paging. **No CORS header** observed (curl-verified) — [Bybit v5 docs](https://bybit-exchange.github.io/docs/v5/intro)
- **Coinbase Exchange**: `GET https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400` returned **350 rows max** per call, `[time, low, high, open, close, volume]` (note the order: low/high before open). CORS `*`, `cache-control: public, max-age=300`. True USD and US-accessible, so it is a natural fallback if Binance is blocked from a US region (curl-verified) — [Coinbase Exchange API](https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getproductcandles)
- **Geo restrictions**: Vercel Functions run in **`iad1` (Washington, D.C.) by default** for new projects. The region can be changed in project settings or `vercel.json` `"regions": ["fra1"]` / per-function `functions` overrides. Hobby allows a single region — [Vercel docs: function regions](https://vercel.com/docs/functions/configuring-functions/region)
- A Next.js developer reported public Binance calls that worked locally but returned **HTTP 451 "Restricted access"** after deploying to Vercel — [Vercel Community thread](https://community.vercel.com/t/binance-api-calls-on-vercel/29895). A Linode user reported `api.binance.com` blocked from a US server but working from Frankfurt — [Linode community](https://www.linode.com/community/questions/23972/linode-and-binancecom). These are user reports, not official Binance statements.

### Inferences (caching and architecture)
- **Server-side routes, mirroring `lib/sources.ts`.** Add, for example, `/api/series?id=fng|mvrv|dvol|funding|oi|hashrate`. Normalise each to `{time (sec, UTC midnight), value}[]` so they plug straight into a `LineSeries`/`HistogramSeries`.
- **Caching.** All of these sources are daily (F&G, CoinMetrics, DVOL 1D, OI 1D) or 8-hourly (funding). Cache them for 1–6 hours: keep the in-memory TTL map, and on Vercel also send `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` so the CDN absorbs traffic. Then the CoinMetrics 10 req / 6 s and Deribit limits are never approached. Fetch full history once (paged: Deribit 1,000/page, CoinMetrics `next_page_token`), then only the tail.
- **Region.** Set `regions: ["fra1"]` (or `arn1` / `cdg1`) in `vercel.json` for the whole project. The existing candles route already depends on Binance (`data-api.binance.vision`, whose US status was not checked here) and Bitstamp. Alternatively, call the CORS-enabled sources (Deribit, F&G, CoinMetrics, mempool, Binance fapi) directly from the browser, so the user's own IP is used. That trades caching for geo-robustness.
- **Accumulating OI history.** Binance keeps only 30 days. OKX's rubik daily OI series was observed but its depth was not measured. For a long OI pane you would need to persist snapshots (for example a daily cron to Vercel Blob/KV). That conflicts with the app's no-storage simplicity, so OI is a "last 30 days" pane at best.
- **Alignment.** CoinMetrics is about 2 days behind, F&G updates once daily, and DVOL is 00:00 UTC daily. In backtests, always lag external series by their publication delay (CoinMetrics ≥1–2 days) to avoid look-ahead.

### Gaps
- Not verified from a US IP. Binance/Bybit US blocking rests on user reports, not on my own test. Whether `data-api.binance.vision` (the app's primary candle host) is blocked from `iad1` was not tested.
- Rate limits for alternative.me, mempool.space, Deribit public, OKX and Bybit were not read from their docs.
- OKX rubik OI history depth and Bybit OI history depth were not measured.
- Terms of use for redistributing F&G/CoinMetrics data in a public app: CoinMetrics is CC BY-NC (non-commercial, attribution expected); alternative.me terms were not checked.

---

## 5. lightweight-charts v5 migration: is it worth it for indicator panes?

### Takeaway
Yes, moderately. v5 (current **5.2.1**, 2026-08-12) has real multi-pane support: `chart.addSeries(Def, opts, paneIndex)`, per-pane heights and stretch factors, and a resizable separator. That replaces the current `scaleMargins` hack and makes stacking momentum + DVOL + F&G + funding panes clean. The migration is mechanical: `addXSeries` → `addSeries(XSeries, …)`, `watermark` → `createTextWatermark` (the recent commit hides the TV logo, so check that option still exists), and markers → `createSeriesMarkers`. Forecast cones and the power-law corridor work identically in v4 and v5, so they alone do not require upgrading.

### Cited Findings
- v5 released **2025-03-03**. TradingView claims the base bundle is 16% smaller at **35 kB**, with multi-pane support, modular markers/watermarks, pane primitives, an ES2020 codebase and wider colour spaces — [TradingView blog: Lightweight Charts v5](https://www.tradingview.com/blog/en/tradingview-lightweight-charts-version-5-50837)
- Breaking changes are listed in [LWC migration v4→v5](https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5):
  - `chart.addLineSeries(o)` → `chart.addSeries(LineSeries, o)`, and the same for Area/Bar/Baseline/Candlestick/Histogram. Series definitions must be imported.
  - Markers: `series.setMarkers()` → `createSeriesMarkers(series, markers)`, which returns an object with `setMarkers()`/`markers()`.
  - The `watermark` chart option is removed; use `createTextWatermark(chart.panes()[0], { lines: [...] })` / `createImageWatermark`.
  - Plugin typings renamed (`ISeriesPrimitivePaneView` → `IPrimitivePaneView`, etc.).
- Panes: pass a pane index as the 3rd argument, `chart.addSeries(HistogramSeries, opts, 1)`. `chart.panes()[i]` returns `IPaneApi` with `setHeight(px)` (min 30 px), `setStretchFactor`, `moveTo(index)`, `getSeries()`, `priceScale(id)`, `attachPrimitive`, `setPreserveEmptyPane`, `addSeries` — [LWC panes tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes); [IPaneApi](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi). The layout option `layout.panes` covers separator colours and `enableResize` — [LWC panes docs](https://tradingview.github.io/lightweight-charts/docs/panes)
- v5 point releases ([GitHub releases](https://github.com/tradingview/lightweight-charts/releases)):
  - 5.0.8: expanded pane API (`addPane`, stretch factors, pane-level series creation)
  - 5.0.9: `rightOffsetPixels`
  - 5.1.0: opt-in **data conflation** for large datasets
  - 5.2.0: series hit-testing, `defaultVisiblePriceScaleId`, `tickMarkDensity`
  - 5.2.1 (12 Aug): crosshair performance with markers, bug fixes
  - A separate official plugin-packages release (16 Sep) requires `lightweight-charts ^5.0.0`.
- npm: `lightweight-charts` latest = **5.2.1**, published 2026-08-12, Apache-2.0, one dependency (`fancy-canvas`) — [npm registry](https://registry.npmjs.org/lightweight-charts)

### Inferences
- **Upgrade if** you plan two or more indicator panes (momentum + DVOL/F&G/funding/equity curve). The pane API gives each indicator its own price scale and a user-resizable height. It also removes the hand-tuned `CANDLE_MARGINS_WITH_PANE` / `MOMENTUM_MARGINS` constants in `Chart.tsx`, which would otherwise multiply with each new pane.
- **Stay on v4 if** only overlays are added (cone, power-law, MAs on the price pane) plus at most one bottom indicator. The current fake-pane approach works and has zero migration risk.
- **Migration checklist for this repo:**
  - `addCandlestickSeries` / `addHistogramSeries` in `components/Chart.tsx`
  - the attribution/logo option from commit `f264ff1` (verify that the v5 `layout.attributionLogo` equivalent still exists; not verified)
  - remove `priceScaleId: "momentum"` + `scaleMargins` in favour of pane index 1; toggling the pane becomes adding/removing the series (empty panes are removed unless `setPreserveEmptyPane(true)`)
  - theme application to pane separators (`layout.panes.separatorColor`)
- The official plugin packages (v5-only) may include band/fan-style plugins useful for drawing filled cones. Their exact contents were not checked.

### Gaps
- I did not verify whether v5 keeps `layout.attributionLogo` (used to hide the TV logo) or changed attribution requirements.
- I did not confirm the exact contents of the 16 Sep plugin-packages release (whether a "bands"/"fan" plugin exists).
- The 35 kB figure is TradingView's own claim. Bundlephobia measured the whole package at 61.6 KB gzip, but tree-shaken real-world size with only Candlestick + Line + Histogram was not measured.

# Market-structure, flow, derivatives and on-chain signals as BTC price predictors

Research date: 2026-10-23. About 20 tool calls; a ScienceDirect article returned 403 and a Kaiko page redirected to a login wall, so some primary texts were read only through abstracts or summaries. Evidence grading used below: **[peer-reviewed]**, **[working paper/preprint]**, **[industry research]** (vendor or desk research, methods partly disclosed), **[vendor/marketing or commentary]**.

## Derivatives: funding, OI, basis, liquidations, options (DVOL, skew, P/C, max pain)

### Takeaway
The best-supported derivatives finding is that a **high futures basis (crypto carry) and elevated funding/leverage predict crash risk and drawdowns, not positive returns** (BIS WP 1087). Funding-rate claims of "negative funding leads to bottoms" are mostly practitioner event studies with few independent episodes. Option-implied measures look more useful for **volatility** than for direction. Bitcoin's smile is flatter and more symmetric than equity skew, so equity-style skew signals do not carry over directly. I found no rigorous evidence for put/call ratio or max pain as BTC return predictors.

### Cited Findings
- **Crypto carry (basis), BIS Working Paper 1087** (Schmeling, Schrimpf, Todorov; Apr 2023, revised Oct 2025) [working paper]. Futures carry reaches up to 60% p.a. and has averaged above 10% p.a. Interest-rate differentials explain little of it. Convenience yield drives most of it, from trend-chasing smaller investors seeking leveraged upside plus scarce arbitrage capital. **High carry predicts future price crashes**, and rising carry coincides with a rising price of crash insurance. Margins spike and arbitrage positions are liquidated in drawdowns, which links leverage to frequent severe crashes. — [BIS WP 1087](https://bis.org/publ/work1087.htm); [RePEc listing](https://ideas.repec.org/p/bis/biswps/1087.html)
- "The Crypto Carry Trade" (Christin et al.), Binance data [working paper]: funding is typically positive (longs pay shorts), and funding drives the high mean return of the carry trade. This is evidence about **carry-trade returns**, not directional BTC prediction. — [Western Finance portal](https://westernfinance-portal.org/viewpaper?n=853216); [PDF](https://gerbil.life/papers/CarryTrade.v1.2.pdf)
- A 2026 Springer (Digital Finance) study of CEX–DEX funding-rate arbitrage as a basis trade finds net returns driven mainly by funding carry but "highly assumption-sensitive." — [Springer](https://link.springer.com/article/10.1007/s42521-026-00213-3)
- BitMEX funding vs BTC price (arXiv 1912.03270, 2019) [preprint]: finds funding rates are heteroskedastic (modelled with GARCH) and reports a Granger-causal relationship between funding and price. Single venue, old sample. — [arXiv](https://www.arxiv.org/abs/1912.03270)
- K33 Research (2024) [industry]: when the 30-day average perp funding turns negative, average subsequent returns are reported at 79%. The methodology was not verified and the number of independent episodes is small. — [The Block](https://www.theblock.co/post/315831/perp-signal-bitcoin-bottom-bullish-year-end-k33); [The Block, K33 pessimism note](https://www.theblock.co/post/314382/bitcoin-perpetual-futures-funding-rates-pessimism)
- **The Oct 10, 2025 deleveraging is a case study for OI and funding as crash-fragility gauges** [industry]:
  - Amberdata: BTC OI peaked at $54.7B before the collapse, and peak funding reached 29.9% APR. "Funding rates signaled danger for weeks." BTC liquidations were $2.3B in one day, 86% of them longs. Amberdata says liquidation intensity above ~5% of OI triggers cascades. — [Amberdata](https://blog.amberdata.io/leverage-liquidations-the-31b-deleveraging)
  - CoinDesk CCIX: total OI fell 27.5% (about $60B, to $158B), with the steepest part inside 25 minutes. — [CoinDesk Data](https://data.coindesk.com/blogs/how-ccix-performed-during-cryptos-largest-liquidation-event)
  - FTI Consulting: market makers widened spreads or withdrew, and there was no fraud or insolvency trigger. — [FTI](https://www.fticonsulting.com/insights/articles/crypto-crash-october-2025-leverage-met-liquidity)
  - Figures conflict across sources (total crypto vs BTC-only; ~$19B total liquidations). — [CCN](https://www.ccn.com/education/crypto/crypto-october-10-crash-anniversary-2026-liquidation-risk/); [CryptoSlate](https://cryptoslate.com/how-150-billion-was-liquidated-from-crypto-market-in-2025-driving-bitcoin-crash/)
- **Options / informed trading** [preprint]: regressions of BTC returns, realized vol and implied vol on lagged Deribit option volume support informed trading. Net buying pressure moves hourly Deribit IV. BTC "skew" is much flatter and more symmetric than the S&P 500's. — [arXiv 2109.02776](https://arxiv.org/pdf/2109.02776)
- A conference abstract (Rouxelin) reports that ATM call IV levels are positively related to BTC returns, consistent with lottery-like call demand in rallies. The smile is almost symmetric, implying low risk aversion. This is an abstract only. — [FGV abstract](https://eventos.fgv.br/sites/eventos.fgv.br/files/arquivos/u1314/abstract_florent_rouxelin.pdf)
- **Bitcoin VIX and variance risk premium**: Alexander & Imeraj, *Journal of Alternative Investments* 23(4) [peer-reviewed]. They build Deribit-based BTC implied-vol indices and study the VRP across maturities. — [Sussex repository](https://sro.sussex.ac.uk/id/eprint/91094/); [figshare](https://sussex.figshare.com/articles/journal_contribution/The_Bitcoin_VIX_its_variance_risk_premium/23306975)
- One study reports a 0.48 correlation between a BTC implied-vol index and historical vol: implied vol carries only partial information about future realized vol. — [arXiv 2109.15051](https://arxiv.org/pdf/2109.15051)
- Another paper compares historical, GARCH and implied vol and warns about thin options liquidity. — [arXiv 2401.02049](https://www.arxiv.org/pdf/2401.02049)
- Industry commentary on term structure: the Deribit 30d/7d IV ratio was below 1.0 (inverted) on 49% of trading days year-to-date. Anchorage gives no return-forecast test. — [Anchorage Digital](https://www.anchorage.com/research/the-anchorage-digital-prime-signal-what-skew-wings-and-the-term-structure-are-telling-us-about-bitcoin-and-its-adjacent-markets)
- Kaiko reports tail-risk pricing divergence between IBIT options and Deribit, so the "skew" reading now depends on venue. — [Kaiko](https://www.kaiko.com/news/kaiko-research-highlights-tail-risk-divergence-between-ibit-and-deribit-options)
- DVOL is Deribit's 30-day forward implied-vol index derived from BTC options. — [Newhedge DVOL page](https://newhedge.io/bitcoin/dvol-deribit-implied-volatility-index)
- Coin Metrics defines the "predicted funding rate" as a real-time estimate of the current interval's funding. — [Coin Metrics docs](https://docs.coinmetrics.io/market-data/market-data-overview/market-funding-rates-predicted)

### Inferences
- Treat basis, funding and OI as **regime and fragility indicators**: high carry, high funding and record OI raise the conditional probability and size of drawdowns. They are weak as return-timing signals. This is consistent across the BIS paper and the Oct-2025 case.
- Implied vol (DVOL) is the natural ex-ante volatility forecast, and the VRP is usually positive, so IV tends to overstate realized vol. Direction signals from skew are weaker in BTC than in equities.
- Since 2024, BTC options activity is split between Deribit, CME and IBIT options. A single-venue skew or put/call ratio is less representative than before.

### Gaps
- No peer-reviewed out-of-sample test found for 25-delta skew, put/call ratio, or **max pain** (max pain appears to be purely practitioner folklore; no rigorous source found).
- No formal paper found testing DVOL vs realized-vol forecast accuracy (e.g. Mincer–Zarnowitz regression on DVOL specifically).
- I did not obtain the full BIS PDF, so the sample period, horizons and coefficients are unverified.
- CME vs offshore basis divergence evidence was not located in this session.

## Flows: spot ETF flows, Coinbase premium, exchange netflows, stablecoin supply

### Takeaway
For US spot ETFs (Jan 2024 onward), the best-documented pattern is **flows follow price (trend-chasing)**. One small Granger test claims a weak flows→price lead, and a peer-reviewed levels regression with R² of 95% is very likely spurious (non-stationary levels). Intraday **USDT exchange inflows predict BTC returns positively** in one 2017–2023 study. Evidence on stablecoin issuance causing price is mixed. Evidence on the Coinbase premium is anecdotal.

### Cited Findings
- **DWF Labs** (694 trading days since Jan 2024) [industry, seen via news coverage]: daily ETF flows correlate 0.54 with the prior 5-day return and 0.03 with the next 5-day return. After moves of at least 15%, there were outflows in 7 of 8 drops and inflows in all 9 rallies. "ETF flows confirm moves; they don't predict them." Some flows are basis trades hedged with CME shorts. — [Cointelegraph](https://cointelegraph.com/news/bitcoin-etf-flows-follow-price-trends-dwf-labs); [Crypto Briefing](https://cryptobriefing.com/dwf-labs-bitcoin-etf-flows-follow-trends/)
- **FalconX** (Jan–Oct 2024, daily) [industry]: Granger test of flows→price gives F=8.48, p=0.004. VAR coefficient on yesterday's flows is 0.027, with an impulse response peaking around 1.2% on days 3–4. The 7-day flow/price correlation is 0.30 (<10% of variance). The 60-day rolling correlation ranges 0.10–0.50. Authors flag the short sample, non-stationarity and nonlinearity. The price→flows direction was not reported. — [FalconX](https://www.falconx.io/newsroom/what-can-spot-etf-flows-tell-us-about-the-trajectory-of-bitcoin-prices-a-preliminary-statistical-investigation)
- Mazur & Polyzos, *Journal of Alternative Investments* (2025) [peer-reviewed]: net ETF flows are a strong positive predictor of BTC price **levels** (R² 95%). — [ZU Scholars](https://zuscholars.zu.ac.ae/works/7267)
- Guliyev & Ahmadova, *Ledger* (2025), data 11 Jan 2024 – 16 May 2025 [peer-reviewed]: cointegration between ETF AUM and BTC price. — [Ledger](https://ledger.pitt.edu/ojs/ledger/article/view/393)
- Kaiko questioned the assumption that ETFs are the main BTC price driver. The page now sits behind a login, so its content was not verified. — [Kaiko](https://research.kaiko.com/insights/is-wall-street-driving-btc-prices)
- "Ponzi Funds" (arXiv 2405.12768): general ETF flow–performance work showing flows are driven predominantly by the most recent returns. It is not BTC-specific. — [arXiv](https://arxiv.org/pdf/2405.12768)
- **Exchange on-chain flows**: Chi, Chu & Hao, "Return and Volatility Forecasting Using On-Chain Flows in Cryptocurrency Markets," 2017–2023 [preprint]. USDT net inflows to exchanges positively predict BTC returns at several 1–6h intervals and negatively predict 6h volatility. BTC net inflows mostly do **not** predict BTC returns (except at 4h) but are negatively associated with intraday vol. No out-of-sample metrics are reported in the abstract. — [arXiv 2411.06327](https://arxiv.org/abs/2411.06327)
- **Stablecoins**:
  - Large ($1M+) stablecoin transfers (1,587 events) show significant abnormal volume and returns around transfers. — [Technological Forecasting & Social Change](https://www.sciencedirect.com/science/article/abs/pii/S0040162521002833); [BRL working paper](https://www.blockchainresearchlab.org/wp-content/uploads/2020/05/BRL-Working-Paper-15-v2.pdf)
  - The literature is split. Griffin & Shams argue Tether issuance was used to support prices. Wei finds no causal impact of Tether issuance on BTC returns (Granger/VAR, daily). Issuance is often reactive to price. — [arXiv 2507.13883 review](https://arxiv.org/html/2507.13883)
  - A vendor claim that "+10% stablecoin supply leads to +20–40% BTC in 2–4 weeks" has no academic backing [vendor]. — [smartmoneyapi](https://smartmoneyapi.com/resources/analysis/stablecoin-market-report)
- **Coinbase premium**:
  - The closest academic analogue is an SMU working paper. Changes in the **Grayscale (GBTC) premium** are the most significant predictor of BTC daily return, strongest in high sentiment-variation and regulatory-news periods. This is not the Coinbase index itself. — [SMU](https://ink.library.smu.edu.sg/lkcsb_research/7447)
  - Coinbase-premium "bottom" calls rest on a handful of episodes (Nov 2022, Aug 2023) [commentary]. — [CoinDesk 2024](https://coindesk.com/markets/2024/07/01/bitcoins-bottom-in-price-could-be-near-or-already-in-the-coinbase-premium-index-suggests)

### Inferences
- ETF flows behave mainly as a lagging, pro-cyclical amplifier. Any next-day lead is small (about 1% impulse) and unstable. Levels regressions and cointegration (R² 95%) say little about forecastable returns.
- The flow signal with the most direct support is short-horizon (hours) stablecoin inflow to exchanges, a "dry powder" proxy. Its usefulness at daily or weekly horizons is untested in what I found.
- Exchange BTC netflows are ambiguous post-ETF because custody movements look like withdrawals (see next section).

### Gaps
- No peer-reviewed ETF-flow study with out-of-sample return prediction over 2024–2026 found. The DWF report itself was not read (news coverage only).
- No formal test of the Coinbase premium found.
- Farside data are the de facto public ETF flow source, but no Farside-based academic study was located.

## On-chain valuation and behaviour (MVRV, SOPR, NUPL, realized price, NVT, Puell, hash ribbons, LTH supply, CDD, Metcalfe)

### Takeaway
The evidence is overwhelmingly vendor and practitioner backtests on **3–4 cycles**, so threshold calibration is badly overfit. The one recent journal backtest (2026) favours the MVRV Z-score over NUPL and CVDD for trading rules. Careful practitioner re-tests find NVT's edge "disappears almost entirely" when done properly. Absolute thresholds have already failed in the ETF cycle: the MVRV-Z peak was ~3.35 vs historical 7–11.

### Cited Findings
- "Using on-chain data to predict Bitcoin cycles," *Research in International Business and Finance* (ScienceDirect, 2026) [peer-reviewed; full text 403]. It tests NUPL, MVRV Z-score and CVDD trading strategies. MVRV-Z is best on return and risk-adjusted measures, and all strategies beat buy-and-hold. This is a backtest of rules, not a formal out-of-sample forecast test. — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0275531926002138)
- A review preprint notes in-sample predictors often fail out-of-sample and that on-chain signal selection is regime-dependent. — [arXiv 2606.00071](https://arxiv.org/pdf/2606.00071)
- Coinpaprika re-test of NVT on 5,596 days: the low-NVT edge looked strong but "disappears almost entirely" when tested properly. The metrics are better as condition flags than as forecasting scores [practitioner]. — [Coinpaprika](https://coinpaprika.com/education/top-on-chain-metrics/)
- Coin Metrics (State of the Network #97):
  - SOPR was introduced by Renato Shirakashi in 2019. High SOPR has "historically" marked local maxima, and low SOPR has marked buy zones.
  - MVRV of ~3.0 marked local tops "during the current market cycle (at least so far)." This language is descriptive, not a forecast test [industry]. — [Coin Metrics SOTN 97](https://coinmetrics.substack.com/p/coin-metrics-state-of-the-network-094)
- **ETF-era threshold breakdown** (ArkFlow, Aug 18, 2026) [practitioner]:
  - MVRV-Z cycle peaks were 10.7 (2013), 10.1 (2017) and 7.2 (2021). This cycle peaked at 3.35 in Dec 2024, even though BTC later hit about $126k in Oct 2025, so "Z>6 = top" never fired.
  - Fear & Greed hit 10 on Feb 5, 2026, with BTC below $61k, while institutional inflows continued.
  - The author flags the single-cycle fragility. — [ArkFlow](https://arkflow.substack.com/p/which-on-chain-metrics-still-work)
- **Metcalfe / active addresses**: no peer-reviewed test was found in this session. Practitioner fits (Peterson, Alabi, Kalichkin) show a loose long-run n² fit. Capriole warns that off-chain, exchange and batched activity depresses address counts and biases the model. — [Capriole](https://capriole.com/metcalfes-law-says-bitcoin-is-overvalued); [Quantpedia](https://quantpedia.com/metcalfes-law-in-bitcoin/); [BIT](https://www.bit.com/insights/knowledge-hub/metcalfes-law)
- ML papers use MVRV and NUPL as features but do not report their individual contribution. — [arXiv 2608.26174](https://arxiv.org/pdf/2608.26174)

### Inferences
- With only about 4 halving cycles, each "top" or "bottom" threshold is fit on 3–4 data points, and in-sample hit rates should be heavily discounted. Cost-basis metrics (realized price, MVRV) are at least economically interpretable (aggregate holder P&L) and have the strongest backtest support. Activity metrics (NVT, active addresses, Metcalfe) are the most damaged by off-chain and custodial activity.
- If used at all, use them as slow-moving regime filters with **relative or rolling-percentile thresholds** rather than fixed historical levels.

### Gaps
- No peer-reviewed tests found specifically for **Puell multiple, hash ribbons / miner capitulation, dormancy/CDD, or LTH supply**. Their evidence base appears to be vendor charts (Glassnode, Capriole, LookIntoBitcoin) with a handful of episodes.
- No paper found quantifying the decline in on-chain predictive power before and after ETFs.

## How signals behaved since spot ETFs (2024–2026); is on-chain less informative?

### Takeaway
Practitioner consensus, though not peer-reviewed, is yes for exchange-balance and activity metrics, and partially for cost-basis metrics. ETF custodians hold large BTC balances outside "exchange reserve" definitions. Custody shuffles look like whale accumulation. Even vendor ETF wallet maps get revised. New ETF-native levels such as the "ETF cost basis" (~$80–82k) have become widely watched.

### Cited Findings
- ETF custodian holdings do not appear in standard exchange-reserve metrics. Exchange balances, CDD, NVT and active addresses have weakened as standalone signals, while realized cap and MVRV remain more useful [commentary]. — [cryptoaimeta](https://cryptoaimeta.com/crypto/bitcoin-etfs-are-rewriting-on-chain-signals-which-metrics-still-work/); [KuCoin news summary](https://www.kucoin.com/news/flash/foreign-media-etfs-are-undermining-the-relevance-of-on-chain-metrics)
- **Coin Metrics revised 19 months of its ETF on-chain wallet data (Sep 2026).** Its ETF series are on-chain estimates from address attribution, not official fund flows. — [Crypto Daily](https://cryptodaily.co.uk/2026/09/coin-metrics-bitcoin-etf-wallet-data-revision); [Pluang](https://pluang.com/en/news-feed/coin-metrics-perbarui-data-bitcoin-etf-19-bulan)
- Exchange reserves fell to about 8.3% of supply from 12.8% in 2020, but rose about 500k BTC from Jan to late Feb 2026. A 32k BTC single-day withdrawal (Mar 7, 2026) is ambiguous between custody activity and accumulation. The ETF cost-basis floor is about $80k (Amberdata, 11 ETFs, >$127B). — [ArkFlow](https://arkflow.substack.com/p/which-on-chain-metrics-still-work)
- Glassnode treats the US spot ETF cost basis (~$81.5k) as key support and compares custody-band changes to ETF creations "in scale, not coin for coin." — [Glassnode on X](https://x.com/glassnode/status/2110398599163167117); [Glassnode Week On-chain 34/2026](https://research.glassnode.com/the-week-onchain-week-34-2026/)
- Some ETF purchases are hedged CME basis trades, so flows partly reflect arbitrage rather than directional demand. — [Cointelegraph/DWF](https://cointelegraph.com/news/bitcoin-etf-flows-follow-price-trends-dwf-labs)

### Inferences
- The informational centre of gravity has shifted toward TradFi-observable data: ETF creations and redemptions, CME basis and OI, and IBIT options. Pure on-chain balances matter less. Derivatives context is needed to separate basis-trade flows from directional flows.

### Gaps
- No academic study yet quantifies the degradation. All evidence here is practitioner or vendor, and much of it is from 2026.

## Data sources: free/keyless vs paid; geo-restrictions

### Takeaway
Free and keyless sources cover most needs: Coin Metrics Community (non-commercial, with limited derivatives history), Deribit public API (DVOL, options), exchange public futures endpoints (funding, OI), mempool.space and blockchain.info (raw chain stats), alternative.me (Fear & Greed), and Farside (ETF flows). Glassnode and CryptoQuant gate most entity-adjusted metrics (MVRV-Z, SOPR, LTH supply, exchange flows) behind paid tiers. **Binance blocks restricted jurisdictions, including US IPs and many US cloud datacenters, even for public market data (HTTP 451).**

### Cited Findings
- **Coin Metrics Community API**:
  - Keyless via `community-api.coinmetrics.io`, CC licence, non-commercial use only.
  - Rate limit: 10 requests per 6 s per IP. No websocket.
  - Derivatives (OI, funding, liquidations, trades, books) cover only the past 24h. Daily candles have full history.
  - Coin Metrics was acquired by Talos. — [Coin Metrics API basics](https://gitbook-docs.coinmetrics.io/access-our-data/api); [Community data](https://docs.coinmetrics.io/packages/coin-metrics-community-data); [Getting started](https://docs.coinmetrics.io/getting-started)
- **Binance**: since end-2022, Binance restricts API access from restricted locations "even for public market data." Developers on US cloud hosts (e.g. Vercel) report 451 errors. A static-IP proxy does not fix geography. — [CryptoDataDownload](https://www.cryptodatadownload.com/blog/posts/binance-download-data-python-usa-residents/); [Vercel community](https://community.vercel.com/t/binance-api-calls-on-vercel/29895); [OutSystems forum](https://www.outsystems.com/forums/discussion/96638/unable-to-integrate-with-binance-mp-due-to-api-requests-blocked-from-us-servers/)
- CryptoQuant documents funding-rate metrics in its user guide; most of its series are tiered/paid. — [CryptoQuant user guide](https://userguide.cryptoquant.com/cryptoquant-metrics/market/funding-rates)
- Free chart sites (not APIs) for on-chain indicators: LookIntoBitcoin, bgeometrics (incl. Coinbase premium), Newhedge (DVOL). — [LookIntoBitcoin](https://www.lookintobitcoin.com/charts/on-chain-charts/); [bgeometrics Coinbase premium](https://charts.bgeometrics.com/coinbase_premium.html); [Newhedge DVOL](https://newhedge.io/bitcoin/dvol-deribit-implied-volatility-index)

### Inferences
- For a keyless app (e.g. zencharts):
  - **Funding and OI:** OKX or Bybit public endpoints, or Binance where not geo-blocked.
  - **Options:** Deribit public API for DVOL and option chains.
  - **On-chain valuation:** Coin Metrics Community daily metrics (e.g. market cap, realized-cap-type series where included in the community set).
  - **Mempool and fees:** mempool.space.
  - **Sentiment:** alternative.me Fear & Greed.
  - **ETF flows:** Farside (scrape).
- Expect Bybit and OKX to have their own jurisdiction rules as well.

### Gaps
- Not verified in this session (no fetch made):
  - Exact keyless status and rate limits of the Deribit public API (`docs.deribit.com`), mempool.space API, blockchain.info API, alternative.me Fear & Greed API (`api.alternative.me/fng/`), and OKX and Bybit public futures endpoints.
  - Bybit and OKX US-IP policies.
  - Which specific metrics (e.g. CapRealUSD, SOPR) are in the Coin Metrics Community metric set.
  - Glassnode tier pricing.
- No official Binance statement located; the restriction evidence is developer reports.

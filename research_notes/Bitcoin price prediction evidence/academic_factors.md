# Bitcoin Return Predictability: Academic and Empirical Evidence by Factor

Notes compiled 2026-10-23. Labels: **[PR]** = peer-reviewed journal; **[WP]** = working paper or preprint (NBER/SSRN/arXiv/Zenodo); **[PRAC]** = practitioner, blog or marketing claim. "IS" = in-sample, "OOS" = out-of-sample. I verified only abstracts or summaries, not full texts, unless I say otherwise. The exception is Liu & Tsyvinski (NBER w24877), where I read the PDF text.

## Time-series momentum and trend-following

### Takeaway
BTC shows short-horizon time-series momentum: daily returns predict the next 1 to 6 days, and weekly returns predict the next 1 to 4 weeks. Price-to-moving-average rules also predict daily returns, both IS and OOS. All of the canonical evidence uses data ending 2016–2018. Later work disagrees on whether the effect weakened after BTC futures launched in December 2017, and no peer-reviewed post-2020 BTC-only replication turned up.

### Cited Findings
- **Liu & Tsyvinski, "Risks and Returns of Cryptocurrency"** [PR, *Review of Financial Studies* 34(6), 2021, pp. 2689–2727; NBER w24877, Aug 2018]. BTC sample is 2011-01-01 to 2018-05-31 (CoinDesk). — [RePEc](https://ideas.repec.org/a/oup/rfinst/v34y2021i6p2689-2727..html); [NBER](https://nber.org/papers/w24877)
  - Daily: a 1-SD rise in today's return (SD = 5.55%) predicts higher daily returns of +0.33% at 1 day, +0.17% at 3 days, +0.39% at 5 days and +0.50% at 6 days ahead. — [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)
  - Weekly: a 1-SD rise in this week's return (SD = 16.64%) predicts +3.16%, +3.66%, +3.49% and +1.50% at 1 to 4 weeks ahead. In quintile sorts the top quintile earns 11.22%/week (Sharpe 0.45) against 2.60%/week (Sharpe 0.19) for the bottom quintile at 1 week. — [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)
  - The effect is smaller but still significant from 2013 onward. A "no-lookahead" test, which sets quintile cutoffs on the first two years of data, still finds strong momentum. This is a weak form of OOS testing, not a rolling forecast evaluation. — [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)
  - Crypto returns have no exposure to most stock-market and macro factors, or to currency and commodity returns. — [NBER abstract](https://nber.org/papers/w24877)
- **Liu, Tsyvinski & Wu, "Common Risk Factors in Cryptocurrency"** [PR, *Journal of Finance* 77, 2022, pp. 1133–1177, DOI 10.1111/jofi.13119]. This is a **cross-sectional** paper. Market, size and momentum factors explain the cross-section of coin returns, and the 9 or 10 profitable strategy characteristics (versions differ) are subsumed by the 3-factor model. It does not test BTC timing directly. — [SSRN](https://papers.ssrn.com/abstract=3379131); [NBER w25882](https://www.nber.org/papers/w25882.pdf); [SUFE listing](https://academicnewsletter.sufe.edu.cn/info/359095)
- **Cheah, Luo, Zhang & Sung, "Predictability of bitcoin returns"** [PR, *European Journal of Finance* 28(1), 2022, pp. 66–85, DOI 10.1080/1351847X.2020.1835685]. Time-series momentum, economic policy uncertainty and financial uncertainty beat the other popular predictors in IS, OOS and asset-allocation tests. BTC has no exposure to common stock and bond factors. The abstract does not give the full predictor list or the sample period, because the full text is paywalled. — [RePEc](https://ideas.repec.org/a/taf/eurjfi/v28y2022i1p66-85.html)
- **Detzel, Liu, Strauss, Zhou & Zhu, "Learning and predictability via technical analysis: Evidence from bitcoin and stocks with hard-to-value fundamentals"** [PR, *Financial Management* 50(1), 2021, pp. 107–137]. Price-to-MA ratios over 5 to 100 days predict daily BTC returns IS and OOS. MA strategies give "economically significant" alpha and Sharpe gains over buy-and-hold. An equilibrium model explains technical analysis as rational learning when fundamentals are hard to value. The working-paper version from January 2018 was titled "Bitcoin: Predictability and Profitability via Technical Analysis". — [RePEc](https://ideas.repec.org/a/bla/finmgt/v50y2021i1p107-137.html); [CXO summary](https://www.cxoadvisory.com/currency-trading/timing-bitcoin-with-smas/)
- **Hong (2017)**: BTC TSMOM persists for about 1 to 8 weeks and then partly reverses at longer horizons, which the author attributes to sentiment-driven under- and over-reaction. I did not confirm the journal; the summary points to the DOI linked here. — [DOI 10.1007/s10799-016-0264-6](https://www.doi.org/10.1007/s10799-016-0264-6)
- **Decay after futures**: a Rotterdam seminar abstract covers 3,100+ coins from April 2013 to August 2018. It finds strong TSMOM from 1 day to 1 month that "seems to have disappeared after the introduction of bitcoin futures" [WP]. — [Tinbergen seminar page](https://utilities.tinbergen.nl/?p=66235)
- **Grobys & Sapkota (2019, *Economics Letters*)** [PR] find no significant **cross-sectional** momentum payoffs across 143 coins from 2014 to 2018. — summarised via [search of seminar/thesis results](https://utilities.tinbergen.nl/?p=66235). I did not open the primary page, so the citation needs checking.
- **Post-2020**: a Vilnius-journal working paper using EMA signals on 8 large coins from 2020 to October 2025 says momentum "remain[s] economically meaningful" [WP, unreviewed]. — [journals.vu.lt PDF](https://www.journals.vu.lt/BATP/lt/article/download/44540/42590/138419)
- **Indicator decay**: Molnar (arXiv 2607.26188, July 2026) [WP] argues that popular BTC cycle and price indicators (Pi Cycle, MVRV, Mayer, Puell) worked for about a decade and then degraded. Short-horizon indicators decay toward zero and some flip sign. — [arXiv](https://arxiv.org/abs/2607.26188)

### Inferences
- The published magnitudes are large, but they come from a 2011–2018 sample dominated by the 2013 and 2017 bubbles. The weekly quintile spreads would be expected to shrink as institutional participation grows. The futures-launch result and Molnar's indicator-decay result both point toward decay, so practitioners should treat the 2018-era effect sizes as upper bounds.
- The predictability with the strongest OOS evidence is MA or trend timing (Detzel et al.; Cheah et al.). In practice it mainly cuts drawdowns rather than adding raw return.

### Gaps
- I did not find a peer-reviewed BTC-only TSMOM or MA study with a sample ending after 2022, or one that explicitly tests the post-publication decay of Liu-Tsyvinski or Detzel et al.
- I did not verify the "Cheah et al. 2022" sample period, effect sizes or full predictor list (paywalled).

## Short-horizon reversal, day-of-week and intraday seasonality, volatility-managed returns

### Takeaway
The day-of-week evidence for BTC conflicts and is economically weak. Volatility has a more consistent weekly pattern than returns. I found no strong BTC-specific evidence for short-term (daily) reversal. Volatility management is documented mainly for cross-sectional crypto momentum, where it reduces crashes, not for BTC alone.

### Cited Findings
- **Caporale & Plastun (2018, *Finance Research Letters*)** [PR]: Monday returns are significantly higher for BTC, the only coin of those studied with this anomaly. Trading simulations are "mostly not significantly different from random", so the authors draw no strong inefficiency conclusion. — [Brunel repository](https://bura.brunel.ac.uk/handle/2438/17208)
- **Aharon & Qadan (2019, FRL vol. 31)** [PR]: using 2010–2017 data, they find day-of-week effects in both BTC returns and volatility (OLS and GARCH). — [Haifa CRIS](https://cris.haifa.ac.il/en/publications/bitcoin-and-the-day-of-the-week-effect/)
- **Kinateder & Papavassiliou (FRL vol. 38)** [PR]: find **no** classic day-of-week return effect. Weekend risk is lower and volatility is higher early in the week, with some evidence of a reverse January effect. — [UCD repository](https://researchrepository.ucd.ie/entities/publication/ea776b97-3521-4fce-8a02-c5a9939b5563)
- Liu & Tsyvinski's daily coefficients are positive at 1 day, which is continuation, not reversal. The 1-day effect is +0.33% per 1-SD move, and the coefficient is about 0.06. — [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf)
- **Grobys, Kolari, Sandretto, Shahzad & Äijö (2025, *Financial Markets and Portfolio Management*)** [PR]: crypto momentum strategies suffer severe crashes, and volatility-managed momentum reduces them. This is cross-sectional across large caps, not BTC timing. — [UWasa repository](https://osuva.uwasa.fi/server/api/core/bitstreams/994474fd-8d6c-4669-9f43-98836145cad6/content)

### Inferences
- Day-of-week effects are unstable across samples and fail random-simulation benchmarks, so they are not an actionable predictor.

### Gaps
- I found no peer-reviewed intraday or time-of-day BTC return-seasonality study with OOS tests in this session.
- I found no study of volatility-managed BTC-only buy-and-hold in the Moreira-Muir sense.

## Investor attention and sentiment

### Takeaway
Attention measures (Google searches, Twitter counts) predicted 1 to 2 week BTC returns in pre-2018 samples. Other studies find causality runs mostly from price to attention, or both ways, and that the link is contemporaneous. Fear and Greed Index evidence is thin: short samples, mostly IS Granger tests, and it is partly built from price, so it carries a momentum component.

### Cited Findings
- **Liu & Tsyvinski (RFS 2021)** [PR], 2011–2018. Attention is the Google "Bitcoin" search deviation from its prior 4-week average. A 1-SD rise predicts +1.84% (1 week) and +2.30% (2 weeks) weekly returns. In quintile sorts the top quintile earns 11.20%/week (Sharpe 0.48) against 1.07% (Sharpe 0.08) for the bottom quintile. Results hold from 2013 and in a no-lookahead quintile test. A 1-SD rise in Twitter "Bitcoin" post counts predicts +2.50% at 1 week. They also find a rise in **negative** searches (e.g. "Bitcoin hack") predicts lower returns. — [NBER PDF](https://www.nber.org/system/files/working_papers/w24877/w24877.pdf); [causal-claims summary](https://causalclaims.trfetzer.com/paper/w24877.html)
- **Kristoufek (2013, *Scientific Reports*)** [PR]: an early study linking Google Trends and Wikipedia views to BTC prices, with a positive and bidirectional relationship. It was an early-market sample, and I could not verify OOS testing. — [ProQuest preview](https://proquest.com/scholarly-journals/bitcoin-meets-google-trends-wikipedia-quantifying/docview/1898094865/se-2); [Altmetric](https://www.altmetric.com/details/1954128)
- **Dastgir et al. (2019, FRL)** [PR], 2013–2017: a copula Granger-in-distribution test finds **bidirectional** causality between Google attention and BTC returns, except in the center of the distribution, so the effect lives in the tails. — [Teesside](https://research.tees.ac.uk/en/publications/the-causal-relationship-between-bitcoin-attention-and-bitcoin-ret/)
- **Ciaian et al. (CESifo WP 7675)** [WP]: Google queries are cointegrated with BTC but "not helpful in predicting" the BTC/USD rate. Baidu queries help at some frequencies. — [CESifo PDF](https://www.cesifo.org/DocDL/cesifo1_wp7675.pdf)
- A Berkeley thesis (Soldevilla, 2017) finds weekly BTC price Granger-causes "Blockchain" searches at 10%, with no reverse causality [non-peer-reviewed]. — [Berkeley PDF](https://econ.berkeley.edu/sites/default/files/Thesis_Julio_Soldevilla.pdf)
- **Fear and Greed Index**:
  - *Review of Behavioral Finance* paper (weekly, July 2022 to June 2023): the FGI linearly Granger-predicts BTC and ETH returns, with no nonlinear causality [PR, about one year of data, IS]. — [Emerald](https://www.emerald.com/insight/content/doi/10.1108/RBF-08-2023-0224/full/html)
  - Virtus Interpress paper (monthly, 2016–2021, ARDL/ECM): positive long- and short-run FGI–return link, robust to macro controls. This is a levels relationship and may be contemporaneous [PR, lower-tier venue]. — [Virtus](https://virtusinterpress.org/How-does-the-Bitcoin-Sentiment-Index-of-Fear-Greed-affect-Bitcoin-returns.html)
  - Springer chapter (20 coins, daily 2018–2021): contrarian FGI strategies may beat buy-and-hold [PR chapter, IS]. — [RePEc](https://ideas.repec.org/h/spr/eurchp/978-3-031-36286-6_16.html)
  - Practitioner counter-evidence: after 7-day streaks, the average 90-day forward BTC return was about +5% after "Extreme Fear" and about +149% after "Extreme Greed", which reads as momentum, not contrarian [PRAC, not verified]. — [MEXC News](https://www.mexc.com/news/1197268)
  - About half the FGI's inputs are derived from price, which creates a feedback loop, and it lags [PRAC]. — [Spark glossary](https://www.spark.money/glossary/fear-greed-index)

### Inferences
- Attention looks like amplified momentum. Searches spike with price, and the predictive content at 1 to 2 weeks overlaps the TSMOM signal. No source I found shows attention adding OOS value **after** controlling for past returns in post-2018 data.
- "Buy extreme fear" is not well supported. If anything, FGI extremes behave like a momentum indicator because of the price inputs.

### Gaps
- I found no rigorous post-2020 OOS test of Google Trends or Twitter/X volume for BTC. Google Trends normalization and resampling also make real-time replication hard (not sourced here).
- I did not assess news or NLP sentiment studies (e.g. LLM-based) in this session.

## Macro factors (EPU, USD/DXY, equities, real rates, liquidity/M2, inflation)

### Takeaway
Only uncertainty indices (EPU and financial uncertainty) have peer-reviewed OOS support (Cheah et al. 2022). Early studies (data to 2018) found **no** exposure to stock, bond, FX or commodity factors. I found no peer-reviewed OOS evidence that DXY, real rates, M2 or "global liquidity" forecast BTC returns. Molnar (2026, preprint) reports that M2 and yield-curve signals are unstable.

### Cited Findings
- Cheah et al. (EJF 2022) [PR]: EPU and financial uncertainty are among the three best predictors IS and OOS, and BTC has no exposure to stock and bond factors. — [RePEc](https://ideas.repec.org/a/taf/eurjfi/v28y2022i1p66-85.html)
- Liu & Tsyvinski (RFS 2021) [PR]: no exposure to most stock-market and macro factors, or to currency and commodity returns (data to 2018). — [NBER](https://nber.org/papers/w24877)
- Wang, Ngene, Shi & Mungai (JRFM 2023) [PR, MDPI]: random forests over 13 uncertainty indices. Singapore EPU is the strongest predictor, followed by financial-crisis and world-trade uncertainty. These are ML variable-importance results, so the economic size is unclear. — [NJIT](https://digitalcommons.njit.edu/fac_pubs/1415)
- *Journal of Risk*: only weak evidence that trade-war uncertainty forecasts BTC returns (OLS, SVR, LASSO), and the authors conclude future returns are unaffected. — [Risk.net](https://www.risk.net/node/7796966)
- Fang, Bouri, Gupta & Roubaud (2019) [PR]: global policy uncertainty affects BTC **correlations** with bonds (negative) and with equities and commodities (positive). This is about volatility and hedging, not returns. — [UP repository PDF](https://repository.up.ac.za/bitstream/2263/68172/1/Fang_Does_2019.pdf)
- Huynh, Wang & Vo (*Singapore Economic Review*, 2025): global EPU negatively causes BTC volume and volatility. — [EBSCO/search summary](https://www.ebsco.com/articles/business-and-management/25bedb57-b381-51a0-bedd-c6745e46cd49/economic-policy-uncertainty-and-the-bitcoin-market-an-investigation-in-the-covid-19-pandemic-with-transfer-entropy). The attribution is not fully verified.
- Molnar (arXiv 2026) [WP]: "macro drivers (M2, yield curve) show similar instability and lose a joint comparison" against a time-based power-law signal. — [arXiv](https://arxiv.org/abs/2607.26188)
- Equity correlation regime: IMF staff found that crypto–equity correlations rose sharply after 2020. This describes co-movement, not prediction. — [IMF blog, Jan 2022](https://www.imf.org/en/Blogs/Articles/2022/01/11/crypto-prices-move-more-in-sync-with-stocks-posing-new-risks). I cited this from prior knowledge and did not re-fetch it in this session.

### Inferences
- The "no macro exposure" findings come from pre-2020 samples. Since 2020, BTC co-moves contemporaneously with Nasdaq and risk assets. Contemporaneous beta is not predictability, and no OOS forecasting gain from equities, DXY, rates or M2 surfaced.
- "Global liquidity leads BTC by X weeks" claims appear to be practitioner charts without published OOS tests. No academic source surfaced.

### Gaps
- I found no peer-reviewed OOS study of M2, global liquidity, DXY, real yields or CPI surprises as BTC return predictors.

## Halving and four-year cycles

### Takeaway
The halving cycle rests on three or four observations. Formal work finds that post-halving returns and abnormal-return effects shrink over time, and that top timing has some regularity whose significance depends on how the null model is built. The 2024–2026 cycle departs from the pattern: 2025 was reportedly the first post-halving year to close down. With n of about 3 to 4, no cycle claim is statistically robust.

### Cited Findings
- Veloso et al. (JRFM 2025, vol. 18(5), 242) [PR, MDPI]: event-study abnormal returns around halvings, higher in 2020 and 2024. They conclude returns and volatility around halvings are **decreasing** as the market institutionalizes. — [RePEc](https://ideas.repec.org/a/gam/jjrfmx/v18y2025i5p242-d1647669.html)
- Molnar (arXiv 2607.26188, 28 July 2026) [WP]:
  - Mature-cycle tops came 525, 546 and 534 days after halvings, and bottoms came 406, 364 and 366 days after tops.
  - Under block-bootstrap nulls the top cluster occurs in 0 of 10,000 paths, but the bottom cluster occurs in 31–43%, so bottom timing is largely a generic drawdown property.
  - A rotation-null HAC test over-rejects (size 0.33 at a nominal 0.05), and its p-value of 0.21 is not relied on.
  - The author calls the holdout cycle "suggestive not decisive" and pre-registers a 2026 bottom window of Oct 5 to Nov 16.
  - [arXiv](https://arxiv.org/abs/2607.26188)
- FABA (2025, UNWE Bulgaria): a halving-based multi-indicator strategy beats passive holding in 10 of 13 overlapping windows. This is an in-sample backtest. — [UNWE PDF](https://www.unwe.bg/doi/FABA/2025.2/FABA.2025.2.10.pdf)
- Practitioner cycle tables put the 2012 cycle at about 95x (367 days to peak) and the 2016 cycle at about 30x (526 days to peak), with multiples compressing each cycle [PRAC]. — [Lambda Finance](https://www.lambdafin.com/articles/bitcoin-returns-by-halving-cycle); [QuantJourney](https://quantjourney.substack.com/p/bitcoin-cycles-a-quantitative-analysis)
- A practitioner says BTC closed 2025 about 6% below its January open, the first post-halving year in the red [PRAC, I did not verify the price data]. — [Scenarica Substack](https://scenarica.substack.com/p/the-broken-clock)

### Inferences
- The halving falls at a deterministic date every about 210,000 blocks, so any four-year pattern in four bubbles will look striking ex post. With three mature cycles, almost any timing rule can be fit. Molnar's own nulls show the bottom pattern arises by chance in about a third of simulated paths.
- Molnar's pre-registered October to November 2026 bottom window is a live OOS test running as of today (2026-10-23). Someone should check it after 16 November 2026.

### Gaps
- I did not verify the official end-2025 and October 2026 BTC prices from a primary data source in this session.

## Stock-to-flow (PlanB) model

### Takeaway
S2F regresses log market value on log stock-to-flow, a deterministic supply schedule. It shares supply terms on both sides, regresses two trending series, and leaves out demand. Critics argued it is spurious, and its point forecasts have failed: about $100k by the end of 2021 missed, it broke its lower band in June 2022, and BTC traded far below the about $500k cycle-average target in 2025–2026. I found no peer-reviewed paper that validates it.

### Cited Findings
- The original model, "Modeling Bitcoin Value with Scarcity" (PlanB, Medium, March 2019), fits market value = a·SF^b. It predicted about $1T market value, or about $55,000 per BTC, after the May 2020 halving [PRAC]. — [CryptoSlate](https://cryptoslate.com/could-bitcoins-halving-push-its-price-to-55000-one-quant-thinks-so/); [Bitcoinist](https://bitcoinist.com/bitcoin-price-prediction-55000-2020-halving/amp/)
- The S2FX "cross-asset" revision (2020) implied about $288,000 for the 2020–2024 epoch [PRAC]. — [CryptoSlate](https://cryptoslate.com/after-halving-bitcoin-could-rally-3500-to-288k-understanding-planbs-perfect-fit-analysis/)
- PlanB's "worst case" path (about $98k in November and $135k in December 2021) failed when BTC closed 2021 below $100k. — [FXStreet](https://www.fxstreet.com/cryptocurrencies/news/bitcoin-stock-to-flow-model-invalidated-as-btc-closes-2021-below-100-000-202201010939); [Forklog](https://forklog.com/en/stock-to-flow-model-author-concedes-failure-of-the-worst-case-scenario-for-bitcoin/)
- BTC fell to about $17,600 on 18 June 2022, breaching the S2F lower bound for the first time. — [FXStreet](https://www.fxstreet.com/cryptocurrencies/news/bitcoin-stock-to-flow-model-invalidated-as-btc-closes-2021-below-100-000-202201010939) / [Cointelegraph op-ed](https://cointelegraph.com/opinion/three-reasons-why-planb-s-stock-to-flow-model-is-not-reliable)
- Vitalik Buterin criticized the model for giving a false sense of certainty (June 2022). — [FXStreet](https://www.fxstreet.com/cryptocurrencies/news/vitalik-buterin-believes-bitcoin-stock-to-flow-model-is-false-for-this-reason-202206211146)
- **Econometric critiques**, all [PRAC]: no peer-reviewed critique was located.
  - Nick Emblow and Eric Wall argued that market cap = price × supply and S2F = supply/flow put supply on both sides, which inflates R². Circulating supply alone correlates about as well. — [Spark S2F tracker](https://www.spark.money/tools/bitcoin-stock-to-flow-tracker)
  - Regressing two trending series without detrending gives spurious fits. — [Bitcoin Magazine](https://bitcoinmagazine.com/markets/why-bitcoin-stock-to-flow-is-not-useful); [Yahoo Finance](https://it.finance.yahoo.com/news/why-stock-flow-bitcoin-valuation-133609944.html)
  - Defenders, including PlanB, stressed that the cointegration tests (Engle-Granger) were "even more important than the fit". Critics' later tests with more data disputed this, and a Bitcoin Magazine piece argues that the absence of cointegration does not by itself rule out causation. — [Stephan Livera ep. 122](https://stephanlivera.com/episode/122/); [Bitcoin Magazine](https://bitcoinmagazine.com/markets/whats-up-with-bitcoin-stock-to-flow)
  - Fits run at different points before halvings give very different forecasts. — [Cointelegraph](https://cointelegraph.com/opinion/three-reasons-why-planb-s-stock-to-flow-model-is-not-reliable)
- **2024–2026 track record**: guides say S2F implied about $100k–$288k for the 2024–2025 cycle. One 2026 critique says the model's 2024–2028 epoch averages close to $500k, while BTC was about $64,339 on 19 August 2026, down about 43% year on year. The source is a [PRAC] blog, and I did not verify the price. — [hoge.gg](https://hoge.gg/bitcoin-stock-to-flow-model-critique-2026/); [CoinGecko](https://www.coingecko.com/learn/bitcoin-price-predictions-expert-forecasts); [softwaretestinghelp](https://www.softwaretestinghelp.com/bitcoin-stock-to-flow-model-guide/)
- Defenders still argue that underperformance against S2F preceded the 2013 and 2020 parabolic runs [PRAC]. — [Finbold](https://finbold.com/bitcoin-price-lags-stock-to-flow-as-260k-btc-prediction-holds-firm/)

### Inferences
- The model has had about 6.5 years of true OOS since March 2019. The 2020–2021 run came close to the $55k target (BTC peaked near $69k in November 2021; widely reported, not sourced here). After that the S2F-implied path diverged by multiples. Its 2024 halving step-up in implied value was not matched by price. This pattern fits the critique that the halving step-up is a deterministic supply term with no demand model.

### Gaps
- I could not locate a peer-reviewed cointegration or unit-root paper on S2F. The cointegration debate exists only in blog and Medium form, and I did not retrieve the original test statistics.
- I have no authoritative, dated S2F-vs-price reading for October 2026.

## Power-law (log price vs log time) model

### Takeaway
The model says BTC price ~ t^β with β ≈ 5.6–5.8, where t is days since genesis. Giovanni Santostasi popularized it from 2018 on Reddit, and Harold Christopher Burger published a "power-law corridor" in 2019. The best independent test is Baquero & Menezes (arXiv, May 2026). They find weak structural support: β swings by about 3x with the choice of time origin, and the power law cannot be distinguished from stacked sigmoids. Yet it beat ten baselines in walk-forward OOS forecasts at 12–24 month horizons (Diebold-Mariano p < 0.05). So it works as a long-horizon trend anchor, not as a law.

### Cited Findings
- **Origin**: Santostasi first presented the model on r/Bitcoin in 2018. Burger's 2019 article was "Bitcoin's natural long-term power-law corridor of growth". There are unverified claims that a BitcoinTalk user ("Trololo") noted it in 2014. — [Forklog](https://forklog.com/en/bitcoin-could-reach-10-6-million-by-2045-expert-predicts/); [AMBCrypto](https://ambcrypto.com/blog/bitcoin-power-law-what-it-is-and-why-it-matters/amp/); [Decrypt](https://decrypt.co/215807/the-bitcoin-power-law-a-mathematical-approach-to-predicting-bitcoins-price?amp=1)
- Santostasi & Perrenod's paper reports an exponent of about 5.7 explaining about 96% of long-run price variance. It reportedly appeared in Elsevier's *Nonlinear Science*, but I have not verified the journal. — [Bitcoin Treasuries opinion](https://bitcointreasuries.net/news/this-time-cant-be-different)
- **Baquero & Menezes, "Bitcoin's Power Law: Weak Structure, Strong Forecasts"** (arXiv 2605.21316, 20 May 2026) [WP]:
  - Clauset-Shalizi-Newman tests reject a power law for UTXO balances and daily |returns| (lognormal is preferred).
  - The time-domain β (about 5.7 over 2010–2026) shifts by nearly 3x depending on the time origin.
  - Residual diagnostics cannot separate the power law from a multi-sigmoid fit.
  - In walk-forward Diebold-Mariano tests against 10 candidates (RW with drift, auto-ARIMA, ETS, local-linear trend and others), the simple power law dominates at 12–24 month horizons (p < 0.05). The IS-best multi-sigmoid is among the worst long-horizon forecasters.
  - [arXiv](https://arxiv.org/abs/2605.21316)
- Molnar (arXiv 2026) [WP]: a causal power law in time since genesis (exponent about 5.6) is the most reliable signal, with a stable sign across epochs and a positive timing edge in the current cycle. It is replicated on a second data source and on ETH. — [arXiv](https://arxiv.org/abs/2607.26188)
- Critiques:
  - "The Rogue Protocol" (Zenodo preprint, May 2026) lists 9 methodological concerns with the Santostasi-Perrenod analysis and argues it does not establish a forward-binding constraint [WP, anonymous author]. — [Zenodo](https://zenodo.org/records/19975701)
  - Adrian Morris called it a "horoscope" and overfit [PRAC]. — [Cointelegraph](https://cointelegraph.com/news/bitcoin-power-law-debate-erupts-critics-call-it-a-magic-trick)

### Inferences
- The power law's OOS success is about the **level** over 1 to 2 years, i.e. mean reversion toward a slowly rising trend. Fitted with a free time origin, it adds degrees of freedom. A decelerating log-growth curve will also fit any maturing adoption asset. Its forecasts concern the price level, not short-horizon returns.
- Unlike S2F, the power law has no halving step-up, so it did not "break" in 2022–2026 in the same way. Its corridor is wide (roughly an order of magnitude), however, which makes it hard to falsify.

### Gaps
- I could not verify the Santostasi-Perrenod journal publication, or which of Santostasi and Burger came first.
- The walk-forward sample start for Baquero & Menezes is not stated on the abstract page.

## Efficient-market tests over time

### Takeaway
Early BTC (about 2010–2014) was weak-form inefficient. Several studies find efficiency improved after about 2014 under the adaptive-markets view, but results depend on the test and the transformation, and some find inefficiency persists. Predictability is time-varying, not monotonically disappearing.

### Cited Findings
- Urquhart (2016, *Economics Letters*) [PR]: BTC is inefficient over the full 2010–2016 sample, with some tests showing efficiency in the later subsample. — [Southampton eprint](https://eprints.soton.ac.uk/400597/1/Bitcoin_20efficiency_20R_26R.docx)
- Nadarajah & Chu (2017) [PR] reach "efficient" on the same data after a power transformation of returns. — via [arXiv 2208.07254 lit. review](https://arxiv.org/pdf/2208.07254)
- Bariviera (2017) [PR]: Hurst exponent on daily 2011–2017 data shows weak-form efficiency after 2014. Tiwari et al. (2018) find BTC efficient except in April to August 2013 and August to November 2016. Noda finds time-varying efficiency, with BTC usually more efficient than other coins. — via [arXiv 2208.07254](https://arxiv.org/pdf/2208.07254); [arXiv 2003.13517](https://arxiv.org/pdf/2003.13517)
- A later study reports BTC inefficiency "similar to levels observed five years earlier" despite its size. — via the same [arXiv 2208.07254](https://arxiv.org/pdf/2208.07254) search summary; not independently verified.
- Grobys & Sapkota (2019): no cross-sectional momentum payoffs from 2014 to 2018, which they read as more efficiency. Also see the futures-launch decay of TSMOM. — [Tinbergen seminar](https://utilities.tinbergen.nl/?p=66235)

### Inferences
- The weight of evidence is adaptive-markets: inefficiency clusters in bubble and crash episodes. Short-horizon autocorrelation was strongest pre-2018, which is also the sample of most headline predictability papers.

### Gaps
- I found no peer-reviewed efficiency study covering 2023–2026, i.e. the post-ETF period after January 2024.

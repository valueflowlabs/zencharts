# ML/statistical forecasting of Bitcoin price and volatility, and the methodological pitfalls

Research date: 2026-10-23. Scope: about 16 search/fetch calls. Many sources are arXiv preprints or theses, flagged where relevant. Items marked "[not retrieved this session]" are standard references named from background knowledge. Their URLs/DOIs were not fetched or checked here, so the report writer should treat them as pointers and not as verified citations.

## 1. ML/DL for BTC price/direction: realistic accuracy vs naive baselines

### Takeaway
Rigorous out-of-sample studies find that Bitcoin's univariate price series behaves close to a random walk / Brownian noise. Naive forecasts (last price, drift) match or beat LSTM, N-BEATS, ARIMA, and similar models on point-error metrics. Short-horizon directional signals sometimes beat a coin flip, but where costs were tested they disappeared after transaction costs. Time-series foundation models (Chronos, TimesFM, Moirai) do not change this picture in the limited evidence available.

### Cited Findings
- **Puoti, Pittorino & Roveri (AIMLSystems 2024, ACM; arXiv Feb 2025)**: tested BTC, ETH, LTC, BNB, and XRP. In univariate analysis the series "closely resemble Brownian noise" and predictability is low. "Simpler models such as Naive models consistently outperform the more complex machine and deep learning ones" across horizons and time windows. — [arXiv 2502.09079](https://arxiv.org/abs/2502.09079)
  - A secondary description says the study walk-forward backtested 12 models (including LSTM and N-BEATS) at 1-, 7-, and 30-day horizons, with NaiveDrift and NaiveSeasonal best. An excerpt from the paper's table shows BTC 1-day NaiveDrift error 1.299 vs AutoARIMA 1.296, which is essentially a tie. Naive dominance is therefore "mostly, not uniformly" true. — [arXiv 2606.00071](https://arxiv.org/pdf/2606.00071); [IDEAS/RePEc listing](https://ideas.repec.org/p/arx/papers/2502.09079.html)
- **Baquero (arXiv, May 2026), survey of peer-reviewed BTC prediction research**: "no peer-reviewed study has shown robust superiority over the naive baseline across multiple market regimes" at 1–6 month horizons. Daily predictability exists but does not extend to hourly or monthly horizons and "may not survive transaction costs". Stock-to-flow failed formal out-of-sample testing. Metcalfe's-law valuations have been challenged as spurious. The paper argues the field needs better evaluation, not more models. Single author, not peer-reviewed. — [arXiv 2606.00071](https://arxiv.org/abs/2606.00071)
- **Jaquart, Dann & Weinhardt (2021, Journal of Finance and Data Science)**: 1–60 minute horizons with technical, blockchain, sentiment, and asset features. All models beat a random classifier, with RNNs and gradient boosting best. Predictability rises with horizon. A long-short strategy earned up to 39% per month before costs, but returns were **negative after transaction costs** because holding periods were so short. (Headline accuracy figures were not retrieved; from memory they are in the low-to-mid 50% range, unverified.) — [KIT repository](https://publikationen.bibliothek.kit.edu/1000150665)
- One critique of Jaquart et al. raises a possibly unbalanced training set. It also notes Chen et al. (2020) found logistic regression beat RNNs for 1-day BTC forecasts. — [arXiv 2208.07254](https://arxiv.org/pdf/2208.07254)
- **Linear regression vs NN on BTC closing price (arXiv 2001.01127)**: the best results for both models used lag 1, which the authors read as evidence that the series is close to a random walk. Predictions were better for stock series than for Bitcoin. — [arXiv 2001.01127](https://arxiv.org/pdf/2001.01127)
- **LSTM vs random walk on BTC/ETH (arXiv 2102.05448)**: the single-step prediction line resembles a horizontally shifted copy of the actual series. The authors attribute apparent accuracy to the nature of the random walk, not to learning. This is a direct example of the "lagged-copy illusion". — [arXiv 2102.05448](https://arxiv.org/pdf/2102.05448)
- ETH analogue: naive persistence MAPE 2.81% vs univariate LSTM 2.93%, so the LSTM was no better than persistence. — [SGU repository](https://repository.sgu.ac.id/items/db7aff37-be9c-4bf1-9e97-727c4edb8cda/full)
- **Foundation models**: a Politecnico di Milano master's thesis ran zero-shot Chronos-2, TimesFM, Moirai, and Lag-Llama on 6 cryptos including BTC, using 1-day log-returns and walk-forward testing. Linear ridge and Chronos-2 were the strongest average point performers, and compact transformers were less stable. Adding aggregate sentiment features **worsened** point error on average. Thesis, not peer-reviewed. — [POLITesi 10589/253774](https://www.politesi.polimi.it/handle/10589/253774)
- The FinCast paper (arXiv Aug 2025) used TimesFM and Chronos as crypto baselines, and its own model reports the lowest MSE. These are vendor/author-run benchmarks, and the summary retrieved did not include a naive random-walk comparison. — [arXiv 2508.19609](https://arxiv.org/pdf/2508.19609)
- Fine-tuned Chronos was comparable to or better than a Temporal Fusion Transformer for short BTC intervals (Bitcoin Ordinals study, IEEE Access 2025). This compares against another deep model, not against a naive baseline. — [Nazarbayev Univ. research portal](https://research.nu.edu.kz/en/publications/bitcoin-ordinals-bitcoin-price-and-transaction-fee-rate-predictio/)
- A practitioner test of the Kronos financial foundation model on 5-minute BTC moves found its predictions statistically indistinguishable from a Brownian baseline out of sample. This is a blog post, so low evidence weight. — [digitechbytes](https://digitechbytes.com/?p=48942)
- **Systematic reviews**: a PRISMA-style review of ML Bitcoin price forecasting (DLT 2024 / CEUR-WS Vol-3791) flags a "lack of transparency and comparability" across studies. It recommends sharing configurations and data and benchmarking against published models. — [CEUR-WS Vol-3791 paper26](https://ceur-ws.org/Vol-3791/paper26.pdf); [DLT2024 paper 29](https://dlt2024.di.unito.it/wp-content/uploads/2024/05/DLT2024_paper_29.pdf)
- A broader computational-finance systematic review (22 articles, 2024–2026) concludes ML/DL "outperform traditional models". This is typical of reviews that aggregate in-paper claims without auditing evaluation quality, and it conflicts with the naive-baseline evidence above. — [arXiv 2511.21588](https://arxiv.org/pdf/2511.21588)

### Inferences
- Positive results in the literature usually compare complex models against other complex models or ARIMA, not against random walk or drift. When the naive baseline is included and evaluation is walk-forward, the edge mostly disappears.
- Any real signal is concentrated at very short horizons (intraday). That is exactly where transaction costs, spreads, and slippage are largest relative to expected returns, so gross directional accuracy above 50% does not imply profit.
- Reviews that tally reported accuracies inherit publication bias. A systematic review that claims ML "outperforms" should not be read as evidence of real predictability unless it audits baselines and leakage.

### Gaps
- No formal meta-analysis pooling BTC directional accuracy under a standard protocol was found. A review in *Financial Innovation* specifically was not located.
- Exact directional-accuracy numbers from Jaquart et al. 2021 were not retrieved.
- No independent, peer-reviewed head-to-head of Chronos/TimesFM/Moirai vs random walk on BTC returns was found. Only a thesis and author-run benchmarks.

## 2. Common pitfalls (with examples)

### Takeaway
The recurring failures are: predicting price levels, so a model that copies yesterday's price looks accurate; leakage through shuffled splits or full-sample normalization; ignoring costs; and selection bias from trying many models or configurations. Bailey and López de Prado's Deflated Sharpe Ratio and Probability of Backtest Overfitting formalize the multiple-testing correction.

### Cited Findings
- **Lagged-copy illusion**: an LSTM on BTC/ETH price levels produced a horizontally shifted copy of the series, so its apparent accuracy came from random-walk persistence. — [arXiv 2102.05448](https://arxiv.org/pdf/2102.05448). The lag-1-is-best result in [arXiv 2001.01127](https://arxiv.org/pdf/2001.01127) is the same phenomenon.
- **Shuffled / random splits**: randomly splitting daily stock prices puts later data in training and earlier data in evaluation, which leaks future information. — [arXiv 2401.13796](https://arxiv.org/pdf/2401.13796)
- **Normalization leakage**: fitting a scaler on train plus test leaks test statistics. Fit per fold on training data only. K-fold CV on time series gives optimistically biased estimates. — [temporalcv docs: common pitfalls](https://temporalcv.readthedocs.io/en/latest/guide/common_pitfalls.html) (practitioner guide)
- **Transaction costs**: Jaquart et al. made up to 39% per month gross and lost money after costs. — [KIT repository](https://publikationen.bibliothek.kit.edu/1000150665). A 2026 walk-forward preprint reports that naive sign-based strategies fail at 10 bp costs, and only a cost-aware execution filter restored profitability in some configurations. — [emergentmind listing of arXiv 2606.00060](https://www.emergentmind.com/papers/2606.00060) (known only from a search snippet; the paper was not opened, so check it before citing)
- **Multiple testing / backtest overfitting**: the Deflated Sharpe Ratio (Bailey & López de Prado, *Journal of Portfolio Management* 40(5), 2014) corrects the Sharpe ratio for selection bias across the number of trials and for non-normal returns. — [SSRN 2460551](https://papers.ssrn.com/abstract=2460551). The Probability of Backtest Overfitting (Bailey, Borwein, López de Prado & Zhu, *Journal of Computational Finance*) estimates the chance that the in-sample-best strategy underperforms out of sample, using combinatorially symmetric cross-validation (CSCV). — [SSRN 2326253](https://papers.ssrn.com/abstract=2326253)
- **Spurious regressions / OLS violations / backtest overfitting** are named as the main informal critiques of BTC models (for example stock-to-flow, Metcalfe). Stock-to-flow failed formal out-of-sample testing. — [arXiv 2606.00071](https://arxiv.org/abs/2606.00071)
- **Non-transparency / non-comparability** of BTC ML papers. — [CEUR-WS Vol-3791 paper26](https://ceur-ws.org/Vol-3791/paper26.pdf)
- **Class imbalance**: Jaquart et al. were criticized for a possibly unbalanced training set. — [arXiv 2208.07254](https://arxiv.org/pdf/2208.07254)
- **Non-stationarity / regime change**: Baquero's standard requires multi-regime holdouts because results that hold in one regime do not generalize. — [arXiv 2606.00071](https://arxiv.org/abs/2606.00071)

### Inferences
- A paper reporting low RMSE or MAPE on price **levels** with no naive baseline should be treated as uninformative by default. Reporting errors on returns, plus a skill score relative to random walk, removes the illusion.
- Survivorship bias matters most for multi-coin studies, where today's top coins are chosen in hindsight. No crypto-specific quantification was retrieved.

### Gaps
- No well-known published BTC paper was found that was formally retracted or rebutted for leakage. The critiques are mostly generic or come from surveys.
- López de Prado, *Advances in Financial Machine Learning* (Wiley, 2018), covers purged/embargoed k-fold CV and is the standard source for purging and embargo. [not retrieved this session]

## 3. Proper evaluation methodology

### Takeaway
Best practice is: chronological walk-forward (expanding or rolling) evaluation; purged/embargoed CV when labels overlap; multi-regime holdouts; a naive random-walk/drift baseline; Diebold–Mariano (or Giacomini–White / Model Confidence Set) significance tests; cost-inclusive backtests with DSR/PBO; and, for probabilistic forecasts, proper scoring rules (CRPS, pinball loss) plus calibration checks.

### Cited Findings
- Proposed standards for BTC: walk-forward evaluation, multi-regime holdout windows, comparison to a naive baseline, including zero (no effect) in hyperparameter grids, and Diebold–Mariano significance testing. — [arXiv 2606.00071](https://arxiv.org/abs/2606.00071)
- Walk-forward validation in which training always precedes test, with no KFold on time series. — [temporalcv docs](https://temporalcv.readthedocs.io/en/latest/guide/common_pitfalls.html)
- Good-practice example: chronological splits with no shuffling, and normalization statistics computed on training dates only. — [arXiv 2608.08825](https://arxiv.org/pdf/2608.08825)
- PBO via CSCV and DSR as backtest-level controls. — [SSRN 2326253](https://papers.ssrn.com/abstract=2326253); [SSRN 2460551](https://papers.ssrn.com/abstract=2460551)
- Example of loss-function dependence in volatility forecasting: HAR wins on MSE, while a feed-forward NN wins on QLIKE. The choice of loss can flip rankings. — [Erasmus thesis (Verschoor)](https://thesis.eur.nl/pub/63410/Final_version_thesis_Johan_Verschoor.pdf)

### Inferences
- For a charting/indicator product, the honest framing is probabilistic: forecast distributions or volatility bands, scored with CRPS or pinball loss and checked for calibration (are 90% bands breached about 10% of the time?), not point price targets.
- For volatility, use robust losses such as MSE on variance and QLIKE, which stay consistent when realized volatility is used as a noisy proxy.

### Gaps
- Not retrieved this session, but these are standard references: Diebold & Mariano (1995), *JBES*, "Comparing Predictive Accuracy"; Gneiting & Raftery (2007), *JASA*, on proper scoring rules/CRPS; Hyndman & Athanasopoulos, *Forecasting: Principles and Practice* (https://otexts.com/fpp3/), on time-series CV and naive benchmarks; Patton (2011) on robust volatility loss functions. [not retrieved this session]
- No BTC-specific study was found that reports CRPS or calibration for price-distribution forecasts against a random-walk distributional baseline.

## 4. Volatility forecasting for BTC (GARCH, HAR-RV, implied vol / DVOL)

### Takeaway
BTC volatility is meaningfully forecastable, unlike direction, because volatility clusters and is persistent. HAR-type models on intraday realized variance generally beat daily-data GARCH, especially at short horizons. Adding jumps, structural breaks, or realized quarticity (HARQ-F-J) helps further. Evidence on option-implied volatility (Deribit/DVOL) as a forecaster is thin and mixed. ML occasionally edges HAR, but not consistently or with statistical significance.

### Cited Findings
- **Bergsli, Lind, Molnár & Polasik**, "Forecasting volatility of Bitcoin," *Research in International Business and Finance* 59 (2022; DOI 10.1016/j.ribaf.2021.101540): HAR models on realized variance beat GARCH models on daily data, with the strongest advantage for short-term forecasts. — [IDEAS/RePEc](https://ideas.repec.org/a/eee/riibaf/v59y2022ics0275531921001616.html); [EconBiz](https://www.econbiz.de/Record/forecasting-volatility-of-bitcoin/10013402137); [UiS repository](https://uis.brage.unit.no/uis-xmlui/handle/11250/2980915) (the findings summary came from search snippets, not the full text)
- **"Forecasting the volatility of Bitcoin: the importance of jumps and structural breaks"** (*European Financial Management*, 2020, Univ. of Reading): HARQ-F-J was the best out-of-sample model, and HAR models with structural breaks beat those without at all horizons. — [Reading eprint 87932](https://reading-clone.eprints-hosting.org/87932)
- Nottingham dissertation: HAR-RV-SJ and HAR-RV-J were the best out-of-sample models. — [Nottingham eprints 57681](https://eprints.nottingham.ac.uk/57681)
- **Dutta (2024, Annals of Data Science)**, on Bitcoin futures: augmenting HAR with leverage and jump terms improves RV forecasts, and jump-induced volatility carries **incremental information beyond the Bitcoin implied volatility index**. Implied volatility therefore does not subsume all realized-measure information. — [Springer s40745-024-00517-4](https://link.springer.com/article/10.1007/s40745-024-00517-4); [Osuva PDF](https://osuva.uwasa.fi/bitstream/10024/16910/2/Osuva_Dutta_2024.pdf)
- **Chi & Hao (arXiv 2020, Deribit data)**: GARCH and EGARCH beat HIST, EMA, and ARCH in- and out-of-sample. Option implied volatility did not forecast next-day realized volatility well. HAR was not tested, the EGARCH asymmetry term was insignificant, and GARCH badly under-forecast the March 2020 crash. — [arXiv 2010.07402](https://arxiv.org/abs/2010.07402)
  - **Conflict**: Chi & Hao rank GARCH top because they never test HAR. Bergsli et al. and the Reading paper show HAR-RV beats GARCH when intraday data is used.
- A Bitcoin implied-volatility-index (BVIX) paper argues implied volatility tends to subsume past realized volatility. Per the summary, this rests on reasoning and equity precedent rather than a BTC-specific encompassing test. — [Financial Innovation (SpringerOpen) s40854-024-00631-5](https://jfin-swufe.springeropen.com/articles/10.1186/s40854-024-00631-5)
- Hoang & Baur (cited secondhand) found that ARMA/HAR estimates of Deribit implied volatility work poorly at weekly horizons. The primary source was not retrieved. — [AIMS Mathematics 2023 PDF](https://aimspress.com/aimspress-data/math/2023/6/PDF/math-08-06-712.pdf)
- **ML vs HAR**: Bouri, Gkillas, Gupta & Pierdzioch (2021, *Computational Economics*) used HAR-RV as the benchmark for random forests. — [Univ. of Pretoria repository](https://repository.up.ac.za/handle/2263/76318). In the Erasmus thesis, HAR was best on MSE and a feed-forward NN best on QLIKE, and the NN improvement was not statistically significant. — [Erasmus thesis](https://thesis.eur.nl/pub/63410/Final_version_thesis_Johan_Verschoor.pdf). A Jan 2026 working paper compares LSTM against GARCH(1,1) and HAR/HAR-X, but its results were not retrieved. — [Zenodo 18148216](https://zenodo.org/records/18148216)
- Fiszeder, Orzeszko, Pietrzyk & Dudek (*Applied Soft Computing*, 2026), from 62 candidate drivers of BTC volatility: lagged variances, trading volume, and Google search intensity were the top factors. — [UMK PDF](https://www.home.umk.pl/~piter/Fiszeder_Orzeszko_Pietrzyk_Dudek_ASC.pdf)
- DVOL is Deribit's 30-day forward-looking implied-volatility index for BTC. This is a practitioner description, not a forecast evaluation. — [Newhedge DVOL](https://newhedge.io/bitcoin/dvol-deribit-implied-volatility-index)

### Inferences
- A practical volatility feature for a charting product would be a HAR-RV model on intraday realized variance, optionally with jump terms. It is simple, strongly persistent, and empirically hard to beat. DVOL can be shown alongside as the market's forward-looking 30-day estimate.
- Volatility predictability does not translate into directional predictability. It supports risk bands and position sizing, not price targets.

### Gaps
- No clean BTC study was found that runs an encompassing regression of realized volatility on DVOL plus HAR terms, using the post-2021 DVOL index.
- The quantitative R² or out-of-sample loss figures for HAR vs GARCH on BTC were not retrieved.
- Corsi (2009), "A Simple Approximate Long-Memory Model of Realized Volatility," *Journal of Financial Econometrics*, is the original HAR-RV paper. [not retrieved this session]

## 5. LLM-based and sentiment-text models for BTC (2023–2026)

### Takeaway
The most rigorous BTC-specific evidence found shows that ChatGPT-derived news sentiment improves in-sample fit for returns and volatility but gives **no statistically significant out-of-sample forecasting gain**. That pattern fits sentiment capturing contemporaneous information rather than predictive signal. Positive LLM-return-predictability results come mainly from equities, and they decay as LLM adoption rises.

### Cited Findings
- **Fiszeder, Orzeszko & Pietrzyk**, "News sentiment analysis using ChatGPT for Bitcoin price dynamics": ChatGPT-labeled headlines were fed into AR, HAR, BMA, LASSO, and SVR models. Sentiment significantly improves **in-sample** accuracy for returns and volatility, but there are **no statistically significant out-of-sample gains**. The authors read this as consistent with semi-strong efficiency. (Exact publication date or venue was not confirmed; the source is a seminar announcement abstract.) — [University of Warsaw WNE seminar page](https://www.wne.uw.edu.pl/en/research/conferences-and-seminars/upcoming-events/lecture-researchers-nicolaus-copernicus-university-torun)
- Zero-shot foundation models with aggregate sentiment features had higher point error on average for crypto returns. — [POLITesi 10589/253774](https://www.politesi.polimi.it/handle/10589/253774)
- **Equities (not BTC)**: Lopez-Lira & Tang show GPT-4 headline scores predict next-day stock returns and subsequent drift, especially for small stocks and negative news. Strategy returns decline as LLM adoption rises. Smaller models (GPT-1/2, BERT) cannot forecast returns. — [arXiv 2304.07619](https://arxiv.org/html/2304.07619v6)
- Jaquart et al. found sentiment features secondary to technical features in importance for 1–60 minute BTC prediction. — [KIT repository](https://publikationen.bibliothek.kit.edu/1000150665)

### Inferences
- Sentiment and LLM signals for BTC appear to be mostly contemporaneous: news describes moves rather than predicting them. Any residual edge is likely short-lived and erodes as the tooling spreads.
- Studies that report large gains from social-media sentiment should be checked for timestamp alignment (look-ahead) and for whether gains survive out of sample against a naive baseline.

### Gaps
- No peer-reviewed 2024–2026 study was found that shows robust out-of-sample BTC return gains from LLM-based text signals after costs.
- "Crypto Volatility Forecasting: Mounting a HAR, Sentiment, and Machine Learning Horserace" exists, but its findings were not retrieved. — [Yalova Univ. listing](https://unis.yalova.edu.tr/yayin-detay/2_CJ8oCp8_43/crypto-volatility-forecasting-mounting-a-har-sentiment-and-machine-learning-horserace)

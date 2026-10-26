# AI compute will become a price benchmark and a side gauge of the economy, not a new GDP

The phrase "compute is the new oil" now has real market plumbing behind it. Rental-price indices for Nvidia GPUs have been published daily since 2025. CME, ICE and Nodal have each announced cash-settled compute futures, and the CFTC opened a request for comment on compute derivatives in August 2026. Boston Consulting Group puts AI compute spending at about **$360bn last year**, and expects **$2.3trn of compute transactions by 2030**, roughly the size of today's crude-oil trade. Compute already appears in GDP too, as investment. Epoch AI estimates AI-related hardware, data-centre construction and networking at **about 0.8% of US GDP in Q1 2026**, and on some definitions that spending accounts for a third to three-quarters of recent US growth. The step from there to "compute as a GDP metric" is where the case weakens. GDP measures value added, and compute is an **input**, like electricity or oil. Its unit keeps changing (FLOPs at which precision, on which chip?), its price falls quickly as hardware improves, and countries host compute that belongs to foreign firms. Activity counts such as China's official token statistic are easy to inflate. **The realistic outcome is three new things, not one.** The first is a tradable compute price benchmark, a Brent for GPU-hours, which is close to existing now. The second is national compute-capacity and compute-intensity indicators, tracked alongside GDP in the way energy intensity is. The third is compute usage as a nowcasting input, in the way the "Li Keqiang index" uses electricity. None of these replaces GDP.

> **Source note.** The Hindustan Times link ([HT](https://www.hindustantimes.com/technology/ai-compute-is-the-new-oil-and-needs-a-new-market-101792739050866.html)) blocks automated readers, so I could not read the page directly. Its headline matches an Economist article of 22 October 2026, and the HT article ID (`1792739050866`) decodes as a millisecond timestamp of 23 October 2026, which fits a syndicated copy published a day later: "AI compute is the new oil—and needs a new market" ([Buzzing/Economist](https://i.buzzing.cc/en/economist/posts/2026/43/en_blueskylink_2026_10_22__3myhg2gefn32y/); [biztoc](https://biztoc.com/x/77822633906e2c48)), and the HT URL looks like a syndicated copy. The summary below comes from a syndicated rewrite ([Andhravilas](https://andhravilas.net/ai-compute-the-trillion-dollar-fuel-needs-a-sophisticated-market/)) and from passages quoted in the [Hacker News thread](https://news.ycombinator.com/item?id=50202671). Check figures against the original before citing them.

## What the article argues

The article's case is that compute is scarce, essential and heavily traded, but the market for it is primitive. Chipmakers (Nvidia, AMD) sell accelerators. Server makers (Dell, HPE) rack them. Hyperscalers and "neoclouds" rent the capacity out, often on multi-year contracts. Customers range from hyperscalers topping up their own capacity to start-ups running open-source models. Three problems hold the market back:

- **Heterogeneity.** Chips, server configurations, locations and contract lengths all differ, so buyers and sellers are hard to match.
- **Counterparty and valuation risk.** Long contracts give certainty, but hardware ages fast and counterparties may not survive to the end of a contract. CoreWeave's rising bond yields reflect that risk, and smaller operators pay double-digit interest rates because lenders cannot price it.
- **No hedging instruments.** Without futures or swaps, operators and buyers carry all the price risk themselves.

The market structure is being built mainly by people from crypto and commodity trading. Compute Exchange lists GPUs by location, duration and price. Anera Labs arranged a six-figure OTC pilot trade with FalconX on future H100 rental prices. Luxor, formerly a bitcoin-mining services firm, offers swap-like contracts that fix an operator's cash flow per server-hour, with deals "in the tens of millions of dollars". Architect Financial Technologies runs a Bermuda-based venue with futures linked to US chip values. Jump Trading bought the compute-trading start-up Ito Markets, and both Jump and DRW are building compute-trading desks. Jump's investment chief, David Olsen, argues the market will grow faster once clearing houses guarantee both sides of trades ([Andhravilas](https://andhravilas.net/ai-compute-the-trillion-dollar-fuel-needs-a-sophisticated-market/)).

The HN discussion raises the main objections to the oil analogy ([HN](https://news.ycombinator.com/item?id=50202671)). **Oil can be stored and compute cannot**, because an unrented GPU-hour is gone. Oil demand is inelastic, while AI efficiency improves quickly, so compute may end up priced just above the cost of electricity and depreciation. Some commenters see a utility like electricity or cloud hosting rather than a strategic commodity. Others see Jevons-paradox demand growth that keeps compute scarce.

## Compute already has a price index, and futures are close

A GDP-style index needs a price, and compute has had one for over a year:

| Benchmark | Provider | What it tracks | Status (as found, Oct 2026) |
|---|---|---|---|
| **SDH100RT** (also A100, B200, MI300X indices) | Silicon Data | Daily average spot rental price of an H100-hour. Built from ~3.5M data points from 30+ sources, standardized for GPU subtype, location and platform | Live since May 2025 on Bloomberg and Refinitiv ([Data Center Knowledge](https://www.datacenterknowledge.com:443/data-center-chips/silicon-data-creates-first-of-its-kind-index-for-ai-chips); [Silicon Data](https://www.silicondata.com/products/silicon-index?gpu=h100)) |
| **OCPI** | Ornn | GPU spot prices from live-traded rentals across hardware types | ICE publishes the data with hypothetical daily settlements. H100 (HPR) and B200 (BKL) futures are pending CFTC review ([ICE](https://ir.theice.com/press/news-details/2026/ICE-and-Ornn-to-Launch-GPU-Compute-Futures-Contracts/default.aspx); [ICE notice](https://www.ice.com/publicdocs/futures_us/exchange_notices/ICE_Futures_US_Exchange_Notice_ORNN_Compute_4Q2026_20260929.pdf)) |
| **COIL** | NATIVX | "Energy-normalized" compute and connectivity, so locations with different power prices can be compared | ICE futures announced 1 July 2026 ([ICE](https://ir.theice.com/press/news-details/2026/ICE-and-NATIVX-to-Launch-Energy-Normalized-Compute-Futures-Contracts/default.aspx)) |
| Compute Desk GPU indices | Compute Desk | GPU rental prices | Nodal Exchange futures planned. Nodal holds over half of US power-futures open interest, so power-versus-compute spreads become tradable ([FIA](https://www.fia.org/fia/articles/explainer-what-are-compute-futures-and-how-do-they-work)) |
| Silicon Data H100/B200 Rental Indices (CME contracts) | Silicon Data (index), CME Group (exchange) | Futures of **730 GPU-hours** (one GPU for a month), cash-settled | Planned for 5 October 2026. The CFTC extended its review, and the first trade is now targeted for **9 November 2026**. Not cleared as of 21 October ([CME](https://investor.cmegroup.com/news-releases/news-release-details/cme-group-and-silicon-data-partner-launch-first-compute-futures); [CNBC, 26 Oct](https://cnbc.com/2026/10/26/gpu-futures-ai-hedge-hyperbolic.html); [Runtime Wire](https://runtimewire.com/article/silicon-data-cme-compute-futures-november-2026)) |

The price itself is volatile and falling. A secondary source reports SDH100RT dropping from **$3.06/hour (Sep 2024) to $2.36 (Jun 2025)** as supply caught up ([Introl](https://introl.com/blog/gpu-cloud-price-collapse-h100-64-percent-drop-2025)). FIA lists the design problems that any compute index has to solve ([FIA](https://www.fia.org/fia/articles/explainer-what-are-compute-futures-and-how-do-they-work)):

- **Fragmentation versus precision.** One index per chip type tracks prices well but splits liquidity across contracts.
- **Basis risk.** A user's actual configuration and region may not move with the benchmark.
- **Power-cost dispersion.** Electricity prices differ by location, which is what COIL tries to normalize.
- **Obsolescence.** When a new GPU generation arrives, contracts have to roll to new benchmarks. Oil never changes generation.

**Verdict on the "index" half of the question:** compute as a *market* index is already happening. Whether it becomes a Brent-like benchmark depends on whether the futures get liquidity, and the CFTC's response is the next milestone.

## Compute is already inside GDP, as investment

National accounts count compute twice over. Building it is investment: computers and peripherals, data-centre structures and networking. Renting it is intermediate consumption (cloud services bought by firms) or final consumption (consumer AI subscriptions).

- **Size.** Epoch AI's above-trend method attributes **0.56% of GDP to AI compute hardware, 0.15% to data-centre construction and 0.12% to networking**, about **0.8%** in Q1 2026. All computing infrastructure is about **1.5%**, against roughly 0.7% in 2015–2022 ([Epoch AI](https://epoch.ai/data-insights/ai-datacenter-share-gdp)). BEA puts US information-processing equipment investment at an annualized **$752bn in Q2 2026** ([FIA](https://www.fia.org/fia/articles/explainer-what-are-compute-futures-and-how-do-they-work)).
- **Share of growth.** Estimates vary widely with the definition. One reading of BEA data attributes ~75% of Q1 2026 growth (~1.55 pp) to AI-related investment ([TFTC](https://www.tftc.io/ai-capex-gdp-growth-q1-2026-bea-third-estimate)). ING gets **~50% on a broad measure, ~44% on a strict one and ~36% after netting out imported chips and computers** ([ING](https://think.ing.com/opinions/how-much-is-ai-contributing-to-us-economic-growth/)).
- **Import leakage.** Much of the hardware's value is created in Taiwan, Korea and elsewhere, so the capex headline overstates what is added to domestic GDP ([MarketScreener](https://uk.marketscreener.com/news/massive-ai-investment-bolsters-us-gdp-ce7f58d8dd80ff20); [Fed note on AI trade effects](https://www.federalreserve.gov/econres/notes/feds-notes/the-global-trade-effects-of-the-ai-infrastructure-boom-accessible-20260213.htm)).

That spread of estimates is itself a finding. **Statistical agencies do not yet separate "AI compute" from general IT**, so every estimate of compute's GDP contribution is an analyst's construction. A dedicated compute measure would fill a real gap.

## Countries are starting to measure compute as a national quantity

- **Capacity by country.** Epoch's GPU-cluster database gives the US **~75% of global GPU-cluster performance and China ~15%** (May 2025). The dataset covers only an estimated 10–20% of global capacity, and its Chinese figures are lower bounds ([Epoch AI](https://epoch.ai/data-insights/ai-supercomputers-performance-share-by-country); [Epoch data](https://epoch.ai/data/gpu-clusters?view=map)). A June 2026 blog post plots public-cluster bf16 FLOPS against GDP and finds Finland, Switzerland, Italy, Germany and the US have unusually large compute relative to their economies. It uses about 80 clusters and some numbers are hard to verify ([Raffel](https://colinraffel.com/blog/flops-vs-gdp.html)).
- **Usage as an official statistic.** **China is the first country to publish a compute-usage headline number.** The National Data Administration said daily token consumption **passed 140 trillion in March 2026, up from 100 billion at the start of 2024** (more than 1,000x) and 100 trillion at end-2025 ([China Daily](https://www.chinadaily.com.cn/a/202603/24/WS69c21887a310d6866eb3f91f.html)). Critics note that no primary source defines what the figure counts (pre-training, inference or agent-to-agent traffic). Tokens measure activity, not revenue or useful work, and as soon as the number becomes a target it invites bot-to-bot inflation ([Pebblous analysis](https://blog.pebblous.ai/report/china-token-economy-metric-2026-07/en/)). I found no later official update.
- **Tokens as a unit of account.** Recent papers argue the token serves as a factor of production, a medium of exchange (per-token billing) and a unit of account for AI work ([arXiv 2605.09104](https://arxiv.org/pdf/2605.09104)). An INSS brief calls tokens the direct metric of GPU, data-centre and energy consumption ([INSS](https://www.inss.org.il/wp-content/uploads/2026/08/No.-2186.pdf)).

I found **no OECD, IMF, BEA or Eurostat standard** that treats compute as an official economic indicator.

## Why compute cannot replace GDP

1. **It measures an input, not output.** GDP is final output at market prices. Compute is consumed to produce output, so counting it as output would double-count it the way counting electricity would. As an input, its proper role is a **compute intensity of GDP** ratio (effective compute per $ of output), the way energy intensity is used.
2. **The unit is unstable.** FLOPs depend on numeric precision (FP64, FP16, FP8, FP4) and sparsity, and real throughput depends on memory bandwidth and interconnect. "H100-equivalent hours" ties the unit to one chip generation that will be obsolete within a few years. Any long series needs **hedonic quality adjustment**, the same problem statisticians have with computer prices, but harder.
3. **Efficiency gains break the link to output.** Algorithmic and hardware gains mean the same economic output needs ever less compute. The opposite, Jevons-style expansion, is also possible. Either way the ratio drifts, which is the HN objection in statistical form.
4. **Location and ownership differ.** A US hyperscaler's cluster in Malaysia raises Malaysian "installed compute", while most of the profit goes to the US. That is the GDP-versus-GNI problem again, and it gets worse as sovereign-compute and export-control policy moves clusters around.
5. **Installed capacity is not used capacity.** A capacity index counts idle GPUs, and a usage index (tokens) counts low-value or synthetic traffic. Each needs the other, plus a price, to say anything about value.
6. **Goodhart's law applies.** The moment token volume or installed FLOPs becomes a national target, it stops being a clean measure. China's token statistic is the test case to watch.

## Where compute does work as a macro indicator

There is an established precedent for a physical-input index sitting beside GDP. The "Li Keqiang index" combined electricity use, rail freight and bank lending because they were harder to fake than reported GDP. Night-time satellite lights are used the same way for economies with weak statistics. Compute can fill that role for the digital economy. A practical design would have three layers, each with an existing data source:

| Layer | Question it answers | Measure | Data available now |
|---|---|---|---|
| **Price** | What does compute cost? | Chain-linked, quality-adjusted rental price per effective GPU-hour, rolled across chip generations | SDH100RT/SDB200RT, OCPI, COIL, Compute Desk; futures curves once listed |
| **Stock / capacity** | How much compute does a country have? | Installed effective FLOPs, location-based and owner-based, with depreciation | Epoch GPU clusters (partial); export data; data-centre construction (Census C30) |
| **Flow / usage** | How much is it used? | Utilized GPU-hours, inference tokens and data-centre electricity, by sector | China NDA tokens; utility and IEA data-centre power; cloud-provider disclosures |

From those three layers you can derive:

- **Compute intensity** = utilized effective compute ÷ real GDP, an "energy intensity" for the AI economy.
- **Compute spend share** = (usage × price) ÷ nominal GDP, the cleanest bridge to the national accounts.
- **Compute nowcast**: monthly usage and price fed into GDP nowcasting models, the way electricity and freight are used today.

The right institutional home is a **satellite account**. These sit beside the core national accounts without changing GDP, as tourism and digital-economy accounts already do. That avoids the double counting while still publishing compute stock, flow and prices officially.

## Verdict and what to watch

| Claim | Assessment |
|---|---|
| Compute becomes a traded commodity with a benchmark price | **Likely, 2026–27.** Indices exist, and three exchanges plus OTC swaps are lined up. The open questions are CFTC approval and liquidity |
| Compute becomes an official supplementary macro indicator | **Plausible, slower.** China already publishes token volume. Western agencies separate AI from general IT only through analysts' estimates |
| Compute replaces or redefines GDP | **Unlikely.** It is an input with an unstable unit. It belongs in intensity ratios and satellite accounts, not in the headline |

Signals to watch:

- Whether CME's first compute futures actually trade on **9 November 2026** after the extended CFTC review, the CFTC's wider response to its compute-derivatives request for comment, and first-month volume and open interest on CME/ICE compute futures.
- Whether BEA or Eurostat start publishing an AI or data-centre investment line separate from general computers and peripherals.
- Updates to China's NDA token statistic, and whether it gets a published definition.
- The spread between compute and power prices (COIL and Nodal). If compute settles at "electricity plus depreciation", the HN skeptics were right and compute behaves like a utility, not like oil.

## For zencharts

If compute futures list, a **compute price pane** would fit next to the existing crypto and forecasting tools. Possible series are the SDH100RT/OCPI spot level, the futures curve (contango means the market expects scarcity, backwardation means a glut), and a compute-to-power spread. Data access is the constraint. Silicon Data's indices are distributed through Bloomberg, Refinitiv and Kaiko, and ICE publishes OCPI data. I did not find a free public API, so check licensing before building anything.

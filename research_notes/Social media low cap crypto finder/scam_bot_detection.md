# Scam / Rug-Pull Detection and Social Bot / Shill Detection for a Low-Cap Crypto Finder (as of Oct 2026)

Scope: Solana + EVM (Ethereum, Base, BNB). Research budget: about 16 tool calls. Primary docs were fetched where possible (GoPlus). Several vendor tools (DexScreener, Birdeye, De.Fi, SolSniffer) could not be verified within budget and are listed under Gaps.

## Q1. Token security APIs and tools: what they check, pricing/limits

### Takeaway
GoPlus is the broadest machine-readable source and covers both chains: on EVM it checks honeypots, taxes, proxies, mint and owner powers, and LP holders, and on Solana it checks mint, freeze and close authorities, Token-2022 extensions and LP burn. RugCheck-style Solana reports add insider and top-holder concentration plus a "rugged" flag. Honeypot.is (free) simulates a buy and a sell on EVM. Token Sniffer is paid ($99/mo for 500 lookups/day). Use several of these and combine the results, because each one covers different risks.

### Cited Findings
**GoPlus Security API (EVM token_security)**: the response fields fall into three groups.
- Contract: `is_open_source`, `is_proxy`, `is_mintable`, `owner_address`, `can_take_back_ownership`, `owner_change_balance`, `hidden_owner`, `selfdestruct`, `external_call`, `gas_abuse` — [GoPlus docs: response details](https://docs.gopluslabs.io/reference/response-details)
- Trading: `is_in_dex`, `buy_tax`, `sell_tax`, `transfer_tax`, `cannot_buy`, `cannot_sell_all`, `is_honeypot`, `slippage_modifiable`, `personal_slippage_modifiable`, `transfer_pausable`, `is_blacklisted`, `is_whitelisted`, `is_anti_whale`, `anti_whale_modifiable`, `trading_cooldown`, `dex` — [GoPlus docs](https://docs.gopluslabs.io/reference/response-details)
- Info: `holder_count`, `holders`, `owner_percent`, `creator_address`, `creator_percent`, `lp_holder_count`, `lp_holders` (with lock info), `is_airdrop_scam`, `trust_list`, `fake_token`, `is_in_cex`, `launchpad_token`, `other_potential_risks` — [GoPlus docs](https://docs.gopluslabs.io/reference/response-details)
- A newer "B20 token" extension (`mintable`, `transfer_pausable`, `owner_change_balance`, `metadata_modifiable`, `blacklist`, `whitelist`, `cannot_sell`, `cannot_buy`) needs a GoPlus Console key/access token — [GoPlus docs](https://docs.gopluslabs.io/reference/response-details)

**GoPlus Solana token security**:
- Fields: `mintable`, `freezable`, `closable`, `balance_mutable_authority` (whether the dev can change users' balances), `metadata_mutable`, `default_account_state` (whether new accounts start Frozen), `default_account_state_upgradable`, `none_transferable` (sic), `transfer_fee`, `transfer_fee_upgradable`, `transfer_hook` (an external hook that can block trading), `transfer_hook_upgradable`, `creators` (with a malicious-address flag), top-10 `holders` (with tags and lock details), top-10 `lp_holders`, `dex` (LP burn %, TVL, volume stats), `trusted_token` — [GoPlus Solana token security docs](https://docs.gopluslabs.io/reference/solanatokensecurityusingget)
- Neither GoPlus page states pricing or rate limits — [GoPlus docs](https://docs.gopluslabs.io/reference/response-details)

**RugCheck-style Solana reports** (third-party descriptions; I did not reach RugCheck's own API docs):
- A report for a mint reportedly includes a risk score, a "rugged" flag, a list of risks tagged by severity, holder count, liquidity, and the share of supply held by the top holder, the top 10 and insiders — [RugCheck AI MCP Server listing](https://mcpservers.org/hi/servers/mrwizardlyloaf/rugcheck-ai)
- Solana Tracker's risk scale, which is similar but belongs to Solana Tracker, not RugCheck: mint authority enabled = 2500; freeze authority enabled = 7500 ("dev can freeze your wallet after you buy"); top-10 holders > 15% = 5000; LP not burned/locked = 4000; no liquidity left = rugged = 20000 — [Solana Tracker token-safety guide](https://docs.solanatracker.io/guides/token-safety); [Solana Tracker risk API](https://docs.solanatracker.io/data-api/risk.md)
- A live freeze authority does not by itself mean a scam. USDC itself scores CAUTION because its issuer can freeze balances — [RugCheck AI MCP listing](https://mcpservers.org/ru/servers/mrwizardlyloaf/rugcheck-ai)

**Honeypot.is (EVM)**:
- Simulates buy and sell transactions to detect honeypots and measure effective taxes. Supports multiple chains, including Ethereum and Base, through a web UI and an API. Free tier. A token that passes today can change behaviour later (for example, through upgradeable or owner-set taxes) — [QuickNode builders guide: Honeypot.is](https://www.quicknode.com/nl/builders-guide/tools/honeypot-is-by-honeypot-scanner)

**Token Sniffer (owned by Solidus Labs)**:
- API "Sniffer Pack Pro" costs $99/mo or $1,128/yr for 500 token/address requests per day. It returns a 0–100 score, scam status and test results. The Enterprise tier is custom-priced at 5,000+ tokens/day and is the only tier with the malicious token/address lists. A 14-day trial is available on request — [Token Sniffer API pricing](https://tokensniffer.readme.io/reference/pricing); [Solidus TokenSniffer API page](https://www.soliduslabs.com/tokensniffer/api)
- A 2023 Decrypt article quoted API tiers of $100–200/mo, which conflicts with the current docs. Prefer the docs — [Decrypt](https://decrypt.co/123042/token-sniffer-api-solidus-labs-rug-pulls-scams)

**Bundler/sniper metrics (vendor heuristics)**:
- Mobula marks a cluster of 3 or more wallets as bundlers when they make similar-sized buys at launch and later consolidate tokens into one wallet. Its insider detection uses deployer links and funding sources. Its suggested "healthy" profile is a dev holding under 5% (or locked/burned) and the top 10 holding under 30% — [Mobula: detecting snipers & bundlers](https://docs.mobula.io/almanac/detecting-snipers-bundlers)
- Webacy flags bundler holdings above 20% and sniper holdings above 30% as high risk — [Webacy glossary](https://docs.webacy.com/glossary/snipers-bundlers)

### Inferences
- A minimal hard-fail gate for Solana needs:
  - from GoPlus or RugCheck: mint authority, freeze authority, `balance_mutable_authority`, `transfer_hook`, `default_account_state = Frozen`, non-transferable, and LP burn %;
  - from Mobula/Webacy-style data: insider, bundler and sniper concentration.
- A minimal hard-fail gate for EVM needs:
  - from GoPlus: honeypot, sell tax, `cannot_sell_all`, `owner_change_balance`, `hidden_owner`, `is_proxy`, `slippage_modifiable`, `is_blacklisted`, and LP holders/lock;
  - a live buy/sell simulation from Honeypot.is.
- Static checks pass at time T but can be undone later through proxy upgrades, modifiable taxes or retained authorities. The finder should re-check on a schedule and treat "modifiable"/"upgradable" flags as risks in their own right.
- Each vendor uses its own scoring scale, so store the raw flags and compute your own score instead of averaging vendor scores.

### Gaps
- I could not open RugCheck.xyz's official API docs (endpoints, auth, rate limits, exact score scale). The figures above come from third-party descriptions.
- GoPlus pricing and rate limits were not found; neither docs page states them.
- DexScreener and Birdeye security fields, the De.Fi scanner and SolSniffer were not verified within the research budget. No claims are made about them.

## Q2. Rug-pull taxonomies, statistics and academic detection work

### Takeaway
Scam tokens are the overwhelming majority on permissionless launchpads:
- about 50% of Uniswap V2 tokens (2021 data);
- about 60% of ETH/BSC tokens live less than a day;
- 98.6% of pump.fun tokens flagged as likely rug/pump-and-dump (Solidus, through Mar 2025).

The literature splits rug pulls into contract-level (backdoors) and liquidity/market-level (LP pull, dumps), and finds that serial deployers and sniper bots are key signals.

### Cited Findings
- **Xia et al., "Trade or Trick?"** (ACM SIGMETRICS 2022, arXiv 2109.00229):
  - found more than 10,000 scam tokens on Uniswap V2, about 50% of listed tokens;
  - detection combines a guilt-by-association heuristic with ML;
  - some tokens contained hidden contract backdoors, and collusion addresses ran the schemes;
  - scammers earned at least $16M from 39,762 potential victims.
  - Sources: [arXiv](https://arxiv.org/abs/2109.00229); [HIT scholar](https://scholar.hit.edu.cn/en/publications/trade-or-trick-detecting-and-characterizing-scam-tokens-on-uniswa/)
- **Mazorra, Adan, Daza, "Do not rug on me: Zero-dimensional Scam Detection"** (2022; arXiv 2201.07220; *Mathematics* 2022):
  - added about 20K Uniswap V2 tokens to the earlier dataset and built a taxonomy of malicious maneuvers;
  - ML on token-distribution and contract features flags rugs before they happen, with accuracy 0.9936, recall 0.9540 and precision 0.9838.
  - Sources: [arXiv](https://arxiv.org/pdf/2201.07220); [IACR ePrint 2022/350](https://eprint.iacr.org/2022/350)
- A viral claim that "97.7% of Uniswap tokens are rug pulls" was a misreading. Mazorra disputed it, and critics objected to loose use of the word "rug" — [Blockworks](https://www.blockworks.com/news/are-97-of-tokens-on-uniswap-really-rug-pulls)
- **Cernera, La Morgia, Mei, Sassi, "Token Spammers, Rug Pulls, and SniperBots"** (USENIX Security 2023):
  - covered more than 3B transactions, more than 1.3M tokens and more than 1M pools on ETH and BSC;
  - about 60% of tokens lived less than 1 day;
  - 1% of addresses created more than 20% of tokens ("token spammers");
  - "1-day rug pulls" made an estimated $240M and were most common on BSC;
  - characterises sniper bots.
  - Sources: [USENIX](https://www.usenix.org/conference/usenixsecurity23/presentation/cernera); [arXiv](https://arxiv.org/abs/2206.08202v2)
- **CRPWarner** (Sun Yat-sen University et al., arXiv 2403.01425, 2024):
  - manually analysed 103 real-world rug-pull events;
  - targets *contract-related* rug pulls by decompiling EVM bytecode with Gigahorse, building a CFG and running a Datalog analysis, so it works on unverified contracts.
  - Sources: [arXiv](https://arxiv.org/html/2403.01425v1); [Moonlight review](https://www.themoonlight.io/fr/review/crpwarner-warning-the-risk-of-contract-related-rug-pull-in-defi-smart-contracts)
- **LROO Rug Pull Detector** (arXiv 2603.11324, 2026): a "leakage-resistant" framework that combines on-chain and OSINT signals — [arXiv](https://arxiv.org/pdf/2603.11324). I did not read the details.
- **Solidus Labs (May 2025, data through Mar 2025)**:
  - pump.fun issued more than 7M tokens, and only about 97K kept at least $1,000 of liquidity (under 1.4%);
  - 98.6% were deemed likely rug pulls or pump-and-dumps;
  - 93% of Raydium pools (about 361K–388K, sources differ) showed soft-rug signs;
  - pump.fun disputed the methodology;
  - the definition of "scam" is broad.
  - Sources: [BeInCrypto](https://beincrypto.com/pump-fun-tokens-scams-solidus-labs-report/); [Forklog](https://forklog.com/en/report-98-of-pump-funs-memecoins-deemed-scams/); [The Defiant](https://thedefiant.io/news/defi/alarming-99-of-memecoin-launches-on-pumpfun-are-pump-and-dumps-or-rug-pulls-report)
- **Deployer-funded sniping on pump.fun**:
  - more than 15,000 launches in one month had a sniper wallet funded directly by the deployer;
  - more than 4,600 sniper wallets, with an 87% profitable-snipe rate;
  - this is a lower bound covering only that narrow pattern.
  - Source: [Pine Analytics, "Exit Liquidity Machines"](https://pineanalytics.substack.com/p/exit-liquidity-machines)
- An unverified write-up claims about 15% of pump.fun deployers control clusters of 50 or more wallets. It does not name its dataset — [killy7 Substack](https://killy7.substack.com/p/serial-token-deployers-on-solana)
- Sniping-cluster examples:
  - Bubblemaps flagged a sniping cluster of more than 90 wallets on the "Mystery" memecoin;
  - one sniper reportedly made about $28M on BROCCOLI (Feb 2025).
  - Source: [Cointelegraph](https://cointelegraph.com/news/bubblemaps-flags-mystery-over-90-wallet-launch-sniping-cluster)

### Inferences
- Working taxonomy for the finder:
  - **Hard / contract rugs**: honeypot, hidden mint, owner balance change, blacklist, adjustable tax, proxy swap.
  - **Liquidity rugs**: LP removal when the LP is not burned or locked.
  - **Soft rugs / pump-and-dumps**: dev or insider dumps, bundled supply, sniper clusters, serial deployers.
- Base rates are extreme (more than 95% bad on launchpads), so the finder should default to "reject" and require tokens to pass gates. Even a highly accurate classifier will produce many false positives on the remaining candidates.
- Deployer history is a cheap, high-signal feature: count of past tokens and their outcomes, following the "token spammer" idea from Cernera et al.

### Gaps
- No peer-reviewed Solana/pump.fun rug-detection paper was found within budget. A University of Pisa thesis (655,770 tokens, Sep–Oct 2025) was mentioned in search snippets but not verified.
- No primary Chainalysis 2025/2026 figures on memecoin rugs or wash trading were retrieved.
- Wash-trading detection methods and statistics (Solana/EVM DEX) were not researched within budget.

## Q3. Social bot detection: tool status and features for coordinated inauthentic behaviour

### Takeaway
The original Botometer has effectively been unavailable since X cut free API access in mid-2023. Botometer X is archival only, scores no accounts created after May 31, 2023, and predates LLM-powered bots. A 2026 crypto finder therefore has to build its own coordination and bot features. The research shows that crypto-related promotion on Twitter is dominated by bots, which link out to Telegram pump channels.

### Cited Findings
- **Botometer status**:
  - The original website was taken down after X ended free researcher access.
  - Botometer X launched in Feb 2024 in "archival mode". It uses data collected before June 2023, has no records for accounts created after May 31, 2023, uses the BotometerLite (metadata) model, and was trained before ChatGPT, so it cannot detect AI-enhanced bots.
  - Bulk access through Botometer Pro was "planned", but I found no confirmation that it happened.
  - Source: [OSoMe, "Introducing Botometer X"](https://osome.iu.edu/research/blog/introducing-botometer-x)
- Botometer usage fell to zero by early July 2023, and June 30, 2023 was treated as its last day of sustained operation — [arXiv 2609.20661 (2026)](https://arxiv.org/pdf/2609.20661)
- Vendors report that other free tools, such as SparkToro's Fake Followers Audit, also broke after the 2023 API changes. This is vendor marketing — [Sorsa blog](https://api.sorsa.io/blog/twitter-bot-detection)
- **Nizzoli, Tardelli, Avvenuti, Cresci, Tesconi, Ferrara, "Charting the Landscape of Online Cryptocurrency Manipulation"** (IEEE Access 2020; arXiv 2001.10289):
  - more than 50M messages from about 7M users on Twitter, Telegram and Discord over 3 months;
  - 56% of Twitter accounts sharing Telegram/Discord invite links were bots or suspended;
  - 93% of invite links shared by Twitter bots pointed to Telegram pump-and-dump channels;
  - Telegram had 296 pump-and-dump and 432 Ponzi channels (about 20% of channels), while Discord showed negligible deception.
  - Sources: [ar5iv](https://ar5iv.arxiv.org/html/2001.10289); [ISI](https://www.isi.edu/results/publications/12654/charting-the-landscape-of-online-cryptocurrency-manipulation/)
- **Cresci, Lillo, Regoli, Tardelli, Tesconi, "Cashtag Piggybacking"** (ACM TWEB 2019):
  - about 9M tweets about US stocks (not crypto);
  - coordinated bots promoted low-value tickers by co-mentioning them with high-value cashtags;
  - up to 71% of authors of suspicious financial tweets were classified as bots, and 37% were suspended within months;
  - the dataset is public on Zenodo.
  - Sources: [arXiv 1804.04406](https://www.arxiv.org/abs/1804.04406v1); [Zenodo dataset](https://doi.org/10.5281/zenodo.2686862)
- **Hamrick et al., "An examination of the cryptocurrency pump-and-dump ecosystem"**: joined Telegram and Discord pump groups and identified thousands of pumps targeting hundreds of coins — [HUJI CRIS](https://cris.huji.ac.il/en/publications/an-examination-of-the-cryptocurrency-pump-and-dump-ecosystem/)

### Inferences
- Features that follow from the cited work:
  - cashtag co-occurrence anomalies: a small cap repeatedly co-mentioned with $BTC, $SOL or $ETH by the same accounts, which is the piggybacking pattern;
  - share of posts containing Telegram invite links;
  - account suspension rate over time (a lagging ground truth);
  - account creation date. Botometer X cannot score accounts created after May 31, 2023, which covers most current shill accounts.
- Generic coordination features: posting synchrony within seconds or minutes, near-duplicate text (MinHash/embedding similarity), and follower-graph overlap. These are standard in the literature, but this research did not retrieve specific thresholds for them, so treat them as design suggestions.
- Botometer was trained before LLMs, so detection by text style alone will fail on 2026 bots. Behavioural, temporal and network coordination signals are more robust.

### Gaps
- No 2025–2026 peer-reviewed study of LLM-driven crypto Twitter bots was retrieved.
- Research on Telegram shill networks after 2020 (member inflation, fake members) was not retrieved.
- Current X API pricing and access tiers, which limit any bot-detection pipeline, were not researched here.
- No validated thresholds were found for synchrony or duplicate-text detection.

## Q4. Paid KOL promotion detection and KOL track-record scoring

### Takeaway
Undisclosed paid promotion is pervasive: ZachXBT found fewer than 5 of about 160 paid influencers labelled their posts as ads. Peer-reviewed evidence (Merkley et al., 2024) shows influencer tweets are followed by short-term gains and then negative 10- and 30-day returns, worst for small caps. KOL scoring should therefore measure post-call returns over several horizons and check wallets for selling into the call.

### Cited Findings
- **Merkley, Pacelli, Piorkowski, Williams, "The Crypto-Influencers"** (*Review of Accounting Studies* 29(3), 2024, pp. 2254–2297):
  - about 36,000 tweets from 180 influencers across more than 1,600 tokens, over the two years to Dec 2022;
  - returns are positive at first, then significantly negative, with average cumulative returns of −2.24% at 10 days and −6.53% at 30 days;
  - the effect is strongest for small caps, self-described experts and large followings, and stronger for buy-sentiment tweets;
  - profiting requires exiting soon after the tweet.
  - Sources: [RePEc/IDEAS](https://ideas.repec.org/a/spr/reaccs/v29y2024i3d10.1007_s11142-024-09838-4.html); [Futurity](https://www.futurity.org/crypto-influencer-advice-investment-3260122); [Oxford Business Law Blog](https://blogs.law.ox.ac.uk/oblb/blog-post/2023/11/crypto-influencers-give-poor-investment-advice-and-sec-taking-notice)
- **ZachXBT (Sept 2025)**:
  - published a price sheet for more than 200 influencers, with per-post prices from hundreds to tens of thousands of dollars;
  - the sheet included Solana payment wallet addresses and links to on-chain transactions;
  - of about 160 who accepted, fewer than 5 labelled posts as ads.
  - Sources: [The Block](https://www.theblock.co/post/368956/zachxbt-says-over-100-crypto-influencers-accepted-promo-deals-without-disclosing-paid-ads); [Forklog](https://forklog.com/en/zachxbt-exposes-hundreds-of-influencers-for-undisclosed-token-promotions/)
- ZachXBT accused influencer Ansem of promoting hundreds of low-cap Solana memecoins, many of which then fell sharply — [The Defiant](https://thedefiant.io/news/hacks/zachxbt-accuses-influencer-ansem-promoting-solana-memecoin-pump-dumps-ac9dfb13)
- An unverified blog claims more than 50 KOLs promoted SHAR and deleted their tweets after the dump. Low reliability — [Eldorado blog](https://eldorado.io/en/blog/crypto-market-collapse-shar-lessons)
- The US FTC requires influencers to disclose material connections. This is cited in the coverage of ZachXBT's findings — [The Block](https://www.theblock.co/post/368956/zachxbt-says-over-100-crypto-influencers-accepted-promo-deals-without-disclosing-paid-ads)

### Inferences
- KOL score features suggested by the evidence:
  - forward returns per call at 1h, 24h, 10d and 30d, benchmarked against SOL/ETH;
  - share of calls on tokens that later failed safety gates or rugged;
  - deleted-post rate (archive posts at ingestion time);
  - time between the call and the price peak, where a peak within minutes suggests the follower flow is the exit liquidity.
- On-chain linkage: if a KOL's known wallets, or wallets funded from the token deployer or a project treasury, buy before the call and sell within the post-call window, that is strong evidence of front-running or paid promotion. Payment wallets in ZachXBT's sheet show these links can be traced.
- Weight self-described "experts" and accounts with large followings that call small caps negatively by default, per Merkley et al.

### Gaps
- No academic study of Telegram "call channel" front-running (insider buy, call, follower buy, dump) was found within budget.
- No public, validated KOL-scoring methodology from vendors such as GMGN or Kolytics was verified.

## Q5. Recommended filter pipeline and practitioner thresholds

### Takeaway
No published, validated end-to-end standard exists. Practitioners use layered rule-of-thumb gates: contract or authority hard-fails, then LP and holder concentration, then bundler and sniper share, then social and KOL quality. The thresholds below are vendor heuristics, not empirically validated cutoffs.

### Cited Findings
- Solana Tracker weights:
  - freeze authority (7500) is weighted heavier than mint authority (2500);
  - top-10 holders above 15% flagged (5000);
  - LP not burned or locked (4000);
  - no liquidity left = rugged (20000).
  - Source: [Solana Tracker](https://docs.solanatracker.io/guides/token-safety)
- Mobula "healthy" profile: dev holding under 5% (or locked/burned), top 10 holding under 30%, and a bundler cluster defined as 3 or more wallets with similar buys that later consolidate — [Mobula](https://docs.mobula.io/almanac/detecting-snipers-bundlers)
- Webacy high-risk cutoffs: bundlers above 20%, snipers above 30% — [Webacy](https://docs.webacy.com/glossary/snipers-bundlers)
- A pass is not permanent: token behaviour can change after a Honeypot.is pass — [QuickNode guide](https://www.quicknode.com/nl/builders-guide/tools/honeypot-is-by-honeypot-scanner)
- Survival base rate for using liquidity as a filter: under 1.4% of pump.fun tokens kept at least $1,000 of liquidity — [BeInCrypto/Solidus](https://beincrypto.com/pump-fun-tokens-scams-solidus-labs-report/)

### Inferences
Proposed pipeline, synthesised from the sources above:
1. **Hard fail on Solana**: mint or freeze authority not revoked, `balance_mutable_authority`, a non-trusted `transfer_hook`, `default_account_state = Frozen`, or non-transferable. Treat a mutable or upgradable transfer fee as a heavy penalty.
2. **Hard fail on EVM**:
   - `is_honeypot` or `cannot_sell_all`, a failed simulated sell, or a sell tax above about 10%;
   - `owner_change_balance`, `hidden_owner`, `can_take_back_ownership` or `selfdestruct`;
   - a non-renounced owner combined with `slippage_modifiable`, `is_blacklisted` or `transfer_pausable`;
   - an unverified (`is_open_source = 0`) or proxy contract, unless allow-listed.
3. **Liquidity**: LP burned or locked (penalise if under about 95% burned or locked), and a minimum liquidity floor.
4. **Distribution**:
   - top 10 under 30%, dev under 5%, bundlers under 20%, snipers under 30%;
   - exclude LP, burn and CEX addresses from holder concentration.
5. **Deployer reputation**: number of prior launches and their rug rate, and whether snipers were funded by the deployer.
6. **Social authenticity**:
   - account age;
   - mention synchrony and duplicate-text clusters;
   - share of posts with Telegram invite links;
   - cashtag co-mention with majors;
   - share of unique versus repeat posters.
7. **KOL weighting**: down-weight KOLs with negative 10- or 30-day post-call returns, high deleted-post rates, or wallets that sell into their own calls.
8. **Re-check continuously**: re-run steps 1–4 on every refresh, because authorities, taxes and LP state change.

The cutoffs not cited above (a 10% tax, 95% LP burned or locked) are my own suggestions and should be tuned against labelled outcomes.

### Gaps
- I found no published false-positive or false-negative rates for these vendor thresholds.
- I found no open benchmark dataset of Solana memecoins labelled as rug or not rug to calibrate against. The Uniswap datasets from Xia, Mazorra and Cernera exist for EVM only.

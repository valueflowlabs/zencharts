# On-chain & DEX Market Data Sources for a Low-Cap Token Finder (as of Oct 2026)

Research date: 2026-10-26. All prices are USD/EUR per month unless noted and were taken from pages fetched or search-indexed in Oct 2026. Several providers publish conflicting numbers across their own pages; conflicts are flagged inline. Verify on live pricing pages before committing.

## 1. DEX aggregator APIs: DexScreener, GeckoTerminal/CoinGecko, Birdeye, CoinMarketCap

### Takeaway
DexScreener (free, keyless, polling only) and the GeckoTerminal API (keyless at about 10 calls/min, or keyed through CoinGecko plans) are the cheapest ways to detect new pairs and trending tokens. Birdeye is the main paid option with holders, security and WebSocket coverage. None of the pair-based aggregators cover the pump.fun bonding-curve phase. That phase needs launchpad streams (section 2).

### Cited Findings
**DexScreener**
- Free, no API key, no paid tier. Endpoints with a documented 60 req/min limit: `GET /token-profiles/latest/v1`, `/token-profiles/recent-updates/v1`, `/community-takeovers/latest/v1`, `/ads/latest/v1`, `/metas/trending/v1`, `/metas/meta/v1/{slug}` — [DexScreener API reference](https://docs.dexscreener.com/api/reference)
- Other endpoints: `/token-boosts/latest/v1`, `/token-boosts/top/v1` (paid "boosted" tokens), `/orders/v1/{chainId}/{tokenAddress}` (paid orders/profile status for a token), `/latest/dex/pairs/{chainId}/{pairId}`, `/latest/dex/search`, `/token-pairs/v1/{chainId}/{tokenAddress}`, `/tokens/v1/{chainId}/{tokenAddresses}` (multi-address batch) — [DexScreener API reference](https://docs.dexscreener.com/api/reference)
- The pair, token and search endpoints allow 300 rpm and the profile endpoints 60 rpm. There are no candles, per-trade data, WebSocket or history — [MadeOnSol comparison, Sept 2026](https://madeonsol.com/compare-data-apis)
- There is no documented "new pairs" REST endpoint. New tokens surface indirectly through token-profiles/latest (projects that paid for a profile), token-boosts and community-takeovers. Note: this is inferred from the endpoint list above. The official list has no "latest pairs" endpoint.
- DexScreener is built around DEX pairs, so it misses pump.fun tokens still on the bonding curve — [MadeOnSol](https://madeonsol.com/compare-data-apis)

**GeckoTerminal / CoinGecko onchain**
- Keyless public GeckoTerminal API: base `https://api.geckoterminal.com/api/v2`, about 10 calls/min per IP shared pool. CoinGecko keyless allows about 10–30/min. The docs say the keyless API is "not suitable for production workloads, scheduled polling, or high-frequency updates" — [CoinGecko keyless docs](https://docs.coingecko.com/docs/keyless-public-api.md). The old 30 calls/min GeckoTerminal figure appears outdated.
- `apiguide.geckoterminal.com` now 301-redirects to docs.coingecko.com, so GeckoTerminal API docs have moved into CoinGecko's docs — (observed redirect, [docs.coingecko.com](https://docs.coingecko.com/))
- New pools: `/onchain/networks/new_pools` (all networks) and `/onchain/networks/{network}/new_pools`, 20 pools per page. Pages beyond 10 need Analyst or above. Cache refreshes about every 60 s on Demo and 30 s on paid plans. Unverified tokens return a null market cap — [CoinGecko New Pools docs](https://docs.coingecko.com/reference/latest-pools-list)
- Onchain coverage: 200+ networks, 1,800+ DEXes, 39M+ tokens — [CoinGecko API intro](https://docs.coingecko.com/reference/introduction)
- Plans (conflicting sources): Demo is free with a 10K calls/month cap. Its rate limit is quoted as 30/min by Zuplo and 100/min by a CoinGecko entry-plans page. Basic is about $35/mo (~250 rpm), Analyst $129/mo (500 rpm, ~500K credits), Pro $499/mo. A "Lite" tier is mentioned in a changelog — [CoinGecko entry plans](https://www.coingecko.com/en/api/acquisition/entry-plans?locale=ja); [Zuplo](https://zuplo.com/learning-center/coingecko-api); [CoinGecko changelog](https://docs.coingecko.com/changelog/multiple-improvements-onchain-categories-data); [costbench](https://www.costbench.com/software/blockchain-data-api/coingecko-api/)

**Birdeye Data Services (BDS)**
- Tiers from Birdeye docs, via search index: Standard free (30K CU, 1 rps). Starter $99 (3M CU, 15 rps, $33/1M overage). Premium $199 (10M CU, 50 rps / 1,000 rpm). Premium Plus $250 (15M CU, adds WebSocket). Business $699 (70M CU, 100 rps / 1,500 rpm, all APIs + WS). Business Classic $999 (50M API CU + 50M WS CU). Enterprise is custom. The Wallet API group has lower limits — [Birdeye pricing](https://docs.birdeye.so/docs/pricing); [Birdeye rate limiting](https://docs.birdeye.so/docs/rate-limiting)
- Conflict: MadeOnSol lists an entry "Lite" plan at $39/mo (1.5M CU, 15 rps), WebSocket from Premium $199, and x402 pay-per-call at $0.003/request with no WS — [MadeOnSol, verified Sept 2026](https://madeonsol.com/compare-data-apis). Birdeye's own rate-limit page lists Lite at 15 rps but gives no price ([Birdeye rate limiting](https://docs.birdeye.so/docs/rate-limiting)).
- Features: wallet PnL, holders and first buyers, and pump.fun bonding-phase coverage — [MadeOnSol](https://madeonsol.com/compare-data-apis). Per-tier endpoint access is listed in "Data Accessibility by Packages" — [Birdeye docs](https://docs.birdeye.so/docs/data-accessibility-by-packages)
- docs.birdeye.so/docs/pricing now redirects to data.birdeye.so/docs/..., and that redirect target returned 404 at fetch time (observed).

**Other Solana token-data APIs (MadeOnSol comparison, Sept 2026)** — [MadeOnSol](https://madeonsol.com/compare-data-apis) (MadeOnSol sells a competing product)
- SolanaTracker: 2,500 req/mo free (3 rps). €50/mo Advanced gives 200K req. Datastream from €397. Includes top-100 holders, first buyers, a 1–10 risk score, PnL, and KOL/whale feeds. Solana only.
- Jupiter: price API (50 tokens/request), free at 1 rps or $25/mo at 10 rps. No candles, trades or wallet analytics.
- MadeOnSol: 200 calls/day free, €43/mo Pro, €131/mo Ultra DEX firehose. Bonding-phase, KOL and deployer intel.

### Inferences
- A cheap MVP stack: poll DexScreener token-profiles, boosts and takeovers every few seconds (60 rpm) plus GeckoTerminal new_pools per network (keyed Demo for production). Enrich candidates with `/tokens/v1` batch calls (300 rpm). The 30–60 s GeckoTerminal cache makes it unsuitable for sniper-grade latency.
- DexScreener "boosts" and "profiles" are paid marketing signals. They are useful as a feature (the team is spending money) but biased.

### Gaps
- CoinMarketCap "new listings" API (`/cryptocurrency/listings/new`) and its plan costs were not verified in this pass.
- No authoritative latency benchmarks were found for DexScreener, GeckoTerminal or Birdeye.
- The current official Birdeye price table could not be fetched directly (404). Figures come from the search-indexed docs.

## 2. Launchpads: streaming new token creation and graduations

### Takeaway
On Solana, PumpPortal's WebSocket gives free new-token and migration events for pump.fun/PumpSwap (with a separate LetsBonk feed). Bitquery, Helius LaserStream and Yellowstone gRPC providers (Shyft, QuickNode) give lower-level or multi-program streams. For multi-chain launchpads (Zora, Clanker, Four.meme, LaunchLab, Bonk) the most unified feed found is Codex's `onLaunchpadTokenEvent` subscription.

### Cited Findings
- PumpPortal: `wss://pumpportal.fun/api/data`. Methods: `subscribeNewToken`, `subscribeMigration`, `subscribeTokenTrade` (by CA) and `subscribeAccountTrade` (by wallet). New-token and migration streams are free. Token/account trade streams cost 0.01 SOL per 10,000 events and need an API key plus a linked wallet funded with at least 0.02 SOL. One WebSocket connection only; abusive clients are banned for 1 hour. A separate LetsBonk.fun data page exists — [PumpPortal real-time docs](https://pumpportal.fun/data-api/real-time)
- Bitquery Pump.fun API covers trades, prices, token creation, creator holdings, bonding-curve progress and migration to PumpSwap, over GraphQL/WebSocket/gRPC/Kafka — [Bitquery Pump.fun API](https://bitquery.io/products/pumpfun-api); [Bitquery docs](https://docs.bitquery.io/docs/blockchain/Solana/Pumpfun/pump-fun-to-pump-swap/). Its PumpSwap product page claims "sub-300ms" — [Bitquery PumpSwap](https://www.bitquery.io/products/pumpswap-api)
- Bitquery pricing: Personal $39/mo (100K points ≈ 20K calls, annual), WebSocket from Pro $79, Kafka via sales — [MadeOnSol](https://madeonsol.com/compare-data-apis). Add-on rates conflict between Bitquery's own pages: $40/1M points, $40/200K stream-minutes and $40/5GB ([PumpSwap page](https://www.bitquery.io/products/pumpswap-api)) vs. $20/100K stream-minutes and $8/GB ([Token API page](https://www.bitquery.io/products/digital-assets)). Archive packs start at $100/mo.
- Bitquery launch-detection technique: watch for the initial supply mint transfer (1B for most launchpads, 100B for Clanker) — [Bitquery Robinhood meme launches](https://docs.bitquery.io/docs/blockchain/robinhood/robinhood-meme-coin-launches/)
- Codex `onLaunchpadTokenEvent` subscription accepts launchpad names including Pump.fun, Zora, Clanker (incl. Clanker V4), Four.meme, LaunchLab and Bonk — [Codex docs](https://docs.codex.io/api-reference/subscriptions/onlaunchpadtokenevent)
- Open-source `launchpad-registry`: program IDs, factories and launch events for pump.fun, Raydium LaunchLab (plus letsbonk, StonkFun), Meteora DBC-based launchpads and EVM launchpads, plus a detector for unregistered launchpads — [GitHub dynamolabs/launchpad-registry](https://github.com/dynamolabs/launchpad-registry)
- Launchpad landscape as of July 2026: Four.meme leads on BNB Chain, Zora (with Clanker as an alternative) on Base, and Raydium LaunchLab for more structured launches. BONK.fun and Bags are also major Solana launchpads — [Coin Bureau](https://coinbureau.com/analysis/best-memecoin-launchpads)
- Helius LaserStream: WebSocket on Free/Developer, gRPC on devnet only for Developer, and mainnet gRPC from Business ($499) or Professional ($999). Streaming is billed per data consumed (changes effective 2026-04-07). Professional data add-ons run 5 TB/$400 to 100 TB/$6,000 per month — [Helius plans](https://helius.dev/docs/billing/plans); [Helius credits](https://helius.dev/docs/billing/credits)
- Shyft: free tier with unlimited credits (10 RPC rps / 1 API rps). Build $199/mo is unmetered at 100 rps and includes Yellowstone gRPC and RabbitStream — [MadeOnSol](https://madeonsol.com/compare-data-apis)
- QuickNode bundles Yellowstone gRPC with Streams/Webhooks in its plans — [QuickNode comparison blog](https://www.quicknode.com/blog/deep-dive-comparison-infura-alchemy-quicknode)

### Inferences
- The free PumpPortal feed is enough for a pump.fun "new token" and "graduation" detector. Trade-level streams for scoring early buyers cost little (0.01 SOL per 10K events) but add up when subscribing to many tokens.
- On EVM chains (Base/BNB), launches can be detected by listening to the launchpad factory contract events (Clanker/Zora/Four.meme) through any WebSocket RPC. Codex or Bitquery save the work of maintaining per-launchpad ABIs.

### Gaps
- No official 2026 streaming docs were found from Four.meme, Zora, Clanker, Virtuals or Raydium LaunchLab themselves.
- Codex pricing was not retrieved.
- Independent latency benchmarks (PumpPortal vs gRPC) were not found. The figure is a common claim but unverified here.

## 3. RPC / indexer providers: pricing and suitability for holders and wallet tracking

### Takeaway
Helius (Solana) and QuickNode/Alchemy (multi-chain) are raw-data infrastructure. Holder distribution needs DAS or getProgramAccounts-style scans or an indexer. Moralis and Birdeye/SolanaTracker return holder lists directly. Bitquery offers holder and creator queries through GraphQL.

### Cited Findings
- Helius plans: Free $0 (1M credits, 10 rps), Developer $49 (10M, 50 rps), Business $499 (100M, 200 rps), Professional $999 (200M, 500 rps). The pricing and plan changes took effect 2026-04-07. Helius offers no OHLCV, prices or PnL — [Helius plans](https://helius.dev/docs/billing/plans); [MadeOnSol](https://madeonsol.com/compare-data-apis)
- QuickNode (QuickNode's own comparison, "verified Aug 2026"): 1-month free trial (10M credits, 15 rps). Build $49 (80M, 50 rps), Accelerate $249 (450M, 125 rps), Scale $499 (950M, 250 rps), Business $999 (2B, 500 rps). Overage is $0.62 to $0.50 per 1M. Flat-rate EVM starts at $799/mo for 75 rps (Mar 2026) — [QuickNode blog](https://www.quicknode.com/blog/deep-dive-comparison-infura-alchemy-quicknode)
- Moralis: Starter $149/mo billed annually (2M CU, 40 rps), Pro $249 (100M CU), Business $749 (500M CU). Overage is $11.25, $5 and $4 per 1M CU respectively. EVM getTokenHolders costs 50 CU. Solana holders endpoint: `solana-gateway.moralis.io/token/{network}/holders/{address}`, plus holder-metrics — [Moralis pricing docs](https://docs.moralis.com/data-api/pricing); [Moralis holder metrics](https://docs.moralis.com/data-api/solana/token/holders/holder-metrics). Conflict: MadeOnSol lists Starter at $49 and a free tier of 40K CU/day ([MadeOnSol](https://madeonsol.com/compare-data-apis)), while Moralis docs say there is no self-serve free plan. Moralis covers pump.fun endpoints, but its wallet PnL is EVM-only.

### Inferences
- For holder-concentration metrics on Solana, an aggregator (Birdeye, SolanaTracker, Moralis) is cheaper in engineering time than computing from raw RPC.

### Gaps
- No current 2026 pricing was retrieved for Alchemy, Covalent/GoldRush, Dune API or Flipside. Flipside's free-tier status in 2026 was not verified.

## 4. Smart-money / wallet labeling

### Takeaway
GMGN (Solana/BSC/Base) offers an official Agent API and Skills, reportedly free but rate-limited. Cielo gates its API behind paid plans. Nansen has usage-based API pricing. Arkham sells credit-based API access by application/quote. Birdeye and SolanaTracker expose wallet PnL and first-buyer data, which can be used to build a custom smart-money list.

### Cited Findings
- GMGN: the official Agent API/OpenAPI covers tokens, wallets and market data and executes trades on Solana, BSC and Base. The key is created by uploading a locally generated public key — [GMGN Agent API docs](https://docs.gmgn.ai/index/gmgn-agent-api); [GitHub GMGNAI/gmgn-skills](https://github.com/GMGNAI/gmgn-skills); [GMGN blog](https://gmgn.ai/blog/how-to-track-smart-money-with-ai-agents/). A third-party page claims data endpoints are free but rate-limited (unverified) — [gmgnaiapp.com](https://gmgnaiapp.com/api/gmgn-api/)
- Nansen: free tier plus Pro at about $49/mo (annual) or $69/mo (monthly), per several 2026 reviews. Others cite $99 or $149+, so sources conflict. API access is usage-based, with a reported ~$0.01/call for foundational endpoints and ~$0.05/call for premium signal endpoints — [toolrank](https://toolrank.io/tools/nansen/); [diyai](https://diyai.io/ai-tools/crypto/reviews/nansen-ai-review/); [cryptint](https://cryptint.io/compare/nansen). These are secondary sources.
- Arkham: the Intel API uses credit-based per-endpoint billing with no published list rates, and enterprise access requires an application. A third-party estimate of $150–$3,000/mo is unconfirmed — [Arkham API](https://arkm.com/api); [rfp.wiki](https://www.rfp.wiki/crypto/digital-assets-nfts/crypto-data-analytics-market-risk/arkham-intelligence)
- Cielo: the API covers tracked wallets and PnL across 30+ chains. Sources disagree on access. The consumer "Whale" plan at $199/mo unlocks the API ([QuickNode builders guide](https://www.quicknode.com/builders-guide/tools/cielo-finance-by-cielo); [cielo.finance](https://cielo.finance/)). Developer plans are 5K credits/mo free (10 rps) and Builder $89/mo (100K credits, 25 rps, WebSocket) ([MadeOnSol](https://madeonsol.com/compare-data-apis); [Cielo dev reference](https://developer.cielo.finance/reference/gettrackedwallets))
- Birdeye exposes wallet PnL and "first buyers". SolanaTracker exposes first buyers, PnL and KOL/whale feeds. MadeOnSol exposes KOL/deployer intel and wallet PnL — [MadeOnSol](https://madeonsol.com/compare-data-apis)
- PumpPortal `subscribeAccountTrade` streams all trades by a given list of wallets (0.01 SOL per 10K events), which fits copy-trading or smart-wallet alerting — [PumpPortal](https://pumpportal.fun/data-api/real-time)

### Inferences
- A common DIY method: for tokens that did well, pull the first N buyers (Birdeye or SolanaTracker "first buyers"), compute realized PnL and hit rate per wallet across many tokens, and keep wallets with repeated early profitable entries. Filter out bundler, dev-linked and sniper-bot wallets by funding source and timing. Then watch those wallets through account-trade streams. (Inference based on the available endpoints, not a cited playbook.)

### Gaps
- DeBank OpenAPI pricing and Birdeye "smart money" endpoint specifics were not retrieved.
- Official GMGN rate limits were not confirmed.

## 5. Key metrics and security checks

### Takeaway
Standard low-cap screens combine market data (liquidity, FDV/market cap, volume/liquidity, buy/sell counts) with contract/holder risk (top-10 holder %, dev holdings, mint/freeze authority, LP burned/locked, honeypot). GoPlus (multi-chain) and RugCheck (Solana) are the common security APIs.

### Cited Findings
- GoPlus Token Security API: free tier of 150K CU/month, 30K CU/day and 150 CU/min. Batch calls are paid-only. Returns honeypot status, contract verification, ownership flags and holder concentration — [GoPlus security API](https://gopluslabs.io/zh/security-api); [GoPlus forum](https://docs.gopluslabs.io/discuss/68d6607e1c829d912557b2bb); [policylayer](https://policylayer.com/tools/wolfpack-intelligence/security-check). Burst throttling behavior is undocumented.
- RugCheck (Solana): base `api.rugcheck.xyz/v1`, with an API key from its dashboard. Analyzes liquidity state, ownership concentration and mint permissions, and returns risk level, score and warnings. Numeric rate limits are unpublished (returns 429) — [QuickNode builders guide](https://www.quicknode.com/zh/builders-guide/tools/rugcheck-by-rugcheck-team); [qodex guide](https://qodex.ai/blog/how-to-get-a-rugcheck-api-key-and-start-using-the-api)
- SolanaTracker returns top-100 holders and a 1–10 risk score — [MadeOnSol](https://madeonsol.com/compare-data-apis)
- Moralis holder-metrics endpoint for Solana tokens (holder counts and distribution) — [Moralis docs](https://docs.moralis.com/data-api/solana/token/holders/holder-metrics)
- Bitquery Pump.fun data includes creator holdings and bonding-curve progress, which can serve as the dev-wallet % and graduation-proximity metrics — [Bitquery Pump.fun API](https://bitquery.io/products/pumpfun-api)

### Inferences
- Suggested derived features, each computable from the endpoints above: liquidity USD, FDV and market cap, vol24h/liquidity, buys/sells count ratio over 5m/1h (DexScreener `txns`), unique buyers, holder count growth, top-10 % excluding LP/curve accounts, dev %, mint/freeze authority revoked (Solana), LP burned or locked, honeypot/tax (EVM via GoPlus), age since creation, and bonding-curve %.
- On pump.fun, LP-burn checks matter after migration (PumpSwap). Before that, liquidity sits in the bonding curve, and the curve account must be excluded from top-holder %.

### Gaps
- Field-level schemas for RugCheck and GoPlus (exact LP-burn and mint-authority keys) were not verified.
- No published industry-standard thresholds (e.g. "top-10 > 30% = risky") from a primary source were found.

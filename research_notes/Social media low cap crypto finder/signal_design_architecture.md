# Signal design and system architecture for a low-cap crypto finder (social + on-chain), and fit with zencharts

Research date: 2026-10-26. Scope: what existing tools compute, how to design and combine signals, ingestion/processing architecture, and how to implement it inside the zencharts Next.js 16 repo.

**Anchor finding for the whole document:** In mid-January 2026 X revoked API access for "InfoFi" apps that pay users to post. Kaito shut down Yaps and its incentivised leaderboards, and Cookie's Snaps product was discontinued. X's API is now prepaid pay-per-use, at about $0.005 per post read with a monthly read cap of 2–3M. Together this makes X an expensive, policy-fragile confirmation layer rather than a firehose. The cheaper primary sources in 2026 are Telegram (MTProto userbot) and on-chain/DEX streams (pump.fun via PumpPortal, Helius, DexScreener). Sources are given in the sections below.

---

## 1. Existing products and open-source projects: what they expose and how they define "trending"

### Takeaway
No major product publishes its trending formula. What they do publish is the list of inputs. DexScreener uses volume, liquidity, transactions, unique makers, holders, page visitors, reactions and verification/security. LunarCrush uses social interactions, contributors, dominance, sentiment and price relative to BTC. GMGN uses smart-money and KOL wallet counts plus rug, bundler and sniper risk ratios. The social "mindshare" layer (Kaito Yaps, Cookie Snaps) was largely dismantled in January 2026 after X's API policy change, so a 2026 design has to own its social ingestion.

### Cited Findings
**DexScreener**
- DexScreener gives every token a "Trending Score", described as "a snapshot of the token's buzz and market activity", and uses it to rank the trending screener and trending bar. — [DexScreener docs: Trending](https://docs.dexscreener.com/trending)
- Official input groups:
  - Market Activity: volume, liquidity, transactions, unique makers, holders.
  - Community Engagement: visitors to the token's DexScreener page on web and app, and reactions (rocket, fire, poop and red-flag emojis).
  - Trust & Credibility: verified token info gets a boost, especially Enhanced Token Info, and open-source tokens that pass security checks are valued.

  The docs keep the weighting private ("we keep the special blend of our algorithm close to our chest"). — [DexScreener docs: Trending](https://docs.dexscreener.com/trending)
- Third-party claims that DexScreener weights 1h volume and price change are unsourced. "Boost" sellers sell placement, which means paid boosts are part of what "trending" reflects. — [memefactory (unverified)](https://memefactory.it.com/blog/dex-screener-trending); [DexScreener docs search result](https://docs.dexscreener.com/llms-full.txt)
- The public DexScreener API has 13 GET endpoints:
  - Six have a stated limit of 60 req/min: `/token-profiles/latest/v1`, `/token-profiles/recent-updates/v1`, `/community-takeovers/latest/v1`, `/ads/latest/v1`, `/metas/trending/v1`, `/metas/meta/v1/{slug}`.
  - Seven have no stated limit: `/token-boosts/latest/v1`, `/token-boosts/top/v1`, `/orders/v1/{chainId}/{tokenAddress}`, `/latest/dex/pairs/{chainId}/{pairId}`, `/latest/dex/search`, `/token-pairs/v1/{chainId}/{tokenAddress}`, `/tokens/v1/{chainId}/{tokenAddresses}`.

  — [DexScreener API reference](https://docs.dexscreener.com/api/reference)

**Birdeye**
- Birdeye exposes `GET https://public-api.birdeye.so/defi/token_trending`, which returns trending tokens ordered by the sort criteria you pass. — [Birdeye API reference](https://docs.birdeye.so/reference/get_defi-token-trending)
- A community skill page shows `?sort_by=rank&sort_type=asc&limit=20` at a cost of 50 CU, with the key in `BIRDEYE_API_KEY`. I have not checked this against the official docs. — [skills.sh birdeye](https://skills.sh/sendaifun/skills/birdeye)

**GMGN**
- GMGN's own agent-skills/CLI docs tag KOL wallets as `renowned` (publicly identified influencers or known traders) and smart money as `smart_degen` (wallets "with a statistically proven record of profitable trading, identified by GMGN's algorithm"). The docs say KOL trades carry social/marketing signal and are "not necessarily alpha", while smart-money trades are the stronger alpha signal. — [GMGN agent skills docs](https://docsearch.algolia.com/mcp/docs/repo/gmgnai/gmgn-skills)
- Token-level fields: `smart_degen_count` and `renowned_count`, plus holder categories (smart money, KOL, rat trader, bundler, sniper). `rug_ratio` is a 0–1 score where >0.3 means high risk. — [GMGN agent skills docs](https://docsearch.algolia.com/mcp/docs/repo/gmgnai/gmgn-skills)
- Pre-trade safety checks: honeypot detection, LP burned, mintable flag, renounced contract, insider/"rat" wallet ratio, bundle-buy ratio, dev holdings and top-10 concentration. GMGN also has FOMO alerts on tracked wallets and tokens, and copy trading. — [GMGN agent skills docs](https://docsearch.algolia.com/mcp/docs/repo/gmgnai/gmgn-skills); [CryptoPotato GMGN review 2026](https://cryptopotato.com/gmgn-review/)

**LunarCrush**
- Galaxy Score "indicates how healthy a coin is by looking at combined performance indicators across markets and social engagement". AltRank "combines ALT coin price performance relative to Bitcoin and other social activity indicators across the entire crypto market" and ranks a coin against every other supported coin, so a coin can hold AltRank 1 even in a bear market. — [PyPI lunarcrush client](https://pypi.org/project/lunarcrush/1.0.1)
- LunarCrush's own blog says to watch rank changes over time rather than the absolute number. — [LunarCrush blog on AltRank](https://lunarcrush.com/blog/how-to-use-lunarcrush-altrank-to-spot-altcoin-momentum-before-the-crowd)
- Inputs: posts from X, Reddit, YouTube, TikTok, Instagram and news across 4,000+ assets. Processing steps are topic classification, spam/bot filtering, sentiment scoring and creator weighting. — [API Evangelist LunarCrush profile](https://providers.apievangelist.com/providers/lunarcrush/)
- Field names (from an SDK README, not the official schema):
  - `galaxy_score`: a "proprietary social score" on a 0–100 scale.
  - `alt_rank`.
  - `interactions` and `interactions_24h`: total social engagements.
  - `contributors_active`: "Creators".
  - `social_dominance`: share of total crypto discussion.
  - `sentiment`: 0–100.
  - The v4 API is REST/JSON with Bearer auth.

  — [lunarcrush-sdk README](https://unpkg.com/lunarcrush-sdk@3.5.2/README.md); [LunarCrush support: What is the API](https://lunarcrush.com/support/what-is-the-lunarcrush-api)
- LunarCrush reports interactions, contributors, posts and sentiment per topic per hour. — [API3 Airnode LunarCrush](https://airnodehub.api3.org/explore/lunarcrush)

**Kaito and Cookie (social "mindshare")**
- Kaito's mindshare formula is not public. The best outside guess is a hybrid of impressions, engagement rate and engager quality, normalised against total engagement, with each engagement type (likes, replies, reposts, quotes) weighted differently. — [0xKepler "WTF is Mindshare?"](https://0xkepler.substack.com/p/wtf-is-mindshare)
- On 2026-01-15 X said it would stop allowing apps that pay users to post. It revoked API access for InfoFi projects. Kaito announced it would wind down Yaps and incentivised leaderboards and pivot to "Kaito Studio", and Xeet stopped all campaigns. — [Decrypt](https://decrypt.co/354736/elon-musks-x-bans-access-infofi-crypto-projects-ai-slop-backlash); [Unchained](https://unchainedcrypto.com/x-bans-incentivized-posting-apps-prompting-shakeup-in-crypto-engagement-platforms/); [Whale Alert story](https://whale-alert.io/stories/eb7aaf8a751c/Kaito-Shuts-Down-Yaps-After-X-Bans-Incentivized-Posts-Launches-Kaito-Studio)
- Cookie Snaps was discontinued in January 2026 after X's API policy change. — [CoinMarketCap CMC-AI on Cookie (ES)](https://coinmarketcap.com/es/cmc-ai/cookie/what-is/)
- Cookie's API ("data swarms") is token-gated: subscriptions are paid in COOKIE, 50% burned and 50% to the treasury. It offered mindshare metrics, top-CT-account mapping and narrative tracking. — [fraxcesco Substack](https://fraxcesco.substack.com/p/making-sense-of-the-ai-landscape); [DappRadar Cookie guide](https://dappradar.com/blog/ultimate-guide-to-cookie-fun-and-cookie-dao-revolutionizing-ai-and-web3-analytics)

**Open source**
- Memecoin Observatory MCP (tony-42069/solana-mcp) scans contract code and developer wallets for rug-pull patterns and claims early-mention monitoring on Twitter, Reddit and Telegram. — [README](https://cdn.jsdelivr.net/gh/tony-42069/solana-mcp@master/README.md)
- Emblem memecoin scout uses rugcheck for Solana risk but lists social sentiment as not supported. — [skillselion](https://skillselion.com/skills/emblemcompany/agent-skills/emblem-memecoin-scout)
- Soul is a Telegram scanner for Solana token security, deployer info and market metrics. Its open-source status is unknown. — [Solana Compass](https://solanacompass.com/projects/soul)

### Inferences
- Every surveyed product splits "trending" into roughly three families: market activity, attention/engagement, and trust/risk. A homegrown score should keep the same three-part structure. Trust/risk works better as a gate or multiplier than as an additive term.
- DexScreener's trending input includes on-site visitors, reactions and paid verification. That makes it a lagging, partly paid signal, useful as a cross-platform confirmation feature rather than as ground truth.
- GMGN's split between `renowned` (KOL = marketing) and `smart_degen` (profitable wallets = alpha) is the most useful taxonomy to copy. KOL attention and smart-money flow should be separate features, not one "influencer" feature.
- Kaito/Cookie-style X mindshare is now hard to buy from a third party and expensive to build, so the social layer should be built mainly on Telegram.

### Gaps
- Photon, BullX, Moby/Assisterr and the Solana Telegram trending bots (paid "trending" channels) were not researched within the tool budget. I have no sourced feature lists for them.
- No official LunarCrush v4 field schema, pricing or rate limits were retrieved; the official docs page did not render. Birdeye's full `sort_by` options and its auth header name were not confirmed from official docs.
- Kaito's current (post-Yaps) "Kaito Studio" and Pro API data offering was not researched.

---

## 2. Signal design: features, extraction, sentiment, smart money, scoring, backtesting

### Takeaway
Build the score from robust, hard-to-fake components:
- **Attention:** mention velocity and acceleration as z-scores over each token's own baseline, counted by unique authors and channels rather than raw messages, with KOL weighting and cross-platform confirmation.
- **Flow:** smart-money wallet buys, unique makers, holder growth.
- **Risk:** hard gates for liquidity, holder concentration, rug/bundler ratios and wash-trading patterns.

Peer-reviewed evidence (arXiv 2507.01963) shows that 82.8% of high-return memecoins showed at least one manipulation signal and that volume is easily faked. Raw volume should therefore never be a positive feature without wash-trade filtering. The manipulation-detection thresholds from that paper double as ready-made labelling rules for backtests.

### Cited Findings
**Manipulation base rates and concrete thresholds** ([arXiv 2507.01963, "A Midsummer Meme's Dream"](https://arxiv.org/html/2507.01963v2))
- Dataset: 34,988 memecoins on Ethereum, BSC, Solana and Base. 31,811 remained after validation and 20,688 had economic data. 707 tokens returned more than 100% over three months of tracking.
- 82.8% of the high-return tokens (586/707) show at least one manipulation or suspicious-activity signal.
- Wash trading appeared in 287 tokens, 183 of them on Solana.
- Liquidity Pool-Based Price Inflation (LPI) appeared in 40 tokens across 72 events. The median price increase was 661% on Solana, and the median buy was only about $54.
- Holder concentration: 359 tokens (50.78%) had top-10 holders owning more than 30% of supply.
- 60 tokens had pump-and-dumps, 54 of them on Solana, and 61.67% of those had earlier artificial growth.
- 124 tokens were delisted. 67.74% of them showed artificial growth and 24.19% showed later profit extraction.
- Losses were at least $9.3M across 17,000+ victim addresses.
- Detection rules:
  - Wash trading candidate: a day with volume up more than 500% and price change under 5%. Confirmed by zero-risk position (buy and sell volumes within 2%), circular volume (at least 99% of volume from same-day round-trippers), and a coordinated-manipulator test.
  - LPI: 24h price above +100% with low volume growth, at least 90% of daily volume being buys, and no more than 10 unique traders.
  - Pump-and-dump: RSI above 80, a rise of more than 50%, a volume surge of more than 500%, then a dump of more than 30%.
  - Rug pull: a single-day drop of more than 99% with a sustained volume drop of more than 99%.
- The authors say platforms "rely on volume and liquidity metrics that can be easily manipulated". Early wash trading or LPI often came before the exit, which gives an early-warning window.
- The paper did **not** study social signals and lists that as future work. It does not validate or refute social features.

**Contract-address extraction**
- Common Solana address regex: `^[1-9A-HJ-NP-Za-km-z]{32,44}$`, the base58 alphabet at 32–44 characters. Stronger validation decodes the string and requires exactly 32 bytes. — [Haveno commit](https://git.hackliberty.org/Git-Mirrors/haveno/commit/0b93930d1953b8cb106788db06cfb8d5df77a12c); [Solana Ruby Kit Addresses](https://www.rubydoc.info/gems/solana-ruby-kit/7.0.0/Solana/Ruby/Kit/Addresses)
- Solana public addresses are 32–44 characters long. — [Nick Frosty, How to derive Solana addresses](https://dev.to/nickfrosty/how-to-derive-solana-addresses)
- Solana base58 addresses have no checksum, so a regex can only check characters and length, not whether the address is real. — [TokenPocket Solana FAQ](https://help.tokenpocket.pro/en/wallet-faq-en/solana-wallet/sol-address)

**Sentiment model**
- ElKulako/cryptobert:
  - Built on `vinai/bertweet-base` and pre-trained on more than 3.2M crypto social posts: StockTwits 1.875M, Telegram 664K from five exchange groups, Reddit 172K, Twitter 496K.
  - Fine-tuned on a balanced set of 2M labelled StockTwits posts.
  - Labels: Bearish 0, Neutral 1, Bullish 2.
  - Max training sequence length is 128, and the card advises against going longer.
  - MIT licence. No evaluation metrics on the card; it cites an IEEE paper.

  — [Hugging Face model card](https://huggingface.co/ElKulako/cryptobert)
- CryptoBERT's training data is from 2018–2022 (Telegram Nov 2020–Jan 2021, StockTwits Nov 2021–Jun 2022), which predates pump.fun-era slang. — [Hugging Face model card](https://huggingface.co/ElKulako/cryptobert)

**Social-signal predictive evidence**
- I found no peer-reviewed paper that tests whether social or Telegram signals predict pump.fun returns. An Erasmus thesis, "Predictive power of Telegram messages on cryptocurrency returns", exists, but only its metadata was seen. — [Erasmus thesis](https://thesis.eur.nl/pub/68186/)
- arXiv 2412.04913 offers a multimodal analysis of memecoins, covering cultural and community factors, but I found no return-prediction result in it. — [arXiv 2412.04913](https://arxiv.org/html/2412.04913v1)

### Inferences
These are design proposals, not findings.

**Per-token feature vector, built every 1 minute, with 5m/15m/1h/6h windows.**

*Attention*
- `mentions_w`, `uniq_authors_w`, `uniq_channels_w`.
- Velocity `v = uniq_authors_5m`.
- Robust z-score against the token's own trailing baseline: `z = (v - median_24h) / (1.4826·MAD_24h + ε)`.
- New tokens have no baseline. For those, use a global prior: the cohort median for tokens of the same age bucket.
- Acceleration `a = z_5m - z_15m`, or the slope of the last N z-values.

*KOL weighting*
- `kol_mentions = Σ w_author`, with `w_author` learned from that author's historical hit rate. Hit rate is the fraction of their first-mentions that reached +100% within 24h before a −50% drawdown, shrunk toward a prior (Bayesian average) to avoid overfitting small samples.
- Keep a separate feature for "first-mention by a paid shill channel". Many Telegram calls are paid, so this can be a negative signal.

*Cross-platform confirmation*
- A count of distinct sources (TG channels, X, DexScreener boosts/profiles, GMGN smart money) that touched the token within 30 min.
- A bonus when independent clusters agree, i.e. the authors do not share a forward/retweet graph.

*Extraction pipeline*
1. Normalise text: unwrap t.me, dexscreener, pump.fun, birdeye and gmgn URLs, because CAs often sit inside URLs, e.g. `dexscreener.com/solana/<pair>` or `pump.fun/coin/<mint>`.
2. Solana: `\b[1-9A-HJ-NP-Za-km-z]{32,44}\b`, then base58-decode to exactly 32 bytes, then confirm existence with a mint-account lookup or a DexScreener `/tokens/v1/solana/{addr}` call.
3. Drop 87–88 character base58 strings, which are transaction signatures. Pump.fun mints commonly end in `pump`, which is a useful prior; this is an observation, not sourced.
4. EVM: `\b0x[a-fA-F0-9]{40}\b`, then optionally an EIP-55 checksum check, then disambiguate the chain via the DexScreener `/latest/dex/search` or token-pairs endpoints.
5. Cashtags (`$WIF`) are ambiguous because many tokens share a ticker. Resolve a ticker only if the same message, thread or channel carried a CA in the last N hours. Otherwise pick the highest-liquidity pair, mark it `confidence=low`, and never alert on cashtag-only matches.

*Sentiment*
- Treat sentiment as a weak feature. For speed and cost, use CryptoBERT as the first pass.
- For the top-K candidates only, run an LLM classifier with a structured output schema: {is_shill, is_scam_warning, is_call, sentiment, mentions_ca}. Scam/rug warnings ("rugged", "honeypot", "dev sold") matter more than bullish/bearish polarity.
- FinBERT is trained on financial news, so expect a domain mismatch for CT/TG slang. This is an inference; I found no head-to-head benchmark.

*Smart-money flow*
- Maintain your own wallet list, scored by realised PnL and win rate over the last 30–90 days, with GMGN `smart_degen` as a seed or cross-check.
- Features: `sm_buyers_15m` (distinct wallets), `sm_net_flow_usd_15m`, and time since first smart-money buy relative to first social mention, which tells you whether the social buzz came before or after the on-chain buying.

*Market and holder features*
- `holders_growth_1h`, `unique_makers_1h`, buy/sell ratio, and liquidity in USD.
- Bonding-curve progress for pump.fun tokens.
- Top-10 holder share, dev holding, bundler share and sniper share.

**Hard gates** (reject before scoring):
- Liquidity below $10–20k.
- Top-10 holders above 30% excluding LP/curve; this is the paper's threshold.
- `rug_ratio` above 0.3; this is GMGN's threshold.
- Mint or freeze authority not revoked.
- Honeypot flag.
- Wash-trade pattern in the last 24h: volume up more than 500% with price change under 5%.
- LPI pattern: 10 or fewer unique traders with at least 90% buys during a price jump of more than 100%.

**Score**
- `score = σ(β·[z_attn, accel, kol, xplat, sm_flow, holder_growth, makers]) × risk_multiplier`.
- Start with hand-set weights, using rank-normalised features (percentile within the current active universe) so each term is bounded in [0, 1].
- Then fit β with logistic regression or LightGBM on labelled history.
- Alert when the score crosses a threshold and at least two independent families agree, e.g. attention plus smart money.

**Backtesting and labelling**
- *Point-in-time snapshots.* Store every feature vector as it was at time t, append-only, and never recompute features from data that arrived later.
- *Look-ahead traps:*
  - Holder counts and DexScreener metadata fetched after the fact.
  - Indexer backfills.
  - The KOL hit rate must be computed only from calls made before t.
- *Survivorship bias.* Tokens that rugged or were delisted disappear from APIs, so the universe must be every token you observed at t, including dead ones. The paper's 124 delisted tokens show how big this effect is.
- *Labels* use forward windows from the alert time:
  - Max return over 1h/6h/24h.
  - A first-passage label: "+100% before −50%", which is tradeable-aware.
  - A "rug within 24h" label using the paper's rug rule.
  - Model fills at the price after your detection latency plus a slippage function of liquidity. Low-cap AMM slippage dominates returns.
- *Evaluation:*
  - Precision@K per day.
  - Hit rate versus a base rate of random new tokens of the same age and liquidity.
  - Walk-forward splits by time, never random splits.
  - Report how many alerts would have been rugs.

### Gaps
- No sourced comparison of CryptoBERT vs FinBERT vs LLM accuracy on memecoin and TG slang.
- No sourced study of how far social velocity leads memecoin returns. The design above is untested.
- No peer-reviewed backtesting protocol specific to memecoin signals. The labelling rules above adapt the manipulation paper's definitions plus standard quant practice.
- The EVM regex, the cashtag disambiguation, the "pump" suffix and the 87–88 character signature length are from general knowledge or inference; I retrieved no source for them in this session.

---

## 3. Architecture: streaming ingestion, storage, workers, cost, alerting

### Takeaway
Persistent websockets cannot live in Vercel Functions: the Telegram MTProto session, the PumpPortal WS and the Helius WS all need a connection that stays open. Functions are capped at 300s on Hobby, 800s on Pro and 1800s in beta, and Hobby cron runs only once a day. The design therefore needs one small always-on worker process on Fly.io, Railway, Hetzner or similar. That worker writes to Postgres (with Timescale or plain partitioned tables) plus Redis. The Next.js app only reads, and optionally runs per-minute Pro cron jobs for REST pollers. Social data cost is dominated by X: at $0.005 per read, 100k posts a day is about $500/day. That pushes the design to Telegram first, with X used only for targeted lookups on candidates.

### Cited Findings
**Vercel limits**
- Cron limits per plan:
  - Hobby: once per day, with ±59 min precision. More frequent expressions fail at deploy.
  - Pro and Enterprise: once per minute, with per-minute precision.
  - Every plan allows 100 cron jobs per project.
  - Cron invocations are billed as normal Function usage.

  — [Vercel Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- Fluid compute max duration: Hobby 300s (default and maximum). Pro/Enterprise default 300s, maximum 800s. An extended maximum of 1800s is in beta and must be set via a per-function `maxDuration`. — [Vercel Functions limitations](https://vercel.com/docs/functions/limitations); [Fluid compute](https://vercel.com/docs/concepts/functions/fluid-compute)
- Vercel Queues is billed per API operation, including send and receive. — [Vercel Queues pricing](https://vercel.com/docs/queues/pricing)
- Third-party mirrors add more detail, unverified against Vercel's own page:
  - Public beta since 2026-02-27.
  - About $0.60 per million operations, metered in 4 KiB chunks.
  - Idempotency-keyed sends cost 2x.
  - Retention from 60s to 24h.

  — [mcpservers.org vercel-queues skill](https://mcpservers.org/agent-skills/openai/vercel-queues)

**X API cost** (secondary sources; I could not reach X's official page)
- Since 2026-02-06 the X API is prepaid pay-per-use for new developers. Post reads cost $0.005 per returned post and user-object reads $0.010, so a 100-post search costs about $0.50. The Basic ($200/mo) and Pro ($5,000/mo) tiers are closed to new signups. — [OpenTweet pay-per-use](https://opentweet.io/how-to/x-api-pay-per-use-explained); [MediaNama](https://www.medianama.com/2026/02/223-x-developer-api-pricing-pay-per-use-model/); [Blotato](https://www.blotato.com/blog/twitter-api-pricing)
- Sources disagree on the monthly post-read cap: many guides say 2M and one says 3M. Enterprise is roughly $42k+/month. — [PostEverywhere](https://posteverywhere.ai/blog/x-twitter-api-pricing); [PostProxy](https://www.postproxy.dev/blog/x-api-pricing-2026/)

**Telegram ingestion**
- MTProto user-account clients such as GramJS can read full channel history and receive new messages, not only messages sent to a bot as with the Bot API. This needs API credentials from my.telegram.org and a saved string session. — [Telegram MCP server (GramJS)](https://www.remoteopenclaw.com/mcp/kamalbuilds/telegram-mcp-server); [gram.js.org](https://gram.js.org/)
- Listener pattern: `client.addEventHandler(handler, new NewMessage({chats: [...]}))`, registered before connect. — [Habr/Selectel article](https://habr.com/en/companies/selectel/articles/802629)

**Pump.fun / PumpPortal**
- Unofficial samples connect to `wss://pumpportal.fun/api/data` and send `{"method":"subscribeNewToken"}` and `{"method":"subscribeTokenTrade","keys":[...]}` on open. New-token events include name, symbol, mint, creator, initial buy and market cap. Trade events carry side, token and SOL amounts, and bonding-curve reserves. — [pump-analyzer skill sample](https://claudeskills.info/skills/aradotso/trending-skills/pump-analyzer-solana/); [codingsandmore/pumpfun-portal (Go client)](https://github.com/codingsandmore/pumpfun-portal); [Medium pumpdev guide](https://medium.com/@pumpdevio/pump-fun-api-real-time-websocket-streaming-with-python-token-launches-trades-whale-tracking-2b3979fc26bb)
- These sources conflict: an empty `keys` array may or may not mean "all tokens", and another provider (pumpdev.io) uses a different endpoint. Verify against the live PumpPortal docs. — same sources

**Helius (Solana streaming)**
- All Helius WebSocket streaming now runs on LaserStream infrastructure, with up to 200ms lower latency on standard WSS methods. Helius also cut prices on streaming add-ons. — [Helius blog: LaserStream WebSockets](https://www.helius.dev/blog/laserstream-websockets)
- Data add-on tiers per the docs and pricing page: 5TB $400, 10TB $750, 25TB $1,750, 50TB $3,250, 100TB $6,000 per month. The LaserStream product page lists different figures (5TB $500 … 100TB $4,500) and "3 credits per 0.1 MB". — [Helius pricing](https://helius.dev/pricing); [Helius gRPC/LaserStream page](https://www.helius.dev/solana-grpc)
- Plan-gating claims conflict: "Developer plans and higher" versus "LaserStream Professional+, Enhanced WS Business+". — [Helius gRPC page](https://www.helius.dev/solana-grpc); [Chainstack overview](https://chainstack.com/helius-rpc-provider-a-practical-overview/amp/)

### Inferences
**Topology**
```
[worker: Node 22, long-running, Fly/Railway/VPS ~$5–20/mo]
  ├─ tg-listener (GramJS NewMessage on N curated channels/groups)
  ├─ pump-listener (PumpPortal WS: new tokens + trades for watched mints)
  ├─ helius-listener (logs/tx subscribe filtered to smart-money wallet list) — optional, paid
  ├─ pollers (DexScreener token-profiles/boosts/metas every 60s within 60 rpm; Birdeye trending; GMGN)
  ├─ x-lookup (on-demand: only for top-K candidates, capped daily budget)
  ├─ extractor → resolver (CA regex + 32-byte decode + DexScreener /tokens/v1 confirm)
  ├─ feature builder (1-min tick) → scorer → alerter (Telegram Bot API sendMessage)
  └─ writes → Postgres (Neon/Supabase/Timescale) + Redis (Upstash) for hot counters/dedupe
[Next.js on Vercel]
  ├─ app/api/screener (reads latest scores)
  ├─ app/api/token/[chain]/[address] (features + timeline)
  └─ optional Pro cron hitting worker-independent pollers (per-minute)
```
- A queue is optional at this scale. Redis streams, or simply Postgres `INSERT … ON CONFLICT`, are enough. Use Vercel Queues only if parts of the pipeline move into Functions, for example fanning out per-candidate LLM classification.

**Storage**
- Postgres tables:
  - `messages` (raw social, deduped by source+msg_id)
  - `mentions` (message → token, confidence)
  - `tokens` (chain, address, symbol, created_at, first_seen)
  - `token_snapshots` (point-in-time features, append-only, hypertable or time-partitioned)
  - `wallets` (smart-money list + score)
  - `wallet_trades`
  - `scores`
  - `alerts`
- Redis: sliding-window counters, e.g. `ZADD mentions:{token} ts author` with `ZCOUNT` for unique-author windows. Use per-token HyperLogLog (`PFADD`) for unique authors per window, and keep dedupe keys.
- ClickHouse only if you ingest all pump.fun trades, which is high volume. Otherwise Postgres is enough for a single-user tool.

**Cost** (rough, single user)
- Worker VPS about $5–20/mo.
- Neon/Supabase free to $25/mo, Upstash free to about $10/mo.
- DexScreener and PumpPortal data: free.
- Helius: free/dev tier for a small wallet list. Paid streaming starts around $400–500/mo, so only for full-chain streaming.
- X capped at, say, 2,000 reads/day, about $10/day (about $300/mo). Or skip X entirely at first.
- LLM classification on the top ~200 messages/hour with a small model: low single-digit dollars per day.

**Alerting**
- Telegram Bot API `sendMessage` to a private chat, formatted with score breakdown, CA, liquidity, top-10 percentage and links.
- Rate-limit alerts per token, e.g. re-alert only if the score rises by more than X.
- Web Push or Vercel Chat SDK are optional extras.

### Gaps
- Official X pricing and cap were not verified directly; the figures are from consistent secondary sources.
- Vercel Queues rates and retention are third-party only.
- PumpPortal's official message schema and rate limits were not retrieved, and the unofficial samples conflict.
- Helius plan gating and add-on pricing conflict across Helius's own pages.
- GMGN has no confirmed public REST API terms for third parties. The agent-skills CLI exists, but rate limits and terms of service were not researched.
- Telegram ToS and ban risk for userbots that read many channels was not researched.

---

## 4. Fit with the existing zencharts repo

### Takeaway
zencharts today is a stateless Next.js 16 app:
- `force-dynamic` Node route handlers with an in-memory `Map` cache.
- A static `INSTRUMENTS` record mapped to Binance/Bitstamp symbols.
- A pure, React-free terminal command layer with an `on|off|score` sub-command convention.
- No database and no env-var dependencies.

The finder fits as new `lib/screener`, `lib/social` and `lib/onchain` modules, new read-only API routes and new terminal commands (`scan`, `token`, `watch`). The always-on ingestion has to live in a separate `worker/` entrypoint that shares those `lib/` modules but is deployed outside Vercel. Charting a found token is the main blocker: the chart needs DEX OHLCV, and `lib/sources.ts` only knows Binance and Bitstamp.

### Cited Findings
**Current repo**
- `package.json` dependencies are only `next ^16.4.2`, `react ^19.2.0` and `lightweight-charts ^4.2.3`. There is no DB client, queue client or test framework. — `/home/tomek/workspaces/zencharts/package.json`
- `app/api/candles/route.ts` and `app/api/series/route.ts`:
  - Both set `export const dynamic = "force-dynamic"` and `runtime = "nodejs"`, with the comment "in-memory cache + pagination need Node".
  - Both validate query params against registries (`isValidTimeframe`, `isValidSymbol`, `isValidSeriesId`).
  - Both return 400, 404 or 502 JSON errors.

  — `/home/tomek/workspaces/zencharts/app/api/candles/route.ts`, `/home/tomek/workspaces/zencharts/app/api/series/route.ts`
- `lib/sources.ts` fetches from Binance (`data-api.binance.vision`) and Bitstamp. Details:
  - A shared exported `fetchJson(url)` helper with a 12s AbortController timeout.
  - A 10-minute in-memory TTL cache in a `Map`.
  - Per-timeframe `MAX_CANDLES` caps.

  — `/home/tomek/workspaces/zencharts/lib/sources.ts`
- `lib/instruments.ts` defines `Instrument {id, label, binance, bitstamp?, deribit?}` in a static `INSTRUMENTS` record (`btc`, `zec`). Adding an instrument "becomes available to the API, the chart, and the console automatically". — `/home/tomek/workspaces/zencharts/lib/instruments.ts`
- The terminal engine is deliberately free of React/DOM.
  - The `Command` interface has `{name, aliases?, summary, usage?, run(ctx), complete?}`.
  - `ctx` gives `print(text, kind)`, `config: ConfigApi` (theme, symbol, overlays, momentum) and `args`.
  - Commands are registered in a `COMMANDS` array and dispatched through `lib/terminal/registry.ts`.

  — `/home/tomek/workspaces/zencharts/lib/terminal/types.ts`, `/home/tomek/workspaces/zencharts/lib/terminal/registry.ts`
- The existing `funding`, `dvol`, `cone` and `powerlaw` commands follow a pattern: bare command prints status, `on|off` toggles an overlay pane, and `score` runs an out-of-sample evaluation and prints pass/fail. `funding score` compares top-decile days against the rest across two periods. — `/home/tomek/workspaces/zencharts/lib/terminal/commands.ts`
- Indicators live in `lib/indicators/*.ts` (align, cone, derivatives, momentum, powerlaw, stats), and `lib/backtest.ts` exists. — repo file listing
- Next.js 16 docs bundled in the repo:
  - With Cache Components, `GET` Route Handlers run at request time by default and can use `'use cache'` only via an extracted helper, not directly in the handler body. — `/home/tomek/workspaces/zencharts/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  - `instrumentation.ts` at the project root exports `register()`, which runs at server startup. — `/home/tomek/workspaces/zencharts/node_modules/next/dist/docs/01-app/02-guides/instrumentation.md`
  - When self-hosting, the server drains in-flight requests and pending `after()` callbacks on SIGTERM. — `/home/tomek/workspaces/zencharts/node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`
- `.gitignore` already ignores `.env*.local` and `/.vercel`. — `/home/tomek/workspaces/zencharts/.gitignore`

### Inferences
These are proposed modules. Paths are under `/home/tomek/workspaces/zencharts`.

**Shared pure logic, importable by both Next and the worker**
- `lib/screener/types.ts`: `TokenRef {chain, address}`, `Mention`, `FeatureSnapshot`, `ScoreBreakdown`, `Alert`.
- `lib/social/extract.ts`: CA regexes, base58 32-byte decode with no deps (or add `bs58`), URL unwrapping, cashtag resolution. This is pure, so unit-testable.
- `lib/screener/features.ts`: windowed counts, robust z-score (median/MAD), acceleration, unique-author HLL wrapper. It can reuse helpers in `lib/indicators/stats.ts` where suitable.
- `lib/screener/filters.ts`: hard gates (liquidity, top-10 above 30%, rug_ratio, authorities, wash-trade and LPI rules from arXiv 2507.01963).
- `lib/screener/score.ts`: rank-normalise, weighted logistic, risk multiplier, breakdown output.
- `lib/screener/backtest.ts`: point-in-time label generation ("+100% before −50%", rug-in-24h) and precision@K. This mirrors the style of `lib/backtest.ts` and the `funding score` pass/fail output.

**Adapters** (I/O, reusing `fetchJson` from `lib/sources.ts`, or extracting it to `lib/http.ts`)
- `lib/onchain/dexscreener.ts`: token-profiles, boosts, metas/trending, `/tokens/v1/{chain}/{addrs}` batch up to N, `/token-pairs/v1`. Includes a token-bucket limiter at 60 rpm.
- `lib/onchain/pumpportal.ts`: WS client, used by the worker only.
- `lib/onchain/helius.ts`: optional wallet subscription.
- `lib/onchain/gmgn.ts`: only if ToS allows.
- `lib/onchain/birdeye.ts`.
- `lib/social/telegram.ts`: GramJS client, used by the worker only.
- `lib/social/x.ts`: budgeted recent-search for top-K candidates.
- `lib/social/classify.ts`: CryptoBERT via HF Inference, and/or an LLM structured-output classifier.
- `lib/db.ts`: Postgres client (e.g. `postgres` or `@neondatabase/serverless`) plus Redis (Upstash REST works from both Vercel and the worker).

**Worker** (new top-level `worker/`, not under `app/`)
- `worker/index.ts` starts the listeners, a 1-minute feature/score tick, and the alerter.
- Run it with `tsx worker/index.ts` on Fly.io, Railway or a VPS. Add `"worker": "tsx worker/index.ts"` to scripts and `Dockerfile.worker`.
- Do not put the listeners in `instrumentation.ts register()`. On Vercel the server is ephemeral and per-instance, so you would get zero or duplicated subscriptions. That pattern is only acceptable if the whole app is self-hosted as a single long-lived `next start` process.

**API routes** (Node, `force-dynamic`, read-only from the DB, matching the existing style and 400/404/502 conventions)
- `app/api/screener/route.ts`: `GET ?chain=solana&limit=50&minLiq=…` returns the latest ranked list with score breakdowns.
- `app/api/token/[chain]/[address]/route.ts`: features timeline, mentions and alerts for one token.
- `app/api/token/[chain]/[address]/candles/route.ts`: DEX OHLCV for the chart (see Gaps).
- Optional `app/api/cron/poll-dexscreener/route.ts`, protected by `CRON_SECRET`, with a `vercel.json` per-minute cron (Pro only). Use this only if you want pollers on Vercel instead of the worker.

**Instruments and chart**
- Generalise `Instrument` into a discriminated union. Either `{kind:"cex", binance, bitstamp?}` or `{kind:"dex", chain, address, pair}`.
- Alternatively, keep `INSTRUMENTS` static and add a dynamic resolver so `symbol sol:<mint>` works. `getHistory` then branches to a DEX OHLCV source.
- `components/Chart.tsx` can then render the found token unchanged. Add optional markers (lightweight-charts series markers) at alert and first-mention timestamps, plus a histogram pane for mention velocity, via a new `lib/config/overlays.ts` toggle such as `mentions`.

**Terminal commands** (add to `lib/terminal/commands.ts`)
- `scan [chain] [n]` prints the top-N table: symbol, age, liq, z_attn, sm_buyers, top10%, score.
- `token <ca>` prints a breakdown and switches the chart to that token.
- `watch <ca> | watch on|off`: toggles the mention-velocity pane.
- `scan score` prints walk-forward precision@K versus the random-new-token baseline, with pass/fail, mirroring `funding score`.
- `alerts` lists recent alerts.

**Environment variables** (in `.env.local`, already gitignored)
- `DATABASE_URL`, `REDIS_URL`/`UPSTASH_*`
- `TG_API_ID`, `TG_API_HASH`, `TG_SESSION`, `TG_BOT_TOKEN`, `TG_ALERT_CHAT_ID`
- `HELIUS_API_KEY`, `BIRDEYE_API_KEY`
- `X_BEARER` (optional)

### Gaps
- **DEX OHLCV source not researched.** The repo's chart needs candles, and the low-cap tokens the scanner finds have no Binance or Bitstamp listing. Candidates to verify are GeckoTerminal's public OHLCV API, Birdeye `/defi/ohlcv` and Codex. I retrieved no source for their endpoints or limits in this session.
- `components/Chart.tsx`, `lib/series.ts` and `lib/config/overlays.ts` were not read in detail. Exactly how a new pane or overlay plugs in should be checked before implementation.
- I found no information on whether the user deploys on Vercel Hobby or Pro. On Hobby, the once-a-day cron makes Vercel cron useless for this purpose, so the worker becomes mandatory.

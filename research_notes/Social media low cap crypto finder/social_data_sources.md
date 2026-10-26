# Social Media Data Sources for a Low-Cap Crypto Finder (state as of Oct 2026)

Research date: 2026-10-26. Prices marked with the date they were checked or published where known. Many figures come from third-party/vendor blogs and are flagged as such.

## Twitter/X API: tiers, prices, limits, and third-party alternatives

### Takeaway
X moved to prepaid pay-per-use as the default for new developers in early 2026. Post reads cost $0.005 each, capped at a few million post reads a month. That's about $5 per 1,000 posts, so continuous tracking of cashtags or contract addresses through the official API costs hundreds to thousands of dollars a month. Third-party scrapers/APIs (twitterapi.io, SocialData, Apify actors) charge about $0.15–$0.40 per 1,000 tweets, 12–30x cheaper, but they carry ToS risk and no guarantee of continuity.

### Cited Findings
**Official X API (pay-per-use)**
- Per-resource read prices on X's official pricing page: Posts $0.005; Users $0.010; DM events $0.010; following/followers $0.010; Lists/Spaces/Communities/Notes $0.005; likes/mutes/blocks $0.001. Counts (recent) $0.005, Counts (all) $0.010, Trends $0.010 per request. Post create $0.015; post with URL $0.200. "Prices are subject to change." — [X docs: Pricing](https://docs.x.com/x-api/getting-started/pricing)
- Owned reads (your own data) cost $0.001/resource. A third party says these were repriced on 20 Apr 2026. — [X docs: Pricing](https://docs.x.com/x-api/getting-started/pricing); [bundle.social (Jul 2026, verified vs docs 17 Aug 2026)](https://bundle.social/blog/x-api-pricing-2026-costs-limits)
- Billing is per item returned, not per call (a 100-post response = 100 charges). The same post returned more than once in a UTC day is billed once. — [X docs: Post cap](https://docs.x.com/x-api/fundamentals/post-cap.md); [bundle.social](https://bundle.social/blog/x-api-pricing-2026-costs-limits)
- Monthly cap: the official pricing and post-cap pages (fetched Oct 2026) say pay-per-use is "capped at 3 million Post reads per monthly billing cycle", with Enterprise above that. — [X docs: Post cap](https://docs.x.com/x-api/fundamentals/post-cap.md). **Conflict:** several third-party articles, and a localized/search-snippet version of the X docs, say 2 million. — [postproxy](https://www.postproxy.dev/blog/x-api-pricing-2026/); [search snippet docs.x.com/ko](https://docs.x.com/ko/x-api/fundamentals/post-cap.md). The cap was likely raised from 2M to 3M at some point; the date of the change is unknown.
- Endpoints that count toward the cap: Post lookup, Recent search, Full-archive search, Filtered stream and filtered stream webhooks, user timelines and mentions, liked posts, bookmarks, list posts, Spaces lookup. So **recent search, full-archive search and filtered stream are all reachable on pay-per-use**. — [X docs: Post cap](https://docs.x.com/x-api/fundamentals/post-cap.md)
- Filtered stream on pay-per-use, per the migration table: 1 connection, 1,000 rules, 1,024 chars per rule, about 10 s latency. Column attribution was inferred from a snippet, so treat it as moderately reliable. — [X docs: Filtered stream migration](https://docs.x.com/enterprise-api/posts/filtered-stream/migrate/overview)
- Launch date conflicts: one source says pay-per-use started 21 Jan 2026; others say it became the default on 6 Feb 2026, when the free tier was removed. — [blotato/search summary](https://www.blotato.com/blog/twitter-api-pricing); [medianama Feb 2026](https://www.medianama.com/2026/02/223-x-developer-api-pricing-pay-per-use-model/); [bundle.social](https://bundle.social/blog/x-api-pricing-2026-costs-limits)
- Legacy Basic ($200/mo) and Pro ($5,000/mo) are closed to new signups and remain only for existing subscribers. Enterprise is via an interest form with no public price. The commonly cited "~$42,000/mo" figure is unverified. — [bundle.social](https://bundle.social/blog/x-api-pricing-2026-costs-limits); [postproxy](https://www.postproxy.dev/blog/x-api-pricing-2026/)
- Operational gotchas: auto-recharge allows only one top-up per 5-minute window, which can stall bursts. Spend of $200, $500 or $1,000 or more earns 10%, 15% or 20% back as xAI/Grok credits. — [bundle.social](https://bundle.social/blog/x-api-pricing-2026-costs-limits)
- X docs recommend filtered stream over polling search for real-time data. Rate limits mostly reset per 15-minute window, per-app or per-user. — [X docs: rate limits](https://docs.x.com/resources/fundamentals/rate-limits)
- **Policy risk for crypto apps:** On 15 Jan 2026, X head of product Nikita Bier revoked API access for "InfoFi" apps that reward users for posting. Kaito then shut Yaps (pivoting to Kaito Studio), Cookie DAO sunset Snaps, and the KAITO token fell about 15–20%. — [Decrypt](https://decrypt.co/354736/elon-musks-x-bans-access-infofi-crypto-projects-ai-slop-backlash); [Whale Alert story](https://whale-alert.io/stories/eb7aaf8a751c/Kaito-Shuts-Down-Yaps-After-X-Bans-Incentivized-Posts-Launches-Kaito-Studio); [Forklog](https://forklog.com/en/xs-api-policy-shift-causes-kaito-token-to-plummet/amp)

**Third-party X data providers**
- twitterapi.io: $0.15 per 1,000 tweets, $0.18 per 1,000 profiles, pay-as-you-go with no monthly fee, minimum $0.00015 per request even when it returns nothing. These figures come from vendor-page mirrors. — [twitterapi.io docs mirror](https://scriptagc.wasmer.app/https_docs_twitterapi_io); [G2](https://www.g2.com/products/twitterapi-io/discuss)
- SocialData (socialdata.tools): $0.0002 per item returned ($0.20 per 1,000), tweet search $0.0002 per tweet, failed requests free, HTTP 402 when the balance is empty. — [SocialData pricing (official)](https://socialdata.tools/pricing.md)
- Apify "Tweet Scraper V2" (apidojo): $0.40 per 1,000 tweets pay-per-result, 50-tweet minimum per query, vendor-reported >99% run success. kaitoeasyapi actor: $0.25 per 1,000. One user report (Jul 2025) describes a host migration that restarted a run and doubled its cost. The official apify/twitter-scraper now routes to community actors. Prices were checked Jul–Sep 2026. — [Apify Tweet Scraper V2 pricing](https://apify.com/apidojo/tweet-scraper/pricing); [scrapecreators roundup](https://scrapecreators.com/blog/best-twitter-scrapers); [kaitoeasyapi issue](https://beta-securitybyobscurity.apify.com/kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest/issues/help-pls-with-costs-BBg8bmGtv9NiNhMn4); [Apify Discord on a $3.5/1K repricing](https://discord.apify.com/unlogical-new-pricing-35-per-1000-results-for-twitter-scraper-kT9m91STNsjP)
- Legal context: in X Corp v. Bright Data (N.D. Cal.), Judge Alsup dismissed X's ToS and scraping claims on 9 May 2024. He held that copyright preemption barred X from controlling public user content, and that contract claims required showing harm. He later allowed X to amend, with claims about server strain and degraded service from scraping. Current status was not verified. — [Morrison Foerster](https://mofo.com/resources/insights/240604-california-federal-court-holds-x-s-claims); [MediaPost (revival)](https://www.mediapost.com/publications/article/401510/x-corp-can-revive-scraping-battle-with-bright-dat.html)

### Inferences
- Cost example: tracking about 100k cashtag/CA-matching posts a month on official pay-per-use costs about $500/mo. The 3M cap is about $15k/mo. The same 100k posts cost about $15–40 through twitterapi.io, SocialData or Apify. For a bootstrapped finder, the realistic setup is a third-party API for broad discovery plus, optionally, a small official filtered-stream rule set (cashtags, KOL `from:` rules) for compliant real-time alerts.
- Third-party providers likely rely on scraping with logged-in or guest accounts. Their main risk is sudden outage or repricing (see the Apify repricing thread) rather than legal action against the end customer. The Bright Data ruling weakens X's contract claims against scrapers of public data, but it's a district-court ruling that's still being litigated.
- Anything that pays users to post (shill-to-earn) risks an X API ban after the Jan 2026 InfoFi policy.

### Gaps
- No official per-endpoint rate-limit numbers (requests per 15 min) found for pay-per-use search or stream.
- Exact date and history of the 2M to 3M cap change unknown. Enterprise price not public.
- No independent uptime audits of twitterapi.io or SocialData. Their ToS terms on resale weren't reviewed.

## Telegram: MTProto user clients vs Bot API

### Takeaway
To monitor public crypto "call" channels and groups you don't administer, you need an MTProto user client (Telethon, Pyrogram or GramJS, logged in as a real account). The Bot API only sees chats the bot was added to, and in channels it generally needs to be admin. User clients work but carry account-ban risk under Telegram's anti-spam systems, which have tightened since 2023. Use aged accounts and non-VoIP numbers, honor FloodWait, and keep join/resolve rates low.

### Cited Findings
- Bots start in privacy mode, which limits the group messages they receive. To see all messages, disable privacy via BotFather `/setprivacy` or make the bot an admin, and re-add the bot after changing the setting. These are secondary docs, not core.telegram.org. — [OpenClaw-style Telegram channel docs](https://huggingface.co/spaces/darkfire514/OpenClawBot/blob/main/docs/channels/telegram.md)
- Telethon FAQ: Telegram learns abuse patterns from third-party libraries and bans suspicious activity, and "some of the anti-spam measures have gotten more aggressive since 2023". It advises using well-established (not new) accounts, avoiding rapid bursts of requests, and expecting VoIP numbers to be banned. `FloodWaitError.seconds` says how long to wait. Check limits via @SpamBot (PeerFlood = limited). Users must comply with Telegram ToS and API ToS. — [Telethon v2 FAQ](https://docs.telethon.dev/en/v2/developing/faq.html)
- Telegram's anti-abuse thresholds are not published: "Telegram decides what those actions are, and they're free to change". — [Telethon v2 FAQ](https://docs.telethon.dev/en/v2/developing/faq.html)
- Open-source scrapers exist: tgscraper (Telethon, outputs CSV or DataFrame); DarkWebInformer/telegram-scraper (real-time continuous scraping); GitLab Telethon projects with live capture. — [tgscraper](https://github.com/timofeiryko/tgscraper); [telegram-scraper](https://gittrend.io/repo/DarkWebInformer/telegram-scraper); [GitLab topic](https://gitlab.com/explore/projects/topics/telethon-bot)
- A no-login alternative: the Apify "Telegram Channel & Group Scraper" reads public channels through the t.me web preview, needs no API key, and is marketed to crypto-signal researchers. — [Apify](https://apify.com/makework36/telegram-channel-scraper)
- Academic evidence on signal timing: a study of 14,499 public Telegram channels and 20M+ messages over one year, aligned with more than 17,000 tokens, found 47 likely pump-and-dump events. Manipulative signals were extremely synchronized and preceded price moves by **seconds**. P&D messages were linguistically indistinguishable from organic chat. — [Politecnico di Torino (IRIS)](https://iris.polito.it/handle/11583/3014027)

### Inferences
- Architecture: run 1–3 aged user accounts, each joined to at most a few hundred channels, and receive updates passively (event handlers) rather than polling `get_messages`. Passive receipt is the low-risk pattern. Joining and resolving many usernames quickly is the main FloodWait and ban trigger.
- The t.me/s/<channel> web preview is a lower-risk fallback for public channels, with higher latency.
- Because call-channel signals lead price by seconds to minutes, Telegram needs real-time ingestion. Text classification alone won't separate shills from organic calls, so combine with on-chain data.

### Gaps
- Official core.telegram.org limits (max channels per account is commonly cited as 500, plus join rate limits) were not verified in this session.
- No 2026 quantitative data on user-client ban rates found.

## Reddit, Discord, Farcaster, TikTok, YouTube

### Takeaway
Reddit is approval-gated and commercial use needs a contract. Discord can only be read by bots invited to servers; self-bots are banned. Farcaster is the most open: a self-hosted Snapchain node, or Neynar's credit-based API. TikTok's Research API excludes commercial users. YouTube's default quota allows only about 100 searches a day.

### Cited Findings
**Reddit**
- New OAuth tokens reportedly need manual approval (2–4 weeks, business justification) under the "Responsible Builder Policy" since late 2025. These are third-party claims; one source couldn't find the policy text on redditinc.com. — [socialcrawl 2026](https://www.socialcrawl.dev/blog/reddit-api-key-limits-alternatives-2026); [apiserpent 2026](https://apiserpent.com/blog/best-reddit-api-providers-2026)
- Rate limit is commonly 100 QPM per OAuth client (averaged over 10 min) and 10 QPM without OAuth. One source says 60 RPM. — [redditapis.com](https://www.redditapis.com/blogs/reddit-api-pricing-2026); [xpoz](https://www.xpoz.ai/blog/guides/reddit-api-pricing-tiers-and-alternatives/)
- Commercial pricing is often quoted as $0.24 per 1,000 calls, with a reported $12k/year minimum. This is unverified; Reddit's terms say rates are at Reddit's discretion. Resale or deriving revenue from API access requires written approval. — [redditapis.com](https://www.redditapis.com/blogs/reddit-api-pricing-2026)

**Discord**
- Automating user accounts ("self-bots") outside the OAuth2/bot API is forbidden and can lead to account termination. The supported route is a bot account, which must be invited to each server. — [Discord Support](https://support.discord.com/hc/articles/115002192352)

**Farcaster**
- Neynar (which reportedly acquired Farcaster in a deal valued at about $1B) uses per-endpoint credits. Examples: `/v2/farcaster/casts` 50 credits; user search 10; feeds 4 credits × page limit; webhook `cast.created` 15 per event; hub `/v1/castById` 1, `/v1/events` 2,000. — [Neynar compute units](https://docs.neynar.com/reference/compute-units.md); [Tangem news](https://tangem.com/en/news/investments/11249-neynar-acquires-farcaster-for-1b-supports-builders/)
- A secondary source says Neynar's free tier allows 300 req/min. Plan prices were not retrieved (neynar.com/pricing returned 404). — [skillselion](https://skillselion.com/skills/bankrbot/moltbot-skills/neynar)
- A self-hosted Snapchain node gives real-time read/write access to all Farcaster data for under $1,000/mo. Requirements: 16 GB RAM, 4 cores, 1.5–2 TB disk, public IP, ports 3381–3383. Snapshot catch-up takes about 2 h. Read APIs are backward-compatible with hubs. — [snapchain GitHub](https://github.com/farcasterxyz/snapchain); [Farcaster migration docs](https://docs.farcaster.xyz/hubble/migrating); [Neynar Snapchain docs](https://docs.neynar.com/snapchain/overview)

**TikTok**
- Research API: creators, advertisers and commercial users are not eligible. Access is for academic institutions in the US, EEA, UK and Switzerland, EU non-profits, and some Brazilian researchers. Quota is 1,000 requests a day (up to 100k records); approval takes about 4 weeks. — [TikTok Research API FAQ](https://developers.tiktok.com/docs/en/research-api-faq); [xpoz](https://www.xpoz.ai/blog/guides/tiktok-research-api-limits-access-and-alternatives/)

**YouTube**
- Default quota is 10,000 units a day. search.list costs 100 units, about 100 searches a day. Per Google's overview, defaults are 100 search.list calls, 100 videos.insert calls, and 10,000 units for everything else. Increases go through the quota-extension form, which reportedly takes weeks to months. — [Google YouTube Data API overview](https://developers.google.com/youtube/v3/getting-started); [ChannelCrawler, Mar 2026](https://channelcrawler.com/insights/youtube-api-daily-limit-quotas-costs-and-how-to-scale-beyond-10000-units-channelcrawler)

### Inferences
- For a commercial finder, TikTok is reachable only through unofficial scrapers, which carry ToS risk. YouTube is slow-moving and a low-value early signal. Reddit is useful for retail sentiment (r/CryptoMoonShots, r/SatoshiStreetBets) but gated.
- Farcaster has the best data access but low memecoin volume compared with X and Telegram. Base-ecosystem tokens are the exception.
- Discord alpha groups are only accessible by getting a bot invited, which is rare, or by a ToS-violating self-bot.

### Gaps
- Neynar plan prices and monthly credit allowances weren't confirmed.
- Reddit's official 2026 commercial pricing isn't public.
- No reliable data on the share of memecoin chatter on Farcaster.

## Crypto social aggregators (LunarCrush, Santiment, The TIE, Kaito, Cookie3, CryptoPanic)

### Takeaway
LunarCrush is the most accessible self-serve social API, from $90/mo, with all endpoints from $300/mo. Santiment bundles social volume and trending words into SanAPI plans from $49/mo. The TIE is enterprise-only. Kaito and Cookie have pivoted after X's Jan 2026 InfoFi ban. CryptoPanic is news, not social.

### Cited Findings
- **LunarCrush** (official support page, undated): Discover free; Individual $90/mo; Builder $300/mo; Scale $900/mo; Enterprise custom. All paid plans include API keys and MCP access. Builder and above unlock all API endpoints. Annual and bi-annual billing is discounted. — [LunarCrush support](https://lunarcrush.com/support/how-much-does-lunarcrush-cost)
- LunarCrush API limits, per a search summary of its developer docs: free "Hobby" plan is market endpoints only, 4 req/min and 100/day. Individual: 10/min, 2,000/day, limited endpoints. Builder: 100/min, 20,000/day. Scale: 500/min, 100,000/day. — [LunarCrush developers](https://lunarcrush.com/developers/cli). A Toolmage listing gives Individual at $30/mo; it's probably outdated. — [Toolmage](https://www.toolmage.com/en/tool/lunarcrush/)
- **Santiment**: Free tier has 1,000 API calls/mo, a 30-day lag on restricted metrics and 1 year of history. Sanbase Pro is $49/mo ($529/yr) with 5K calls/mo. Sanbase Max is $249/mo with 80K calls/mo, real-time and 2 years of history; the academy page differs on the history figure. Holding 1,000 SAN gives 20% off. Business Pro ($420/mo, 600K calls) was reportedly removed on 28 Jun 2026. Social volume and social metrics come under the general SanAPI call quotas. — [Santiment pricing](https://www.santiment.net/pricing); [SanAPI plans](https://academy.santiment.net/products-and-plans/sanapi-plans); [ComparEdge](https://comparedge.com/tools/santiment/pricing)
- **The TIE**: real-time social sentiment feed for 1,000+ coins with point-in-time data since 2017, raw counts, unique accounts, and normalized sentiment over several lookbacks. No public pricing (enterprise sales). — [The TIE Sentiment API](https://thetie.io/solutions/sentiment-api)
- **Kaito**: Yaps was discontinued after X's 15 Jan 2026 InfoFi API ban; the company pivoted to Kaito Studio for marketing. A low-authority secondary source says Kaito Pro is about $833/mo billed annually, with the API sold separately. — [Whale Alert](https://whale-alert.io/stories/eb7aaf8a751c/Kaito-Shuts-Down-Yaps-After-X-Bans-Incentivized-Posts-Launches-Kaito-Studio); [Quasa.io](https://quasa.io/fr/video/kaito-le-bloomberg-de-lattention-crypto-qui-a-survecu-au-pivot-post-api-quasaio)
- **Cookie DAO/Cookie3**: Snaps was sunset after the X ban. No API pricing found. — [Decrypt](https://decrypt.co/354736/elon-musks-x-bans-access-infofi-crypto-projects-ai-slop-backlash)
- **CryptoPanic**: news aggregator with community votes. The official API plans page could not be fetched. Third-party Apify scrapers cost about $0.80 per 1,000 results. — [Apify CryptoPanic scraper](https://apify.com/markelz0r/cryptopanic-scraper.md)

### Inferences
- Aggregators mainly cover coins that are already listed or indexed. Brand-new pump.fun or Base launches usually appear in LunarCrush or Santiment only after they gain traction. They suit confirmation and ranking (social dominance, Galaxy Score/AltRank, creator lists) more than first detection.
- Mindshare products built on X data (Kaito, Cookie) carry platform risk, as shown in Jan 2026.

### Gaps
- LunarCrush metric definitions weren't fetched (the endpoints page rendered empty). Galaxy Score, AltRank, social dominance and creators endpoints are known from prior knowledge only and unverified here.
- Kaito API pricing, Cookie3 API, CryptoPanic official API tiers, and The TIE pricing weren't found.

## Which sources give the earliest signal for new micro-cap and memecoin launches

### Takeaway
Telegram call and alpha channels (and the bots and groups around them) and X Crypto Twitter KOL posts are the earliest social signals. Academic work shows coordinated Telegram signals lead price by seconds. Pump.fun livestreams are a launch-time attention signal, but there's no API or research to back them up. Aggregators lag.

### Cited Findings
- Telegram pump signals precede price by seconds and are highly synchronized across channels (14,499 channels studied). — [IRIS Polito](https://iris.polito.it/handle/11583/3014027)
- Telegram and Discord are the main coordination hubs for memecoin pump schemes, per a 2025 arXiv paper on memecoins. — [arXiv 2507.01963](https://arxiv.org/html/2507.01963v2)
- An unreviewed personal GitHub project reports that 67% of pumps had detectable external signals, and that volume rises 1–6 h before price. Low reliability. — [gitea project log](https://gitea.com/botdoggy42/exploring-backup/src/branch/master/sr_shitcoin/PROGRESS.md)
- Subscriber count says little about call-channel quality; judge a channel by its on-chain call history. This is a vendor blog. — [ICODA](https://icoda.io/blog/best-crypto-telegram-alpha-groups/)
- Pump.fun livestreams returned in April 2025 after a five-month suspension, first for 5% of users, and the relaunch was credited with renewed adoption. Creators perform stunts to pump their tokens. The pump.fun graduation rate was below 1% in March 2025 (Dune). — [Cointelegraph](https://cointelegraph.com/news/memecoin-platform-pump-fun-brings-livestream-feature-back); [Decrypt](https://decrypt.co/232837/solana-meme-factory-pump-fun-adds-livestreaming-feature-what-could-go-wrong)

### Inferences
- Likely ordering by lead time: on-chain launch events (pump.fun/launchpad creation) come first, then Telegram call channels and X KOL posts (minutes), then X cashtag and CA volume growth, then Reddit and YouTube/TikTok (hours to days), then aggregator rankings. A practical finder should key on contract addresses, using regex for Solana base58 and EVM 0x addresses, across Telegram and X, and join with on-chain data.
- Treat livestream activity as a pump.fun-specific attention feature. Getting it requires scraping pump.fun's frontend or unofficial endpoints.

### Gaps
- No peer-reviewed study on pump.fun livestreams or KOL lead times. No 2026 data on the share of launches with livestreams.
- No official pump.fun API documentation for livestream data was found.

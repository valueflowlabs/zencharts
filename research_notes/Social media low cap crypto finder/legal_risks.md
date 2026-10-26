# Legal, Regulatory and Practical Risks of a Social-Media-Driven Low-Cap Crypto Finder (as of October 2026)

Scope note: These notes summarise sources. They are not legal advice. The developer is in Poland, so EU law (GDPR, MiCA) applies directly through EU establishment. US law matters if the tool serves US users or scrapes US platforms. Items marked "unverified / from background knowledge" were not confirmed against a source in this session and should be checked.

## 1. Data collection legality: platform ToS, scraping case law, GDPR

### Takeaway
US case law since 2022 has favoured scraping of **public, logged-off** data: Meta v. Bright Data (2024) and X Corp v. Bright Data (2024). But **logged-in** scraping, fake or automated user accounts, and self-bots remain clear contract breaches (hiQ v. LinkedIn, 2022). X now writes liquidated damages into its terms. Discord bans scraping and self-bots outright. Reddit requires approval and a paid agreement for commercial use. In the EU, the bigger constraint is GDPR rather than ToS. Public posts are still personal data. Legitimate interest is the only realistic lawful basis, and it needs a documented three-part test. The Dutch DPA argues that purely commercial scraping almost never passes that test. Profiling identifiable KOLs (key opinion leaders: crypto influencers) is the highest-risk part.

### Cited Findings

**US case law**
- hiQ v. LinkedIn (N.D. Cal., 4 Nov 2022 summary judgment): the court held that user-agreement provisions banning scraping and fake profiles are **enforceable as a breach-of-contract claim**. The breach covered hiQ's automated scraping and its hiring of "turkers" to create fake profiles. — [Morgan Lewis](https://www.morganlewis.com/zh-tw/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators); [ZwillGen](https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/)
- The hiQ case ended in December 2022 with a stipulated consent judgment: $500,000 against hiQ plus a permanent injunction. hiQ also stipulated that LinkedIn could establish CFAA liability. The stipulated conclusions are not court findings, so they have no precedential value. — [Privacy World](https://www.privacyworld.blog/2022/12/linkedins-data-scraping-battle-with-hiq-labs-ends-with-proposed-judgment/); [NatLawReview](https://www.natlawreview.com/article/linkedin-s-data-scraping-battle-hiq-labs-ends-proposed-judgment)
- Meta v. Bright Data (N.D. Cal., Judge Chen, 23 Jan 2024): summary judgment for Bright Data. **Logged-off scraping of public data, and selling that data, did not breach Meta's terms.** The terms govern users only, and the record held no evidence of logged-in scraping. Commentators say the ruling leaves many questions open. — [Farella Braun + Martel](https://www.fbm.com/technology/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/); [Eric Goldman blog](https://blog.ericgoldman.org/archives/2024/01/game-on-bright-data-scores-major-victory-in-web-scraping-dispute-with-meta-guest-blog-post.htm); [Quinn Emanuel](https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/)
- X Corp v. Bright Data (N.D. Cal., Judge Alsup, May 2024, No. 23-cv-3698): the case was dismissed. X failed to allege harm ("impairment or deprivation") from access to its public site. Contract claims based on copying public data were **preempted by the Copyright Act**. The judge warned against "information monopolies." Sources differ on the date (9 vs. 10 May 2024). — [Skadden](https://skadden.com/insights/publications/2024/05/district-court-adopts-broad-view); [Proskauer (Bright Data's counsel)](https://www.proskauer.com/release/proskauer-secures-dismissal-of-scraping-claims-against-bright-data); [Frankfurt Kurnit](https://technologylaw.fkks.com/post/102j7s5/blockbuster-ruling-federal-court-holds-that-copyright-act-preempts-xs-web-scrap)

**Platform terms**
- **X ToS (effective 15 Nov 2024)** adds liquidated damages for anyone who breaches the terms by accessing more than 1,000,000 posts in 24 hours. The clause also reaches anyone who "induces or knowingly facilitates" a breach. There is a €15,000 EU/UK version. Sources disagree on whether the amount is a flat $15,000 or $15,000 per million posts. Enforceability is untested. — [Knight First Amendment Institute](https://knightcolumbia.org/content/knight-institute-says-xs-new-terms-of-service-will-stifle-independent-research); [ConductAtlas (EU version)](https://conductatlas.com/platform/x/x-terms-of-service/liquidated-damages-for-excessive-post-access-eu/)
- **Discord**: the developer policy bars using its APIs to scrape Discord data, selling or commercialising it, or passing it to data brokers. Automating user accounts ("self-bots") is forbidden and can lead to account termination. Discord enforced this against Spy.pet in 2024. — [Discord self-bot policy](https://support.discord.com/hc/articles/115002192352); [Discord developer policy](https://support-dev.discord.com/hc/articles/25279999805975); [TechRadar on Spy.pet](https://www.techradar.com/pro/security/spypet-data-harvester-taken-down-by-discord)
- **Reddit**: Data API access requires explicit approval. The free tier is for non-commercial use only (about 100 queries per minute). Commercial use requires a separate agreement. Vendor blogs report roughly $12,000/month, but Reddit publishes no official rate card, so the figure is unverified. — [Techloy](https://www.techloy.com/reddit-api-pricing-in-2026-complete-guide-for-developers-and-businesses/); [Octolens](https://octolens.com/blog/reddit-api-pricing)

**GDPR / EU**
- **EDPB Guidelines 03/2026 on web scraping in the context of generative AI** (v1.0, adopted 7 July 2026 **for public consultation**, so not final):
  - Scraping is a "large-scale processing activity" that often happens without data subjects knowing.
  - Legitimate interest (Art. 6(1)(f)) requires three cumulative conditions: a legitimate interest, necessity, and a balancing test.
  - Recommended mitigations: exclude certain data categories and sources by default; exclude websites "which clearly oppose the scraping" (signalled via robots.txt, ai.txt, CAPTCHA or login walls); filter data; pseudonymise or anonymise; delete early.
  - The absence of a robots.txt file does not amount to consent.
  - Transparency: the Art. 14(5)(b) "disproportionate effort" exception still requires public information.
  - Special-category data needs an Art. 9(2) derogation, with a GC & Others (C-136/17) analysis for incidental collection.
  - — [EDPB Guidelines 03/2026 PDF](https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_2020603_webscraping_v1_en_0.pdf). The guidelines focus on generative-AI training, but the same reasoning plausibly applies to other scraping purposes (see Inferences).
- The **Dutch DPA (AP)** position (2024/2025): scraping personal data is "almost always" unlawful. Only legally protected interests count as legitimate, and purely commercial interests do not. Public visibility is not permission. Profiling people for resale and collecting from private forums or protected accounts are listed as unlawful. Pinsent Masons reports the AP position is under review, so it is contested. — [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/dutch-web-scraping-guidance-warn-businesses-gdpr-breach-risk); [privacy-web.nl](https://privacy-web.nl/en/nieuws/ap-scraping-bijna-altijd-illegaal/); [Securiti](https://securiti.ai/scraping-almost-always-illegal-netherlands-dpa-declares/)

### Inferences
- Lowest-risk collection order: (1) official APIs under their terms, such as the X API paid tiers, the Reddit Data API with approval and a commercial agreement, Telegram Bot API in channels where the bot was added, and Discord bot tokens in servers that invited the bot; (2) logged-off public pages at modest volume; (3) never logged-in scraping, user-account automation, self-bots or fake accounts. hiQ and Meta both show liability attaches mainly to logged-in or account-based conduct.
- The Bright Data wins are US district-court rulings. They do not bind EU courts, and they do not address GDPR. A Polish developer faces ToS and contract claims under the platform's chosen law, plus GDPR enforcement by UODO, the Polish data protection authority.
- The X liquidated-damages clause makes high-volume X scraping financially risky even if a court might later find the clause unenforceable. The ruling against X in the Bright Data case predates this clause.
- Under GDPR, a tool that ranks tokens by aggregate mention counts with pseudonymised authors is much easier to defend than one that keeps **named KOL profiles**: shill scores, track records, alleged scam involvement. Named profiles are profiling under Art. 4(4). They trigger Art. 14 notice and Art. 21 objection rights, probably require a DPIA, and labelling a person a scammer adds defamation risk. Reasonable mitigations: record a legitimate-interest assessment, keep only handle, timestamp and token mention, set a short retention period, offer an opt-out or objection channel, publish a privacy notice, and avoid special-category inferences.
- Telegram: public channels are visible to anyone. Using a user account through the MTProto client API (for example Telethon) to monitor many channels sits in a ToS grey zone, and accounts used this way can be banned.

### Gaps
- No source found for Telegram's API terms on bulk or automated monitoring of public channels through user accounts (MTProto). Telegram's own terms should be checked.
- Whether X appealed the Bright Data dismissal, and whether X has ever enforced the liquidated-damages clause, was not confirmed.
- The primary X ToS text was not fetched, so the flat versus per-million reading is unresolved.
- No UODO-specific guidance on scraping was found.
- The final (post-consultation) version of EDPB 03/2026 was not found.

## 2. Financial regulation: rankings/alerts as investment advice or market manipulation (EU MiCA, KNF, US SEC/CFTC)

### Takeaway
Under MiCA, publishing general, non-personalised rankings to the public is unlikely to count as "advice on crypto-assets", which requires personalised recommendations. But ESMA says the MiCA advice perimeter is **broader than MiFID II's**, and personalised alerts or "suitable for you" framing push the tool toward advice. The serious EU exposure is **MiCA Title VI market abuse**. Art. 91 applies to any person, so a solo developer is covered. It prohibits spreading misleading information or rumours, and voicing opinions on a token after taking a position without disclosing it ("scalping"). In the US, the Feb 2025 SEC staff statement says typical meme coins are not securities, which removes SEC registration and touting exposure for them. Fraud and manipulation remain actionable by the DOJ, the CFTC (commodity fraud) and states. Poland's MiCA implementing act had been vetoed three times as of June 2026, so the national supervisory framework is unsettled.

### Cited Findings

**EU / MiCA**
- **ESMA Q&A (published 18 June 2026)**: the MiCA advice perimeter "should be regarded as broader than" MiFID II. Advice means "offering, giving or agreeing to give personalised recommendations". ESMA's test asks:
  - whether there is a recommendation;
  - whether it concerns transactions or the use of crypto-asset services, is presented as suitable or tailored, and is issued "otherwise than exclusively to the public";
  - whether it is directed at a person as an investor or potential investor.

  A mere reference to a CASP that is equally available to all potential investors is not advice. — [ESMA Q&A 2882](https://www.esma.europa.eu/publications-data/questions-answers/2882)
- ESMA's MiCA suitability guidelines require CASPs that advise to assess a client's knowledge and experience, financial situation (including ability to bear losses), objectives and risk tolerance. The guidelines are aligned with MiFID II. — [ESMA press release](https://www.esma.europa.eu/press-news/esma-news/esma-releases-last-policy-documents-get-ready-mica); [BDO Malta](https://www.bdo.com.mt/en-gb/news/news-in-2025/esma-issues-new-mica-guidelines-ensuring-suitability-and-transparency-for-crypto-asset-services)
- **MiCA Art. 91 (market manipulation)**:
  - 91(1): "No person shall engage in or attempt to engage in market manipulation."
  - 91(2)(c): disseminating false or misleading information, including rumours, through the media or other means, where the person knew or ought to have known it was false or misleading.
  - 91(3)(c): "taking advantage of occasional or regular access to the traditional or electronic media by voicing an opinion about a crypto-asset, while having previously taken positions on that crypto-asset, and profiting subsequently from the impact of the opinions voiced on the price … without having simultaneously disclosed that conflict of interest to the public in a proper and effective way."
  - — [ESMA Interactive Single Rulebook, MiCA Art. 91](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-91-prohibition-market-manipulation); [SpringLex MiCA Art. 91](https://www.springlex.eu/en/packages/mica/mica-regulation/article-91/)
- ESMA statement on social-media-driven trading (under MAR, the parallel securities regime): discussing an opportunity is not market abuse "in and of itself". Organising or executing coordinated strategies to move the price can be manipulation. Spreading false or misleading information can be manipulation even if the poster does not trade. — [Arthur Cox](https://www.arthurcox.com/insights/esma-warns-retail-investors-of-risks-of-committing-market-abuse-when-trading-in-volatile-stocks/); [Investment Executive](https://www.investmentexecutive.com/news/social-medias-market-manipulation-risk/)

**Poland / KNF**
- The KNF statement says that under MiCA Art. 143(3), Polish entities could provide crypto-asset services under national law only until **1 July 2026** (or until authorised or refused, if sooner). Without a designated national competent authority, domestic entities lose that ability, and licensing proceedings can only start once a law designates the authority. — [KNF statement (PDF)](https://nuk.knf.gov.pl/knf/en/komponenty/img/Statement_of_the_Polish_Financial_Supervision_Authority_97112.pdf); [Dudkowiak](https://www.dudkowiak.com/blog/uknf-position-on-mica-legal-status-of-the-crypto-asset-market-in-poland/)
- The Polish Crypto-Asset Market Act (designating the KNF; powers to block accounts for 96 hours, extendable to 6 months; a register of domains breaching MiCA) was vetoed by President Nawrocki in December 2025 and February 2026. A third version passed the Sejm on 15 May 2026 (241–200) and received a **third veto, reported 11 June 2026**. Alternative bills from Polska 2050, Konfederacja and the President's office were in play. — [Polsat News, 11 Jun 2026](https://www.polsatnews.pl/wiadomosc/2026-06-11/trzecie-weto-w-sprawie-kryptoaktywow-decyzja-karola-nawrockiego/); [Interia](https://wydarzenia.interia.pl/kraj/news-ustawa-o-rynku-kryptoaktywow-jest-decyzja-karola-nawrockiego,nId,23495116); [Ministry of Finance](https://www.gov.pl/web/finanse/rzad-przyjal-projekt-ustawy-o-rynku-kryptoaktywow); [prawo.pl on the Konfederacja bill](https://www.prawo.pl/biznes/kryptoaktywa-co-jest-w-projekcie-konfederacji,1539903.html); [GazetaPrawna, "Ustawa 2.0 wraca do Sejmu"](https://edgp.gazetaprawna.pl/firma/artykuly/10628768,ustawa-o-kryptowalutach-20-wraca-do-sejmu.html)

**US**
- **SEC Division of Corporation Finance staff statement on meme coins (27 Feb 2025)**: a meme coin is "a type of crypto asset inspired by internet memes, characters, current events, or trends for which the promoter seeks to attract an enthusiastic online community to purchase the meme coin and engage in its trading". Such coins are not securities under the enumerated categories or under Howey. The statement excludes securities labelled as meme coins to evade registration. Fraud "remains subject to other federal and state laws". Staff statements are non-binding, and Commissioner Crenshaw dissented. — [Winston & Strawn](https://www.winston.com/en/blogs-and-podcasts/non-fungible-insights-blockchain-decrypted/sec-staff-under-new-administration-issues-statement-declaring-that-meme-coins-are-not-securities); [A&O Shearman](https://www.aoshearman.com/en/insights/ao-shearman-on-fintech-and-digital-assets/implications-of-the-secs-stance-that-meme-coins-are-not-securities); [Polsinelli](https://www.polsinelli.com/publications/staff-statement-on-meme-coins-signals-shift)
- **Operation Token Mirrors (DOJ/FBI/SEC, Oct 2024)**: the FBI created its own token (NexFundAI) to catch market makers (Gotbit, ZM Quant, CLS Global, MyTrade) that wash-traded tokens before pump-and-dumps. 18 persons or entities were charged, more than $25M was seized, and bots wash-trading about 60 tokens were shut down. — [Decrypt](https://decrypt.co/285503/feds-charge-gotbit-others-market-manipulation); [Kitco](https://www.kitco.com/news/article/2024-10-10/crypto-fraud-exposed-fbi-doj-and-sec-charge-18-market-manipulation)
- Precedents for social-media touting and scalping (securities cases): in Dec 2022 the SEC and DOJ charged 8 influencers in a $100M pump-and-dump run over Twitter and Discord. In Oct 2022 Kim Kardashian paid $1M for undisclosed paid promotion of a crypto token (Section 17(b) touting). — [Semafor](https://www.semafor.com/article/12/14/2022/pump-and-dump-trading-social-media-influencers-charged-by-sec); [PYMNTS](https://www.pymnts.com/?p=1441040)

### Inferences
- MiCA classification by feature:
  - A public, identical-for-everyone leaderboard or "trending tokens" feed with no claim of suitability is probably outside "advice" under ESMA's three-part test.
  - Per-user alerts matched to a user's portfolio, risk profile or preferences, and framed as "buy" or "this is right for you", move toward personalised recommendation. That makes it a licensable CASP advice service.
  - The ESMA statement that the MiCA perimeter is broader than MiFID II makes this line less safe than under securities law.
- Market abuse is the main EU risk even for a free tool. Three behaviours to avoid: the developer or team trading tokens before they appear in alerts (91(3)(c) unless properly disclosed, and front-running); amplifying unverified claims or rumours (91(2)(c)); and accepting paid listings without disclosure. Mitigations: a written personal-trading policy (a blackout or delay before alerts, or no holdings in listed tokens), public conflict-of-interest disclosure, and no paid placements, or clear "sponsored" labels.
- Scope caveat (unverified / from background knowledge): MiCA Title VI (Art. 86) applies to crypto-assets admitted to trading, or for which admission is requested, on a **CASP-operated trading platform**. Many pump.fun or DEX-only memecoins may fall outside it until they list on a centralised exchange. Fraud, consumer-protection and Polish criminal law still apply, and the scope boundary is unsettled for DEX tokens.
- US: since meme coins are mostly not securities, publishing rankings of them is unlikely to be SEC "investment adviser" activity. The publisher exemption (Lowe v. SEC) would also cover impersonal, bona fide publications (from background knowledge, unverified here). The CFTC treats many crypto-assets as commodities and has anti-fraud and anti-manipulation authority (unverified here). Any token that is a security, or any paid promotion, brings back Section 17(b) disclosure duties.
- Disclaimer best practice: label content as "information only, not investment advice, not a recommendation"; warn that low-cap tokens are high risk and can go to zero; disclose data sources and methodology; disclose any holdings or compensation; never use "guaranteed" or "next 100x" language. Disclaimers do not cure manipulation or misleading statements, but they support the "non-personalised publication" position.

### Gaps
- The official MiCA Art. 86 scope text was not retrieved, so its applicability to DEX-only tokens is unconfirmed.
- No ESMA crypto-specific finfluencer guidance or MiCA market-abuse supervisory briefing was found.
- The Polish legislative status after June 2026 (as of October 2026) could not be confirmed. A fourth bill or a signature may have happened since. Check Dziennik Ustaw and sejm.gov.pl.
- Any 2025–2026 SEC/CFTC/DOJ action against a crypto signal or alert app was not found.
- No sources were found on CFTC 2025–2026 meme-coin positions.

## 3. Licensing if the tool trades, auto-buys, or offers copy-trading (CASP under MiCA)

### Takeaway
Once the tool executes, routes or manages trades for users, it very likely needs MiCA CASP authorisation, depending on the facts. ESMA says authorities look at the real order flow, not labels:
- routing a user's orders to a third party is reception and transmission;
- concluding trades as the client's agent is execution of orders;
- discretionary auto-buys or copy-trading under a mandate look like portfolio management, which also brings suitability duties.

Poland had no designated competent authority after 1 July 2026, so a Polish CASP licence was not available in practice. Firms were reported to be seeking licences in other member states.

### Cited Findings
- ESMA Q&A (Oct 2025 answer): regulators should judge a firm by the order fulfilment flow (counterparty, agent concluding agreements, or routing to third parties), not by contract or marketing labels. Reception and transmission covers transmitting orders to a third party that executes them. Execution of orders covers concluding the trade as the client's agent. Exchange services cover dealing as counterparty with proprietary capital. Portfolio management of crypto-assets is a separate authorised service. — [ESMA Q&A](https://www.esma.europa.eu/node/221381); [BDO Malta summary](https://www.bdo.com.mt/en-gb/insights/esma-q-a-regarding-mica-and-casp)
- The suitability assessment is required for CASPs providing advice or portfolio management. — [ESMA](https://www.esma.europa.eu/press-news/esma-news/esma-releases-last-policy-documents-get-ready-mica)
- The Polish grandfathering window ended on 1 July 2026, and licensing in Poland requires a law designating the authority. — [KNF statement](https://nuk.knf.gov.pl/knf/en/komponenty/img/Statement_of_the_Polish_Financial_Supervision_Authority_97112.pdf)
- Polish industry commentary: "nie znam firmy, która nie stara się o zagraniczną licencję" ("I don't know a firm that isn't seeking a foreign licence"). — [XYZ.pl](https://xyz.pl/rynek-kryptoaktywow-przegrywa-z-polityka-nie-znam-firmy-ktora-nie-stara-sie-o-zagraniczna-licencje/)

### Inferences
- Safest design path for a Polish solo developer: **information-only** (rankings, alerts, links out), with **no custody, no order routing, no auto-buy, and no copy-trading**.
- A non-custodial tool where the user signs every transaction in their own wallet, built on public DEX contracts, is arguably software rather than a CASP service. This is unsettled, and it depends on whether the operator receives, transmits or executes orders. MiCA recital 22 on fully decentralised services was not verified in this session.
- Holding user exchange API keys or wallet private keys to auto-trade most likely means reception and transmission, execution, or portfolio management. That needs a CASP licence: a passported licence from another member state, given the Polish situation. In the US it could raise money-transmitter or CFTC issues (unverified).

### Gaps
- No ESMA or NCA guidance specifically on copy-trading under MiCA was found.
- MiCA's treatment of non-custodial trading bots (for example Telegram bots operating on DEXs) was not found in authoritative sources.
- US money-transmission and FinCEN treatment of auto-trading bots was not researched.

## 4. Practical risks: user losses, scam tokens, insider front-running, key/wallet security, reputation

### Takeaway
Most memecoin traders lose money, holding periods are extremely short, and market makers and insiders actively manufacture fake volume and social buzz. A finder that ranks by social signals will systematically surface manipulated tokens unless it filters for them. Trading bots that hold user keys have been drained (Banana Gun, Sept 2024). Promoting a token that later rugs creates reputational damage and possible legal exposure, especially if the operator profited.

### Cited Findings
- CoinGecko data on pump.fun: the share of profitable traders (realised PnL) stayed below 50% in most months from April 2024 and fell to **30.1% in June 2025**. It was reported to rebound to 73.28% in April 2026. Realised PnL excludes bagholders who never sold. — [BeInCrypto](https://beincrypto.com/pump-fun-traders-profit-comeback-meme-coin-season/); [Cointelegraph](https://regional-front.cointelegraph.com/news/memecoins-attract-users-platforms-reap-profits-report)
- Galaxy Research (Oct 2025), as reported: most memecoin traders lose money, launchpads, DEXs and bots capture the revenue, and median Solana memecoin hold times fell to about 100 seconds. — [Cointelegraph](https://regional-front.cointelegraph.com/news/memecoins-attract-users-platforms-reap-profits-report)
- Dune dashboard (March 2026, not peer-reviewed): of about 1.4M pump.fun wallets, about 50% lost money, and about 96% either lost money or made less than $500 that month. — [Crowdfund Insider](https://www.crowdfundinsider.com/?p=277755) (secondary; treat as indicative)
- Manufactured activity: Operation Token Mirrors showed paid market makers wash-trading tokens to create fake demand before dumping. — [Decrypt](https://decrypt.co/285503/feds-charge-gotbit-others-market-manipulation)
- Key security: the Banana Gun Telegram trading bot was exploited on 19 Sept 2024 through a Telegram message-oracle vulnerability. The post-mortem reported 11 users drained of about $3M; early estimates were about $1.9M. Users were refunded, and the bot added 2FA and a 2-hour transfer delay. Halborn noted that such bots need users' private keys. — [The Block](https://www.theblock.co/post/317282/banana-gun-telegram-bot); [Cointelegraph](https://cointelegraph.com/news/banana-gun-crypto-bot-refunds-3m)
- Social-media pump schemes run through Twitter and Discord led to SEC/DOJ charges (2022). — [Semafor](https://www.semafor.com/article/12/14/2022/pump-and-dump-trading-social-media-influencers-charged-by-sec)

### Inferences
- Mention velocity and KOL mentions are exactly what pump groups and paid-shill networks manufacture. Mitigations:
  - **On-chain scam checks** before display: honeypot or sell-tax simulation, mint and freeze authority, LP lock or burn, holder concentration, deployer history, sniper or bundled-buy share in the first blocks.
  - Bot and sybil detection on social accounts (account age, coordinated posting).
  - Down-ranking tokens promoted by accounts with a history of rugged tokens.
  - Showing risk flags prominently rather than only rankings.
- Front-running: (a) insiders and snipers usually buy before social buzz, so by the time the tool alerts, users are often the exit liquidity; (b) the operator or anyone with early feed access can front-run their own users. Mitigations: equal-time delivery to all users, no premium "early" tier, an internal no-trade or delay policy, and logging and publication of alert timestamps.
- Security: avoid holding user keys or exchange API keys at all. If unavoidable: trade-only API keys with withdrawals disabled, IP allow-listing, encryption in an HSM or KMS, and transfer delays and 2FA (Banana Gun's fixes). The project's own API keys for X, Reddit and others also need secret management, since leaked keys can mean ToS violations under the developer's account.
- Reputation: publish methodology, keep a public record of past alerts and their outcomes (including rugs), add a clear risk banner, and do not run affiliate or referral links to launchpads or bots without disclosure.

### Gaps
- No authoritative 2025–2026 rug-pull rate statistic was found (for example, the share of pump.fun tokens that rug). Solidus Labs and Chainalysis figures were searched for but not retrieved.
- The Galaxy Research report was not read in the original; figures are via Cointelegraph.
- No case was found holding a token-ranking or alert tool itself liable for user losses from a promoted scam.

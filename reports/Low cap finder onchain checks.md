# Low-cap finder: how on-chain activity is checked

This report describes the business logic behind **zencharts.vercel.app/finder**: where the data comes from, how each token is checked, how a verdict and score are produced, and what the checks cannot see. The rules here match `lib/finder/checks.ts` one for one. Each rule id (M1, A2, S1, …) appears in the UI, in the API response and in this document, so any verdict can be traced back to the observed value and the threshold behind it.

The finder is a **filter, not a predictor**. The research behind it (`reports/Social media low cap crypto finder.md`) found no evidence that any free signal predicts which memecoin will go up. It found plenty of evidence that most new tokens fail: about 69% of pump.fun tokens stop trading on launch day, and 82.8% of memecoins that doubled showed manipulation patterns. So the default answer is "reject". A token earns a **pass** only by clearing every gate with data that is actually available. A pass means "no red flag was found in free on-chain data". It is not a recommendation.

## 1. Data sources (all free, no API keys)

| Source | Endpoint(s) | What the finder takes from it |
|---|---|---|
| GeckoTerminal | `/networks/{net}/new_pools`, `/trending_pools`, `/pools/multi/{pools}`, `/pools/{pool}/ohlcv/minute` | Discovery (new and trending pools). **Unique buyers and sellers** per window (m5/h1/h6/h24), which no other free source provides. Pool reserve, FDV, 5-minute candles. |
| DexScreener | `/token-profiles/latest/v1`, `/token-boosts/latest/v1`, `/tokens/v1/{chain}/{≤30 addresses}` | Discovery of tokens whose team **paid** for a profile or boost. Per-pair price, liquidity, FDV/market cap, buy/sell counts, volume, price change, pair creation time, linked socials. |
| RugCheck (Solana) | `/v1/tokens/{mint}/report` | Mint and freeze authority, top holders with insider flags, known pool and locker accounts, market vaults, LP lock %, creator balance, holder count, transfer fee, mutable metadata, `rugged` flag, RugCheck's own risk list. |
| GoPlus (Solana) | `/api/v1/solana/token_security` | Token-2022 levers: balance-mutable authority, transfer hook, default account state, closable mint, non-transferable. |
| GoPlus (EVM) | `/api/v1/token_security/{chainId}` | Honeypot flags, buy and sell tax, owner backdoors, verified source, owner trading levers, mintable, proxy, creator history, top holders, LP holders and lock status, holder count. |
| Honeypot.is (EVM) | `/v2/IsHoneypot` | A real buy-then-sell **simulation** on a fork (detail view only). |

Chains: Solana, Base, BNB Chain and Ethereum. GeckoTerminal network ids are `solana`, `base`, `bsc` and `eth`; GoPlus chain ids are 8453, 56 and 1.

Three behaviours of these APIs, found while building, shape the logic:

- GoPlus's keyless endpoint accepts a comma-separated batch but returns only the first address. The finder therefore makes one call per token.
- GoPlus reports `buy_tax` and `sell_tax` as `""` for tokens it has not simulated yet. An empty string is treated as **unknown**, never as 0%.
- RugCheck's `topHolders` list includes pool and bonding-curve vaults that are not always labelled in `knownAccounts`. Concentration needs explicit exclusions (rule H1).

## 2. Pipeline

One scan per chain runs on request and is cached for 60 seconds. The page refreshes every 60 seconds.

1. **Discover** up to 60 candidate tokens from GeckoTerminal new pools, GeckoTerminal trending pools, and DexScreener's latest profiles and boosts on that chain. Each token keeps its *origins*. Profile and boost origins are shown as a **PAID** badge and never add to the score, because they show the team spending money, not organic demand.
2. **Market snapshot**: batch-fetch every candidate from DexScreener, 30 per call, and choose the **deepest pool** per token (highest liquidity, then highest 24h volume). Where GeckoTerminal did not already supply that exact pool, fetch it from `pools/multi` to get unique buyers and sellers. DexScreener fields take priority and GeckoTerminal fills the gaps.
3. **Cheap gates**: run the market (M) and activity (A) rules on every candidate. Both use data already in hand.
4. **Security sweep**: the 12 best-scoring tokens that passed step 3 get the contract (S/E) and holder (H) checks. On Solana that is RugCheck plus GoPlus, four tokens at a time. On EVM it is GoPlus, four at a time. Tokens outside the sweep are labelled **UNCHECKED** and can be fully checked by opening them.
5. **Verdict and score** for every token, then sort by verdict (pass, caution, fail) and then by score.

Opening a token, or pasting any address into "check a token address…", runs the same pipeline for that one token. It always includes the security checks, adds the Honeypot.is sell simulation on EVM, and loads 24 hours of 5-minute candles.

Every adapter fails softly: a provider that times out or rate-limits returns nothing, and the checks that needed it become **unknown (?)**. A banner names the sources that were down for that scan. Because every check is re-run on every refresh, a token that passed earlier fails as soon as an authority, tax or LP state changes.

## 3. The rules

Status meanings: **pass** means clean. **warn** means risk or uncertainty, and lowers the score. **fail** is a hard reject. **unknown** means the data is missing.

Thresholds marked *heuristic* are tunable starting points chosen for this tool, not empirically validated cut-offs. Thresholds with a source come from the research report.

### M — Market gates (DexScreener, GeckoTerminal)

| Id | Rule | Pass | Warn | Fail | Why |
|---|---|---|---|---|---|
| M1 | Liquidity in the deepest pool | ≥ floor (default $10k) | Token is still on a bonding curve (pump.fun, Meteora DBC, LaunchLab, Four.meme…): no pool exists yet | < floor | Below ~$10–20k a modest sell moves price tens of percent and exits are not realistic. The floor is a research-report suggestion (*heuristic*), and the UI lets you choose $5k–$100k. |
| M2 | Market cap (falls back to FDV) | ≤ ceiling (default $5M) | — | > ceiling | Defines "low cap". Larger tokens are out of scope, not bad. |
| M3 | Liquidity / market cap | ≥ 3% | < 3% | — | A thin pool behind a large cap means the cap is mostly on paper (*heuristic*). |
| M4 | Pool age | ≥ 15 min | < 15 min | — | Under 15 minutes there is too little history for the activity rules to mean anything. |

### A — Trading activity (DexScreener txns and volume, GeckoTerminal unique wallets)

These rules are how the finder "checks on-chain activity". DexScreener and GeckoTerminal aggregate every swap that touched the pool. The finder reads trade counts, USD volume and price change per window, plus GeckoTerminal's count of distinct wallets, and looks for the signatures of fake or dying activity.

| Id | Rule | Pass | Warn | Fail | Why |
|---|---|---|---|---|---|
| A1 | Trades in the last hour | ≥ 10 | 1–9 | 0 | A pool nobody trades is dead or abandoned. |
| A2 | Wash-trade pattern | — | — | 1h volume > 6× the average hour of the last 24h **and** \|price change 1h\| < 5% **and** 1h volume > $1k | Volume spiking more than 500% while price barely moves is the wash-trading signature in arXiv 2507.01963. Real demand moves price. The $1k minimum stops tiny pools from tripping the rule on noise. |
| A3 | Thin-liquidity price inflation | — | +100% in 24h with ≥ 90% buys but more than 10 traders | +100% in 24h, ≥ 90% buys, **≤ 10 unique traders** | From arXiv 2507.01963: a few wallets buying into a thin pool can "pump" the chart with no real participation. Unique traders come from GeckoTerminal; if they are missing, raw trade count is used as a proxy. |
| A4 | Price collapse | — | ≤ −50% in 24h | ≤ −80% in 1h or ≤ −90% in 6h | Rug and dump signature: liquidity pulled or insiders exited. |
| A5 | Buy share (1h) | ≥ 35% of trades are buys | < 35% | — | Sustained one-sided selling means holders are exiting (*heuristic*). |
| A6 | Unique buyers (1h) | ≥ 5 wallets | < 5 | — | Breadth: real interest means many distinct wallets, not one bot (*heuristic*). |
| A7 | Trades per wallet (24h) | ≤ 8 | > 8 | — | A few wallets cycling many trades means bot churn or volume farming (*heuristic*). Shown only when unique-wallet data exists. |

### S — Solana contract checks (RugCheck, GoPlus)

| Id | Rule | Pass | Warn | Fail | Why |
|---|---|---|---|---|---|
| S1 | Mint authority | revoked | — | still set | An active mint authority can print unlimited supply and dump it. Solana Tracker weights this risk at 2,500. |
| S2 | Freeze authority | revoked | — | still set | Can freeze buyers' token accounts so only the dev can sell. Solana Tracker weights this at 7,500, its highest. |
| S3 | Balance-mutable authority (GoPlus) | absent | — | present | Someone can change wallet balances directly. |
| S4 | Transfer hook (Token-2022) | none | — | any hook program | A hook can block or tax transfers at will. |
| S5 | Default account state | initialized | — | frozen ("2") | New holder accounts start frozen. Note: GoPlus value "1" means initialized, not "true". |
| S6 | Non-transferable or closable mint | neither | — | either | The token cannot be moved, or its mint can be closed. |
| S7 | Transfer fee (Token-2022) | 0% | > 0% | > 10% | A hidden tax on every transfer, including sells. |
| S8 | Metadata mutable | immutable | mutable | — | Name and logo can be swapped later, for example to impersonate another token. |
| S9 | RugCheck verdict | no danger risks | — | `rugged = true` or any risk with level "danger" | Uses RugCheck's own analysis without averaging its score into ours. Its raw flags are kept separate. |

### E — EVM contract checks (GoPlus, Honeypot.is)

GoPlus reports taxes and holder percentages as fractions (0.05 = 5%). "Owner renounced" means the owner address is empty, zero or `0x…dead`.

| Id | Rule | Pass | Warn | Fail | Why |
|---|---|---|---|---|---|
| E1 | Sellable | not a honeypot | — | `is_honeypot`, `cannot_sell_all` or `cannot_buy` | The classic honeypot: you can buy but never sell. |
| E2 | Sell tax | ≤ 5% | 5–10% | > 10%; **empty = unknown** | A high sell tax is a soft honeypot. The 10% cut is a research-report suggestion (*heuristic*). |
| E3 | Buy tax | ≤ 10% | > 10% | — | Makes entry expensive and often signals a tax-farming contract. |
| E4 | Owner backdoors | none | — | `hidden_owner`, `owner_change_balance`, `can_take_back_ownership` or `selfdestruct` | The owner can take funds or regain control even after a "renounce". |
| E5 | Source verified | verified | — | unverified bytecode | Unverified code cannot be audited. Legitimate launches verify. |
| E6 | Owner trading levers | none, or owner renounced | pausable, blacklist, slippage/tax modifiable, cooldown or anti-whale modifiable, with an active owner | — | The owner can change the rules mid-trade. These levers do nothing once ownership is renounced. |
| E7 | Fixed supply | not mintable | mintable but owner renounced | mintable with an active owner | Same supply-inflation risk as S1. |
| E8 | Upgradeable proxy | — | is a proxy | — | The contract logic can be swapped after launch. |
| E9 | Creator history | — | — | the same creator shipped a honeypot before | Serial scammers: on ETH/BSC, 1% of addresses created more than 20% of tokens (Cernera et al., USENIX 2023). |
| E10 | Sell simulation (detail view) | simulated sell succeeds, tax ≤ 5% | tax 5–10% | reverts, or tax > 10% | Honeypot.is actually buys and sells on a fork. "Pair unsupported" (common on Uniswap v4 and launchpad pools) is unknown, not pass. |

### H — Holders and liquidity

Concentration is computed **after removing accounts that are not people**. On Solana these are RugCheck `knownAccounts` of type AMM or LOCKER, every market's pool and vault accounts and their owner, and the pair address. If the token is still on a bonding curve and the largest remaining holder is above 50% and not flagged as an insider, that holder is treated as the curve vault and excluded; the UI marks the value "(curve vault excluded)". On EVM the finder removes locked balances, burn addresses, DEX pair addresses and all contracts.

| Id | Rule | Pass | Warn | Fail | Why |
|---|---|---|---|---|---|
| H1 | Top-10 holders (excluding the accounts above) | ≤ 20% | 20–30% | > 30% | Concentrated supply can be dumped on buyers. The 30% cut matches Mobula's "healthy" profile and the 50.8% of doubled memecoins in arXiv 2507.01963 whose top-10 held more than 30%. |
| H2 | Largest single wallet | ≤ 15% | > 15% | — | One wallet able to crash the price (*heuristic*). |
| H3 | Creator holding | ≤ 5% | 5–20% | > 20% | Mobula treats a dev share under 5% as healthy. A dev holding a large share is a dump waiting to happen. |
| H4 | Insiders (Solana) | none | insider wallets hold some supply, or RugCheck found linked wallet networks | insiders hold > 20% | Bundled or sniped launches where the dev split supply across wallets. Pine Analytics found more than 15,000 pump.fun launches in one month with deployer-funded snipers. |
| H5 | Holder count | ≥ 50 | < 50 | — | Too few holders for the price to mean anything. |
| H6 | LP locked or burned | ≥ 50% | < 50% | — | Unlocked LP can be pulled (a "hard rug"). This is only a soft penalty, because RugCheck's LP numbers on newer AMMs (for example Meteora DAMM v2) are not reliable enough for a hard gate. Skipped on bonding curves. |

## 4. Verdict

```
fail     if any check = fail
caution  if ≥ 3 warnings,
         or the security sweep did not run   (shown as UNCHECKED),
         or a critical check is unknown       (S1, S2, E1, E2, H1)
pass     otherwise
```

The critical-unknown rule exists because missing data is not good news. A fresh EVM token that GoPlus has not yet simulated has an unknown sell tax, so it cannot pass however clean everything else looks.

## 5. Score (0–100)

The score ranks tokens within a verdict. It measures **activity quality**, not expected return.

```
score = 100 × Σ(weight × feature) × risk
risk  = 0                          if verdict = fail
        max(0.3, 1 − 0.1 × warnings) otherwise
```

| Feature | Weight | 0 → 1 mapping |
|---|---|---|
| Unique buyers (1h) | 25% | log10(1 + buyers) / log10(201), so 200 buyers scores 1. Falls back to buys ÷ 2. |
| Buy pressure (1h) | 15% | (buy share − 40%) / 30%, so 70% buys scores 1. |
| Volume / liquidity (24h) | 15% | log10(1 + turnover) / log10(21), so 20× turnover scores 1. Wash trading is already caught by A2. |
| Trade acceleration | 20% | (last-5-min trade rate ÷ average 5 min of last hour − 0.5) / 2.5, so 3× scores 1. |
| Liquidity depth | 15% | log10(liquidity ÷ floor) / 2, so 100× the floor scores 1. |
| Socials linked | 10% | (twitter + telegram + website) / 3, from DexScreener. A Telegram link raises pump.fun graduation odds about 5× (arXiv 2607.02823). That is a survival signal, not a return signal. |

The weights are hand-set. They should be refitted (logistic regression or LightGBM) once point-in-time outcomes are logged, as the research report describes.

## 6. Limits you should know

- **No social layer yet.** This version is on-chain and DEX only, as requested. The X and Telegram signals in the research report need paid API access (about $0.005 per post read on X) or an always-on worker (a Telegram user-account client), and neither fits a free Vercel deployment.
- **Snapshot, not stream.** Vercel functions cannot hold WebSockets, so discovery polls new and trending lists every 60 s. Tokens that launch and die between polls, or never trend, are missed. The PumpPortal WebSocket and per-wallet smart-money tracking need a separate worker.
- **Keyless rate limits.** GeckoTerminal's keyless tier is about 10–30 calls a minute, and Vercel's egress IPs are shared. On a busy minute some sources fail, and the affected checks show "?" with a banner. Scan results and every provider response are cached in memory per server instance (60–120 s).
- **Holder exclusion is heuristic.** An unlabelled pool or vault can still be counted as a whale, which makes the result too strict (a false fail). On EVM, excluding all contracts can hide a dev wallet that is a contract, which makes it too lenient.
- **Vendor data can lag or be wrong.** GoPlus and RugCheck index new tokens with a delay. Taxes, authorities and LP state can change after a check, which is why the checks re-run on every refresh.
- **Not validated as a strategy.** No backtest has been run on these rules. Before trusting the ranking, log point-in-time snapshots and measure precision against a matched baseline of random new tokens after slippage (research report, "Backtest without fooling yourself").
- **Legal posture.** The page is information only and identical for every viewer, with no accounts, alerts per user, custody or trade routing. That keeps it out of MiCA "advice" and crypto-asset service provider (CASP) territory, per the research report. It shows paid DexScreener placement as such and never ranks it up.

## 7. Where things live in the code

| File | Role |
|---|---|
| `lib/finder/types.ts` | Chains, data shapes, defaults, query parsing |
| `lib/finder/sources.ts` | Adapters for GeckoTerminal, DexScreener, RugCheck, GoPlus and Honeypot.is, with TTL cache and in-flight de-duplication |
| `lib/finder/checks.ts` | Every rule in section 3, the verdict and the score |
| `lib/finder/scan.ts` | Discovery → snapshot → gates → security sweep → ranking; single-token analysis |
| `app/api/finder/route.ts` | `GET /api/finder?chain=&minLiq=&maxMcap=` |
| `app/api/finder/token/route.ts` | `GET /api/finder/token?chain=&address=` (full check plus candles) |
| `app/finder/page.tsx`, `components/Finder*.tsx` | The `/finder` UI |

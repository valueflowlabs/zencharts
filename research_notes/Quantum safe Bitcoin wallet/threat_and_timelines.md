# Quantum Threat to Bitcoin Signatures and Expected Timelines (as of 26 Oct 2026)

Source legend: **[P]** = primary source (paper, report, official page) read in this session; **[P*]** = primary source cited from prior knowledge, not re-fetched this session (verify before quoting); **[S]** = secondary or commentary source.

## 1. What a CRQC breaks: Shor vs Grover

### Takeaway
Shor's algorithm solves the elliptic-curve discrete log problem on secp256k1, so a CRQC can derive the private key from any exposed public key. That breaks both ECDSA and BIP-340 Schnorr, which use the same curve and key pairs. Grover gives only a square-root speedup against SHA-256 and RIPEMD-160 and does not parallelize well, so address hashes and proof-of-work are considered safe for the foreseeable future.

### Cited Findings
- Bitcoin uses ECDSA over secp256k1, and since the 2021 Taproot soft fork it also uses Schnorr signatures (BIP-340) over the same curve. A CRQC that derives a private key from a public key can create a valid transaction spending the victim's UTXOs. The Chaincode report calls this "the most significant quantum threat to Bitcoin." — [P] [Chaincode Labs, "Bitcoin and Quantum Computing: Current Status and Future Directions," Milton & Shikhelman, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- Google Quantum AI and co-authors (March 2026) give resource estimates for "Shor's algorithm for the 256-bit Elliptic Curve Discrete Logarithm Problem (ECDLP-256)." These cover the curve used by Bitcoin, Ethereum and others. — [P] [Babbush, Zalcman, Gidney et al., arXiv:2603.28846, v1 30 Mar 2026, v2 15 Apr 2026](https://arxiv.org/abs/2603.28846)
- **Grover on hashes:** Grover gives a quadratic speedup for unstructured search, from O(N), which parallelizes, to O(√N), which is sequential. SHA-256 and RIPEMD-160 are "somewhat weakened, but by no means broken." Roughly 2^255 classical operations become roughly 2^128 (3.4×10^38) quantum operations. Chaincode says breaking these hashes would need a CRQC that "far exceeds the capabilities of any foreseeable CRQC in the near to medium term." — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Classical comparison:** Chaincode estimates the El Capitan supercomputer would need about 10^17 years to derive a private key from a public key, and about 10^53 years to find a SHA-256 preimage. — [P] [Chaincode Labs, May 2025, footnote 7](https://chaincode.com/bitcoin-post-quantum.pdf)
- The Google paper says Bitcoin's proof-of-work is immune to quantum attacks using Grover. It also says inverting a hash to recover a public key with Grover is "not a credible threat." — [P] [arXiv:2603.28846, 2026](https://arxiv.org/html/2603.28846)
- **Mining** (all from [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)):
  - Grover does not parallelize, so fewer, faster quantum machines are favored.
  - A quantum miner with "optimistic specifications" would reach about 13.8 GH/s. A single ASIC does about 500 TH/s, and the network exceeds 800 EH/s (May 2025).
  - Quantum gate speeds are currently limited to "tens or hundreds of MHz."
  - Theoretical risks remain: a higher stale-block and fork rate, and a "quantum superlinearity" centralization effect that could reduce mining to two dominant quantum miners (citing Sattath and others).
- **BIP-32 derivation:** HD derivation from child key to parent key uses HMAC-SHA512, a hash, so a CRQC does not link addresses derived from a private xpub. The risk appears only when the xpub itself (a public key plus chain code) is known. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)

### Inferences
- The threat is specific to signatures. Hash-based protections (P2PKH, P2WPKH, P2SH, P2WSH before first spend) stay meaningful against at-rest attacks, but not once the key is revealed.
- Schnorr gives no extra quantum resistance over ECDSA, since it uses the same discrete-log problem on the same curve.

### Gaps
- I did not fetch a dedicated quantitative paper on Grover resource costs for SHA-256 preimages (for example Amy et al. 2016, cited as [ADM+16] by Chaincode).

## 2. Which outputs expose public keys, and when (long-range vs short-range)

### Takeaway
P2PK, bare multisig (P2MS) and P2TR expose a public key in the output itself, so they are vulnerable "at rest" (long-range) from the moment they are funded. Hash-based types (P2PKH, P2WPKH, P2SH, P2WSH) are exposed only when spent (short-range, mempool front-running), unless the key was already revealed through address reuse, a spend on a fork chain, xpub sharing, multisig co-signers or Lightning counterparties.

### Cited Findings
- **Long-range attacks** target public keys already on the blockchain, which are vulnerable "until moved." **Short-range attacks** ("front-running" or "transaction hijacking") target the window after a spend reveals the key and before it confirms deeply. The attacker can replace the transaction (RBF-style), mine it directly, or incentivize a reorg. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **"Immediately vulnerable" types are P2PK, P2MS and P2TR.** Each puts the public key or keys directly in the scriptPubKey. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **P2TR:** the key path spends with a signature from the "tweaked key," which sits on-chain in the output. A CRQC could derive its private key and spend via the key path without meeting any script conditions. A future soft fork that disables key-path spending could fix this, unlike P2PK and P2MS. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf). The Google paper calls Taproot's direct storage of the tweaked key "a security regression." — [P] [arXiv:2603.28846](https://arxiv.org/html/2603.28846)
- **Address reuse** turns P2PKH, P2SH, P2WPKH and P2WSH from short-range-only into long-range vulnerable after the first spend. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Fork chains:** spending a pre-fork UTXO on Bitcoin Cash, Bitcoin Gold or similar chains (2017–2019) revealed public keys for UTXOs that are still unspent on Bitcoin. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Xpubs:** a CRQC holding an xpub and its chain code can iterate every non-hardened child public key and derive the matching private keys. One leaked xpub, for example one given to an exchange, wallet backend or payment processor, can compromise every non-hardened path. Hardened children remain secure. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Multisig, Lightning and escrow:** co-signers know each other's public keys. Lightning "necessarily exposes channel public keys to both participants during channel establishment and operation." Chaincode notes the risk of insiders with "perverse incentives" to attack. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Ecosystem attacks:** if ECC falls generally, TLS man-in-the-middle against exchanges, hardware-wallet firmware signing, pool authentication and DNS also become vectors. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **How feasible short-range attacks are, quantified (March/April 2026):**
  - A primed superconducting CRQC has "slightly less than 41%" probability of deriving the key before a Bitcoin transaction confirms (10-minute blocks, idealized and attacker-favorable, zero congestion).
  - For comparison: Litecoin under 3%, Zcash under 1/1,300, Dogecoin under 1/8,000.
  - Precomputing the half of Shor that does not depend on the key leaves about 9 minutes of work after the key is revealed (12 minutes in the alternative case).
  - The paper argues that if an attacker cannot break a key within "say, 30 minutes or an hour," a high enough fee protects any transaction.
  - Source: [P] [arXiv:2603.28846](https://arxiv.org/html/2603.28846)
- **Fast-clock vs slow-clock hardware:**
  - Fast-clock machines are superconducting, photonic and silicon-spin. Slow-clock machines are neutral-atom and ion-trap. [P] [arXiv:2603.28846 abstract](https://arxiv.org/abs/2603.28846)
  - The paper argues the first fast-clock CRQCs could enable on-spend attacks on public-mempool transactions. Slow-clock machines make at-rest attacks feasible well before on-spend attacks. [P] [arXiv:2603.28846 abstract](https://arxiv.org/abs/2603.28846); [S] [PostQuantum.com summary](https://postquantum.com/security-pqc/google-quantum-bitcoin-ecdlp/)

### Inferences
- In 2025–2026 the "short-range attacks are much harder" assumption weakened. With about 9 minutes after precomputation, a fast-clock CRQC competes with Bitcoin's 10-minute block interval. So the first CRQC may threaten not only dormant P2PK coins but ordinary spends too, unless private mempools or commit-reveal are used.
- Taproot holds about a third of UTXOs but a small share of value (see section 3). Its at-rest exposure is a design consequence, not a user error.

### Gaps
- I found no quantitative estimate of BTC exposed via xpubs held by third parties, Lightning channels or fork-chain spends. Chaincode only calls fork exposure "potentially non-trivial."

## 3. How many BTC are exposed

### Takeaway
Estimates converge on about 1.7M BTC in P2PK (mostly Satoshi-era, dormant) and about 6–7M BTC in total with an exposed public key, roughly 30–35% of supply, which is dominated by address reuse (often exchanges). Exposure counts move as custodians rotate addresses. The truly "unmovable" dormant set is smaller, at about 2.3M BTC (Google, 2026).

### Cited Findings
- **P2PK:**
  - About 1,720,747 BTC (about 8.68% of value) in about 0.025% of UTXOs (Chaincode, citing Erhardt 2023 data). Only about 67 new P2PK UTXOs were created in the 2.5 years to 2025. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
  - "A little over 1.7 million bitcoin (nearly 9% of all bitcoin) is secured by P2PK locking scripts." — [P] [Google et al., arXiv:2603.28846, Mar 2026](https://arxiv.org/html/2603.28846)
- **Satoshi-era coins:** 600K–1.1M BTC in P2PK, about 3–5.5% of supply, mostly 50-BTC coinbase UTXOs (Chaincode citing a 2017 estimate). — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **P2MS:** about 1.037% of UTXOs, but only about 57 BTC. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **P2TR:** about 32.5% of UTXOs but about 0.74% of value (about 146,715 BTC, Chaincode citing Erhardt; the data vintage is older than May 2025). — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf). A 2026 secondary table gives about 198,000 BTC in Taproot. — [S] [qubitchain.io blog, 2026](https://qubitchain.io/blog/bitcoin-exposed-public-keys-quantum-risk-2026) (vendor blog, indicative only)
- **Total exposed-pubkey BTC** (each figure's date as reported):
  - **Range, Chaincode, May 2025:** 4–10M BTC (20–50% of supply) is "potentially vulnerable." — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
  - **Project Eleven, mid-Jan 2025:** about 6.26M BTC across about 11.1M addresses with non-zero balance and exposed keys, as reported by Chaincode. The report's text says "mid January 2015," clearly a typo for 2025. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
  - **Project Eleven, 2026:** about 6.9M BTC with visible public keys, cited at the April 2026 Q-Day Prize award. — [S] [The Quantum Insider, 24 Apr 2026](https://thequantuminsider.com/2026/04/24/project-eleven-q-day-prize-quantum-ecc-attack/); [S] [CoinDesk, 24 Apr 2026](https://www.coindesk.com/tech/2026/04/24/researcher-wins-1-bitcoin-bounty-for-largest-quantum-attack-on-underlying-tech)
  - **Google et al., Mar 2026:** "∼6.9M total bitcoin across all protocols are vulnerable" (Figure 5). P2PK, P2TR and P2MS count as 100% vulnerable, and other types only where keys were reused. "Dormant" quantum-vulnerable BTC "may reach 2.3 million BTC when all script types are considered" (about 1.7M P2PK plus about 0.6M other). — [P] [arXiv:2603.28846](https://arxiv.org/html/2603.28846)
  - **Coinbase analyst, 2026:** about 6.51M BTC (32.7% of supply). — [S] [Yahoo Tech, 2026](https://tech.yahoo.com/cybersecurity/articles/bitcoin-wallets-risk-quantum-computers-220929706.html)
  - **"Quantum Alliance" report, Oct 2026:** about 6.04M BTC (30.2%). — [S] [shattered.io, 2026](https://shattered.io/quantum-alliance-bitcoin-30-2-percent-risk-2026/) (secondary; originator not verified)
  - **BIP-361 text:** cites more than 34% of all bitcoin as of 1 Mar 2026. — [S] [Spark research summary of BIP-361](https://www.spark.money/research/bitcoin-bip-361-quantum-migration-roadmap)
  - **Breakdown (2026 secondary table):** about 4.99M BTC from address reuse, about 1.72M P2PK, about 198K Taproot. — [S] [qubitchain.io](https://qubitchain.io/blog/bitcoin-exposed-public-keys-quantum-risk-2026)
- **CoinShares counter-view (Feb 2026):** about 1.6M BTC (about 8%) sits in legacy P2PK. Only about 10,200 BTC is in outputs large enough that theft would substantially disrupt the market, and the rest is fragmented into many small UTXOs that would take a long time to attack serially. — [S] [ForkLog report of CoinShares note](https://forklog.com/en/chaincode-labs-sizes-up-the-quantum-threat-to-bitcoin/)
- **Lost coins:** an estimated 2–3M BTC (2017 estimate), "though not all lost coins would be quantum-vulnerable." — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Address reuse by exchanges and institutions** concentrates vulnerable coins in a few high-value addresses that are "likely to be prioritized." Chaincode calls this a "manageable" risk because owners can move the funds. — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)

### Inferences
- Splitting the exposure:
  - About 1.7M BTC in P2PK is the hard core, because the keys are likely lost or dormant and the coins can't be migrated by their owners.
  - About 4–5M BTC is reuse-exposed. Most of it is live custodial or exchange funds, which can migrate quickly once a safe target output type exists.
  - Taproot exposure (about 0.15–0.2M BTC) is small by value but large by UTXO count.
- The CoinShares "10,200 BTC market-moving" figure depends on how fast attacks run. With the 2026 Google figures (minutes per key once a machine exists), throughput per CRQC per day is meaningful, which weakens the "too slow to attack many small UTXOs" argument. This is my inference, not a published rebuttal.

### Gaps
- The originating BitMEX Research, River and Deloitte exposure figures were not retrieved this session. Deloitte's commonly cited figure, about 4M BTC (about 25%), is likely the [BBH] reference in Chaincode, but I did not verify it.
- I could not access Project Eleven's live tracker (projecteleven.com returned 403), so the current exact figure is unverified beyond the "≈6.9M" press quotes.

## 4. Resource estimates and state-of-the-art hardware

### Takeaway
Estimates for breaking 256-bit ECC fell sharply:
- **2017:** about 2,300 logical qubits and about 10^11 Toffolis.
- **2022:** about 13M physical qubits for a 1-day attack.
- **2023:** about 9M photonic qubits (Litinski).
- **March 2026 (Google):** fewer than 500K superconducting physical qubits, about 1,200–1,450 logical qubits, 70–90M Toffolis, about 18–23 minutes, or about 9 minutes after precomputation.
- **March 2026 (Oratomic/Caltech, neutral atoms):** about 10K–26K atomic qubits, in days.

Hardware in October 2026 is at about 30–100 logical qubits with error rates still improving. That is roughly 1–2 orders of magnitude short of the logical-qubit count, and much further short in sustained gate depth (about 10^8 Toffolis).

### Cited Findings
- **Roetteler, Naehrig, Svore, Lauter (2017):** Shor for 256-bit ECC needs about 2,330 logical qubits and about 1.26×10^11 Toffoli gates. — [P*] [arXiv:1706.06752](https://arxiv.org/abs/1706.06752)
- **Webber et al. (AVS Quantum Science, 2022):** about 13M physical qubits to break Bitcoin ECC in 1 day, or about 317M within 1 hour (surface code, 10^-3 error, 1 µs cycle). — [P*] [AVS Quantum Sci. 4, 013801 (2022)](https://doi.org/10.1116/5.0073075)
- **Litinski (2023):** "How to compute a 256-bit elliptic curve private key with only 50 million Toffoli gates." The Google paper puts it at about 200M Toffolis per single instance (the 50M is amortized across multiple instances) and about 9M physical qubits on a photonic architecture. — [P] [arXiv:2306.08585](https://arxiv.org/abs/2306.08585); comparison per [P] [arXiv:2603.28846](https://arxiv.org/html/2603.28846)
- **Chevignard et al.:** about 1,100 logical qubits but more than 100 billion Toffolis. — [P] [as summarized in arXiv:2603.28846](https://arxiv.org/html/2603.28846)
- **Gidney (May 2025), RSA-2048:** fewer than 1M noisy qubits and under a week, down from about 20M in Gidney and Ekerå 2019. This sets the hardware assumptions reused in 2026: 10^-3 error, 1 µs cycle, 10 µs reaction time. — [P*] [arXiv:2505.15917](https://arxiv.org/abs/2505.15917); [S] [PostQuantum.com](https://postquantum.com/quantum-threat-crypto/resource-estimates-blockchain-cryptography/)
- **Google Quantum AI et al., 30 Mar 2026 (arXiv:2603.28846):**
  - Two circuits: fewer than 1,200 logical qubits with fewer than 90M Toffolis, or fewer than 1,450 logical qubits with fewer than 70M Toffolis.
  - Fewer than 500K physical qubits on superconducting hardware (10^-3 error, planar degree-4 connectivity), executing "in minutes."
  - About 18 minutes for 70M Toffolis and about 23 minutes for 90M. Precomputation leaves about 9 minutes after the key is revealed.
  - "Nearly a 20 fold reduction" in physical qubits versus prior estimates.
  - The circuits were withheld. Validity was shown through a zero-knowledge proof (SP1 zkVM to Groth16, 9,024 Fiat-Shamir-sampled test inputs).
  - The Google blog references "Google's 2029 migration timeline."
  - Sources: [P] [arXiv:2603.28846](https://arxiv.org/abs/2603.28846); [P] [Google Research blog, 31 Mar 2026](https://research.google/blog/safeguarding-cryptocurrency-by-disclosing-quantum-vulnerabilities-responsibly/); ZK details per [S] [PostQuantum.com](https://postquantum.com/security-pqc/google-quantum-bitcoin-ecdlp/)
- **Fast vs slow clock:** about 500K T-states/s are needed for the 9-minute attack. That takes about 25K physical qubits of magic-state factories on a fast-clock machine, versus about 2.5M on a slow-clock machine with 100 µs rounds. — [S] [PostQuantum.com summary of arXiv:2603.28846](https://postquantum.com/security-pqc/google-quantum-bitcoin-ecdlp/)
- **Oratomic/Caltech/UC Berkeley (31 Mar 2026), arXiv:2603.28627, "Shor's algorithm is possible with as few as 10,000 reconfigurable atomic qubits":**
  - About 26,000 neutral-atom qubits could compute P-256 discrete logs "in a few days." Secondary coverage says about 10 days.
  - The 10K figure is a space-efficient lower bound.
  - Uses high-rate qLDPC codes (lifted-product, bivariate bicycle) instead of surface codes. Co-authors include John Preskill and Dolev Bluvstein.
  - Not peer-reviewed or replicated as of the search.
  - Sources: [P] [arXiv:2603.28627](https://arxiv.org/pdf/2603.28627); [S] [PostQuantum.com](https://postquantum.com/security-pqc/10000-qubits-shors/)
- **Luo et al. (Tsinghua, PKU, SYSU, CAS), arXiv:2607.13816, 15 Jul 2026:**
  - 835 logical qubits for secp256k1, down from 1,333 in their April preprint arXiv:2604.02311.
  - The trade-off is about 2^30.6 (about 1.7B) Toffolis, about 20× more than Google's space-optimized circuit.
  - No depth or wall-clock analysis.
  - Sources: [S] [PostQuantum.com, 20 Jul 2026](https://postquantum.com/security-pqc/ecc-secp256k1-835-logical-qubits/); [P*] [arXiv:2607.13816](https://arxiv.org/abs/2607.13816)
- **EUROCRYPT 2026 paper:** reportedly brings P-256 down to 1,193 logical qubits. — [S] [PostQuantum.com](https://postquantum.com/security-pqc/algorithm-quantum-ecc/)
- **Largest public quantum ECC break: a 15-bit ECC key**, by Giancarlo Lelli on cloud-accessible hardware. It won Project Eleven's 1 BTC Q-Day Prize on 24 Apr 2026, described as a "512x jump" over the previous public demonstration. Critics, including an X community note, argue the method leans on classical guess-and-check. — [S] [The Quantum Insider, 24 Apr 2026](https://thequantuminsider.com/2026/04/24/project-eleven-q-day-prize-quantum-ecc-attack/); [S] [CoinDesk, 24 Apr 2026](https://www.coindesk.com/tech/2026/04/24/researcher-wins-1-bitcoin-bounty-for-largest-quantum-attack-on-underlying-tech)
- **Hardware state:**
  - **Google Willow (Dec 2024):** 105 physical qubits, below-threshold error correction. — [P] [Chaincode, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
  - **Microsoft Majorana 1 (Feb 2025):** claims of topological qubits, met with scientific skepticism. — [P] [Chaincode, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
  - **IBM and University of Chicago (Jul/Aug 2026):** 70 logical qubits running 2,415 logical two-qubit gates and 468 logical T gates. — [P] [IBM Newsroom, 30 Jul 2026](https://newsroom.ibm.com/2026-07-30-ibm-and-the-university-of-chicago-demonstrate-quantum-advantage,-establishing-trusted-quantum-computation-on-logical-circuits)
  - **Quantinuum Helios (19 Oct 2026):** 99.9995% logical fidelity with a color code. — [S] [The Qubit Report, 19 Oct 2026](https://thequbitreport.com/research-breakthroughs/2026/10/19/quantinuum-breaks-error-correction-world-record-is-this-just-chest-puffing-or-a-substantive-milestone/)
  - **Infleqtion (24 Sep 2026):** 30 entangled logical qubits from 80 physical qubits. — [P] [Infleqtion](https://infleqtion.com/infleqtion-achieves-30-entangled-logical-qubits-on-its-sqale-quantum-computer/)
  - **QuEra:** about 96 verified logical qubits (Jan 2026). — [S] [Quantum Zeitgeist leaderboard](https://quantumzeitgeist.com/quantum-logical-qubit-leaderboard/); [S] [PostQuantum.com](https://postquantum.com/security-pqc/ecc-secp256k1-835-logical-qubits/)
  - **Caltech neutral-atom array:** about 6,100 physical qubits, the largest by count. — [S] [dig.watch](https://dig.watch/updates/quantum-computing-threatens-bitcoin-experts-debate-timeline)
- **Roadmaps:**
  - **IBM:** Starling, about 200 logical qubits and 100M gates by 2029. Blue Jay, about 2,000 logical qubits, by 2033 or later. — [S] [Quantum Zeitgeist / qrlhub trackers](https://qrlhub.com/en/qubits); [P*] [IBM Starling announcement, Jun 2025](https://newsroom.ibm.com/2025-06-10-IBM-Sets-the-Course-to-Build-Worlds-First-Large-Scale,-Fault-Tolerant-Quantum-Computer-at-New-IBM-Quantum-Starling-Site)
  - **Quantinuum:** fully fault-tolerant by 2030 (Apollo). — [S] [search summaries](https://quantumzeitgeist.com/quantum-logical-qubit-leaderboard/)
  - **Infleqtion:** 100 logical qubits in 2028 and 1,000 in 2030. — [P] [Infleqtion roadmap](https://infleqtion.com/roadmap/)
  - **Intel/AIST:** "tens of thousands of logical qubits ... by the early 2030s." — [P] [Chaincode, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)

### Inferences
- The binding constraint is now sustained fault-tolerant depth (about 10^8 Toffolis at low logical error), not logical-qubit count. Logical-qubit demonstrations (about 30–100) are about 10–40× short of 1,200, and demonstrated logical T-gate counts (hundreds) are about 10^5 short of 70M.
- IBM Starling (2029: 200 logical qubits, 10^8 gates) would match the gate budget but not the qubit width. Blue Jay-class machines (2033 or later) would be in range on paper.
- The physical-qubit requirement fell about 26× from Webber (13M) to Google (under 500K) in four years, and the neutral-atom requirement to about 10–26K. Algorithmic progress is outpacing hardware progress as the driver of shorter timelines.

### Gaps
- I found no 2026 Google Willow successor milestone in search.
- I did not retrieve primary Quantinuum or Microsoft 2026 roadmap pages.
- The 26K-qubit Oratomic runtime is quoted variously as "a few days" (abstract) and "about 10 days" (secondary).

## 5. Expert timeline estimates and 2026 events

### Takeaway
Institutional anchors point to 2030–2035:
- NIST: deprecate ECDSA after 2030, disallow after 2035.
- NSA CNSA 2.0: exclusive PQC in national security systems by 2030–2035.
- Google: own migration by 2029.
- GRI 2025 survey (published March 2026): 28–49% probability of a CRQC within 10 years, 51–70% within 15.

Bitcoin voices range from "2–9 years" (Charles Edwards) to "20–40 years" (Adam Back). The March 2026 resource cuts are the main reason estimates moved earlier.

### Cited Findings
- **Global Risk Institute "Quantum Threat Timeline Report 2025"** (7th edition, published Mar 2026, Mosca and Piani, evolutionQ): 26 experts. A CRQC is "quite possible (28–49%) within the next 10 years, and likely (51–70%) in the next 15." Experts see an accelerating timeline. Earlier editions defined a CRQC as breaking RSA-2048 within 24 hours. — [P] [GRI](https://globalriskinstitute.org/publication/quantum-threat-timeline-report-2025b/); [S] [PostQuantum.com commentary](https://postquantum.com/security-pqc/quantum-threat-timeline-report-2025/). Commentary frames 28–49% as the highest 10-year estimate in the series and maps it to Bitcoin as a "49% chance in 10 years." — [S] [Yellow.com](https://yellow.com/it/news/ora-il-49-di-probabilit%C3%A0-di-violare-la-crittografia-di-bitcoin-entro-10-anni-secondo-il-sondaggio-del-global-risk-institute)
- **NIST IR 8547 (initial public draft, 12 Nov 2024):** deprecate RSA, ECDSA, EdDSA, ECDH and DSA at 112-bit security after 2030, and disallow after 2035. Secondary sources say it was still a draft in mid-2026. It is guidance, but federal direction (OMB M-26-15) reportedly uses these dates as the planning baseline. — [S] [Encryption Consulting](https://www.encryptionconsulting.com/nist-ir-8547-2030-2035-action-plan/); [P*] [NIST IR 8547 ipd](https://csrc.nist.gov/pubs/ir/8547/ipd)
- **NSA CNSA 2.0:**
  - New national-security-system acquisitions must comply from 1 Jan 2027.
  - Software and firmware signing should be CNSA 2.0-exclusive by 2030 (using LMS or XMSS).
  - Full transition by 2035.
  - Secondary sources disagree on some intermediate milestones (2030, 2031, 2033).
  - Sources: [S] [Encryption Consulting](https://www.encryptionconsulting.com/education-center/what-is-cnsa-2-0/); [S] [FBK PQC KB timeline](https://aleph.fbk.eu/pqc-kb/timeline/nist/)
- **Chaincode (May 2025):** "Experts believe that CRQCs capable of breaking Bitcoin's ECC foundations could first emerge between 2030-2035." This aligns with the government deprecation dates. The report urges planning for an accelerated scenario too. It also cites Scott Aaronson (Sept 2024): "yes, unequivocally, worry about this now." — [P] [Chaincode Labs, May 2025](https://chaincode.com/bitcoin-post-quantum.pdf)
- **Google (Mar 2026):** references "Google's 2029 migration timeline" for its own PQC transition. The paper does not predict a CRQC date. It urges vulnerable communities to "migrate without delay." — [P] [Google Research blog, 31 Mar 2026](https://research.google/blog/safeguarding-cryptocurrency-by-disclosing-quantum-vulnerabilities-responsibly/); [P] [arXiv:2603.28846](https://arxiv.org/abs/2603.28846)
- **Adam Back (Blockstream):**
  - Nov 2025: "probably not for 20–40 years," noting NIST PQC standards already exist. He has also said he is "extremely concerned" about quantum threats to blockchains and does not rule out that CRQCs never arrive.
  - 7 Apr 2026, Bloomberg: "Quantum Risk Not Imminent for Crypto."
  - Sources: [S] [Cointelegraph](https://cointelegraph.com/news/bitcoin-quantum-threat-decades-post-quantum-migration); [S] [ForkLog](https://forklog.com/en/adam-back-dismisses-claims-of-bitcoin-developers-ignoring-quantum-threat/); [S] [Bloomberg video, 7 Apr 2026](https://www.bloomberg.com/news/videos/2026-04-07/quantum-risk-not-imminent-for-crypto-adam-back-video)
- **Charles Edwards (Capriole, an investor, not a developer):** threat within 2–9 years without upgrades, saying "we must act already in 2026." — [S] [dig.watch](https://dig.watch/updates/quantum-computing-threatens-bitcoin-experts-debate-timeline)
- **"Quantum Doomsday Clock"** (Colton Dillion and Rick Carback): a 8 Mar 2028 target date, disputed by industry. — [S] [dig.watch](https://dig.watch/updates/quantum-computing-threatens-bitcoin-experts-debate-timeline)
- **BIP-361 coverage:** cites CRQC estimates ranging "from the early 2030s to beyond 2040." — [S] [Spark research](https://www.spark.money/research/bitcoin-bip-361-quantum-migration-roadmap)
- **Other 2026 events:**
  - **24 Apr:** Project Eleven Q-Day Prize awarded for the 15-bit ECC break. The company is developing a follow-on challenge on AI and quantum cryptanalysis. — [S] [The Quantum Insider](https://thequantuminsider.com/2026/04/24/project-eleven-q-day-prize-quantum-ecc-attack/)
  - **30–31 Mar:** Google and Oratomic papers published the same week.
  - **Jul:** 835-logical-qubit preprint (see section 4).

### Inferences
- Combining the GRI distribution with the hardware roadmaps, a CRQC is plausible in the 2030–2035 window, with a meaningful tail in the late 2020s for fast-clock machines. On Google's analysis, the first CRQC would threaten mempool spends as well as P2PK. Neutral-atom paths (about 10–26K qubits, days per key) would first threaten only at-rest keys.
- The dispersion is large. Back's "20–40 years" predates the March 2026 resource cuts, and the GRI survey's acceleration reflects them.

### Gaps
- **Metaculus:** I found no current community forecast for an RSA-2048 or ECC-256 break date.
- **bitcoin-dev and Bitcoin Optech:** developer statements on timelines were not retrieved this session.
- **GRI full PDF:** the exact survey wording and its per-year distribution were not verified.
- **NIST IR 8547:** final-publication status as of Oct 2026 is unconfirmed.

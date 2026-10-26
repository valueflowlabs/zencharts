# Bitcoin Protocol-Level Post-Quantum Proposals and Candidate Signature Schemes (as of Oct 26, 2026)

## Q1. BIP-360 (P2QRH, then P2TSH, now P2MR): current specification, algorithms, merge status, revisions

### Takeaway
BIP-360 is now "Pay-to-Merkle-Root (P2MR)", v0.12.1 (2026-07-24), Status: Draft. It was merged into bitcoin/bips on about Feb 11–13, 2026. It defines a SegWit v2 (`bc1z`) output that works like Taproot with the key path removed. The current version specifies **no post-quantum signature algorithm and no new opcode**. PQ signatures are deferred to future tapscript opcodes or leaf versions. Merging it into the BIPs repo is not activation. There is no Bitcoin Core implementation or activation plan.

### Cited Findings
- Title "Pay-to-Merkle-Root (P2MR)". Authors Hunter Beast, Ethan Heilman, Isabel Foxen Duke. Status Draft. Consensus soft fork. Number assigned 2024-12-18. Current version 0.12.1. Requires BIPs 340/341/342 — [BIP-360 text](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Mechanics:
  - SegWit **v2** output with a 32-byte witness program (`bc1z…`). There is no internal key and no tap tweak. The witness program is the TapBranch Merkle root of the leaf scripts.
  - Spends use BIP-341 script-path rules with a control block of 1+32·m bytes (parity bit must be 1).
  - Tapscript is reused, and future leaf versions are supported.
  - The stated goal is resistance to **long-exposure** attacks, not short-exposure attacks.
  - — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Sizes:
  - A depth-1 P2MR witness is 135 B, compared with 66 B for a P2TR key-path spend (+69 B).
  - The general P2MR witness is 103+32·m B, which is 32 B smaller than an equivalent P2TR script-path spend.
  - Output sizes are identical to P2TR.
  - — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- PQ algorithms: P2MR adds none. ML-DSA and SLH-DSA are named only as examples for future work. Falcon is not mentioned. OP_SUCCESSx is named as the upgrade path — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Changelog with dates — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki):
  - 0.1.0 (2024-09-27): initial draft.
  - 0.3.0 (2024-10-21): XMSS replaced by CRYSTALS-Dilithium.
  - 0.5.0 (2024-12-13): Merkle-tree attestation.
  - 0.5.1 (2024-12-18): BIP number assigned.
  - 0.6.0 (2025-01-20): SQIsign removed; "long range" renamed "long exposure".
  - 0.6.2 (2025-03-12): verification times and key-type bitmask.
  - 0.7.0 (2025-03-18): commitment/attestation structure changed.
  - 0.8.0 (2025-07-07): P2QRH became "P2TR with key path removed"; PQ algorithms reduced from three to two.
  - 0.9.0 (2025-07-20): witness version changed from 3 to 2.
  - 0.10.0 (2025-09-17): rewrite; renamed P2QRH to **P2TSH**.
  - 0.10.1 (2026-01-21) and 0.10.2 (2026-01-23): bug fix and BIP-3 conventions.
  - 0.10.3 (2026-02-06): terminology.
  - 0.11.0 (2026-02-10): renamed P2TSH to **P2MR**.
  - 0.12.0 (2026-06-18): depth-zero (single-leaf) trees made anyone-can-spend.
  - 0.12.1 (2026-07-24): Python reference implementation and test vectors.
- Merge: PR #1670 was merged into bitcoin/bips in Feb 2026. Sources give Feb 11 or Feb 13 — [PR #1670](https://github.com/bitcoin/bips/pull/1670); [Anduro on X](https://x.com/andurobtc/status/2021703526666449095); [CoinDesk, Apr 2026](https://www.coindesk.com/tech/2026/05/02/new-bitcoin-quantum-proposal-offers-satoshi-nakamoto-a-way-to-prove-control-without-moving-btc)
- Merged as a document only. There is no Bitcoin Core implementation, and governance is described as taking years — [CoinDesk Apr 10, 2026](https://www.coindesk.com/markets/2026/04/10/quantum-safe-bitcoin-now-possible-without-a-soft-fork-but-costs-usd200-a-pop)
- BIPs PR #2198 (Optech, 2026-06-26) made one-path (depth-zero) P2MR outputs unsafe, consistent with v0.12.0 — [Optech quantum topic](https://bitcoinops.org/en/topics/quantum-resistance/)
- Implementation measurement (Optech, 2026-08-07): jeanpablojp's regtest showed BIP-360 needs about 96 lines of consensus delta over existing taproot code. A depth-1 Schnorr leaf is about 32 B lighter than the equivalent P2TR script path — [Optech #(2026-08-07)](https://bitcoinops.org/en/newsletters/2026/08/07/)

### Inferences
- The design moved from a self-contained PQ address type with attestation for several algorithms (2024) to a minimal "Taproot minus key path" container (2025–26). Signature-scheme choice is now a separate, later soft fork, so P2MR alone gives PQ protection only if a PQ opcode is added later or EC is disabled.

### Gaps
- Exact merge date: Feb 11 vs Feb 13 (secondary sources conflict). The PR page was not fetched directly.

---

## Q2. Migration and sunset proposals: BIP-361 (Lopp et al.), QRAMP, Hourglass, freeze/no-freeze, PACTs, reactions

### Takeaway
BIP-361 ("Post Quantum Migration and Legacy Signature Sunset", assigned 2026-02-11, Draft) would phase out legacy signatures over about five years, then freeze legacy spends unless a rescue proof is provided. The BIP text visible today has only Phases A and B. The earlier "Phase C" (ZK seed-based recovery) is now framed as a rescue protocol inside Phase B. Opposing ideas are QRAMP (2025, a hard deadline), Hourglass V2 (throttle P2PK spends), and PACTs (prove ownership in advance). Hoskinson and others call freezing confiscation. There is no consensus.

### Cited Findings
- BIP-361 metadata:
  - Authors Jameson Lopp, Christian Papathanasiou, Ian Smith, Joe Ross, Steve Vaile, Pierre-Luc Dallaire-Demers.
  - Assigned 2026-02-11. Draft. The header says "Informational" while the Layer field says consensus soft fork.
  - "Requires: TBD Post Quantum Signature BIP". It does not name BIP-360.
  - — [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki)
- Phase A starts 160,000 blocks (about 3 years) after activation and **disallows sending to quantum-vulnerable output types** — [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki)
- Phase B starts about 2 years after Phase A, a flag day about 5 years after activation. ECDSA/Schnorr spends become invalid unless accompanied by a quantum-safe rescue proof — [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki)
- Rescue proofs and the coins they cannot cover:
  - The rescue relies on information the owner has and an attacker lacks, e.g. a ZK proof of the BIP-32 parent xpriv. ZK-STARK and commit/reveal are both named, but no final protocol is specified.
  - **No rescue exists for P2PK.**
  - The BIP claims over 34% of BTC had an exposed pubkey as of 2026-03-01.
  - It says it is compatible with an "Hourglass"-style P2PK BIP if that activates before Phase B.
  - — [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki)
- Optech reported BIP-361 on 2026-04-24 — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)
- Earlier history: a "Draft BIP for destroying quantum-insecure bitcoins" and debate over destroying vulnerable coins (Optech 2025-04-04), and a debate on forcing migration (Optech 2025-08-01) — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)
- Hoskinson objection (Apr 16, 2026): he called BIP-361's "soft fork" label a lie, and argued the recovery method cannot rescue about 1.7M BTC that predate BIP-39 — [CoinDesk](https://www.coindesk.com/tech/2026/04/16/cardano-s-hoskinson-says-bitcoin-s-quantum-fix-is-a-hard-fork-that-can-t-save-satoshi-s-coins)
- QRAMP (Agustin Cruz, bitcoin-dev, Feb 2025):
  - A mandatory migration deadline after which legacy ECDSA funds cannot be spent. Press called it a hard fork.
  - Dustin Ray objected that it would cause serious financial harm.
  - No BIP number was found.
  - — [bitcoin-dev thread](https://groups.google.com/g/bitcoindev/c/8PM6iZCeDMc); [Bitcoin News](https://bitcoinnews.com/p/dormant-coins-quantum-resistant-fork-qramp)
- Hourglass V2 (Delving, 2026-02-10; Optech 2026-03-06):
  - Throttles P2PK spending to one P2PK input per block (about 1 BTC/block, about 144 BTC/day) instead of freezing.
  - Critics note it would take about 32 years for about 1.7M P2PK BTC to move, and that it creates a fee race that hands value to miners.
  - — [Delving "Hourglass V2 Update"](https://delvingbitcoin.org/t/hourglass-v2-update/2246); [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)
  - Author attributed to Hunter Beast by secondary sources — [bitcoincashresearch summary](https://bitcoincashresearch.org/t/post-quantum-cryptography/845/39)
- PACTs (Provable Address-Control Timestamps), Dan Robinson (Paradigm), late Apr / May 2026:
  - The owner makes a salted BIP-322 proof of ownership and timestamps a commitment via OpenTimestamps.
  - After a freeze, a STARK proof shows the commitment predated quantum hardware.
  - It needs a separate soft fork for STARK verification, and cannot help if Satoshi never makes a commitment.
  - — [CoinDesk May 2, 2026](https://www.coindesk.com/tech/2026/05/02/new-bitcoin-quantum-proposal-offers-satoshi-nakamoto-a-way-to-prove-control-without-moving-btc)
- Antoine Poinsot (bitcoin-dev, Optech 2026-05-01) argued that disabling vulnerable spends should be decided separately from enabling PQ migration. Participants agreed on adding PQ signing to tapscript plus a plain PQ output type — [Optech 2026-05-01](https://bitcoinops.org/en/newsletters/2026/05/01/)

### Inferences
- The visible BIP-361 text has two phases (A/B), not the three-phase A/B/C scheme Lopp described in July 2025. The old Phase C (ZK seed recovery) appears to be merged into Phase B's "rescue protocol". This is inferred because the current BIP text lists only A and B.
- The question of freezing Satoshi's (P2PK) coins remains unresolved. BIP-361 offers no P2PK rescue, Hourglass throttles instead of freezing, and PACTs only help holders who act in advance.

### Gaps
- The original BIP-361 announcement date (mid-April 2026 per press) and its changelog were not on the page.
- The structured Bitcoin Core maintainer position on freezing was not found (see Q5).

---

## Q3. Hash-based and script-only approaches: OP_CAT Lamport/Winternitz, QSB/Binohash/ColliderScript, CSFS, new PQ opcodes, tapscript PQ key embedding

### Takeaway
Options that work today without a soft fork are niche emergency tools. QSB (StarkWare, Apr 9, 2026) gives hash-based security in legacy script at $75–$200 of GPU work per spend, with miner-direct submission. Practical PQ spending needs a new opcode. The leading candidates are a SPHINCS/SHRINCS-based `OP_CHECKSPHINCS`-like opcode on top of P2MR or P2TRv2. Falcon was also proposed and drew implementation concerns.

### Cited Findings
- QSB "Quantum-Safe Bitcoin Transactions Without Softforks" by Avihu Mordechai Levy (StarkWare), Apr 9, 2026 — [StarkWare](https://starkware.co/blog/quantum-safe-bitcoin-transactions-without-softforks/)
  - Builds on Robin Linus's Binohash. Binohash relies on EC assumptions that Shor breaks, and QSB swaps them for a hash-to-signature puzzle.
  - Cost is $75–$200 of cloud GPU work per transaction, versus about $0.33 for a normal transaction.
  - Transactions must go directly to miners.
  - Incompatible with Lightning. The author calls it a "last resort" — [CoinDesk](https://www.coindesk.com/markets/2026/04/10/quantum-safe-bitcoin-now-possible-without-a-soft-fork-but-costs-usd200-a-pop)
  - Security rests on RIPEMD-160 preimage resistance, about 118-bit second-preimage security under quantum attack — [Medium analysis](https://encryptorium.medium.com/quantum-safe-bitcoin-transactions-without-a-soft-fork-what-the-qsb-paper-actually-says-93f2850b6d3f); [QRL critique](https://www.theqrl.org/blog/quantumsafe-bitcoin-without-a-soft-fork-its-clever-but-read-the-fine-print/)
- OP_CAT/Lamport line of work:
  - "Consensus-enforced Lamport signatures on top of ECDSA" (Optech 2024-05-08).
  - "Winternitz signature prototype using OP_CAT" (Optech 2025-07-04). Requires BIP-347 OP_CAT activation.
  - — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)
- Matt Corallo (bitcoin-dev, Optech #335, 2025-01-03): add a PQ signature-checking opcode in tapscript so funds stay spendable if ECDSA/Schnorr are disabled.
  - Luke Dashjr: no soft fork is needed now if the opcode is agreed in advance.
  - Tadge Dryja: a transitory soft fork restricting EC signatures, made permanent if someone solves an on-chain puzzle only a quantum computer can solve.
  - — [Optech 2025-01-03](https://bitcoinops.org/en/newsletters/2025/01/03/)
- Daniel Buchner (bitcoin-dev, Optech 2026-05-01): BIP-342 treats non-32-byte keys as unknown key types that are valid with any non-empty signature. Tagged PQ keys could therefore be embedded in tapscript today, paired with a BIP-340 signature or kept in unrevealed leaves, and enforced after a later soft fork. This requires strict avoidance of key reuse — [Optech 2026-05-01](https://bitcoinops.org/en/newsletters/2026/05/01/)
- Conduition's PQ HD wallet (Optech 2026-05-01):
  - Derives SPHINCS keys alongside secp256k1 keys in a BIP-32-like scheme. Non-hardened children share one SPHINCS key, so a nonce is needed in scripts for privacy.
  - Intended for use with P2MR plus a future `OP_CHECKSPHINCS` (or similar) opcode.
  - — [Optech 2026-05-01](https://bitcoinops.org/en/newsletters/2026/05/01/)
- Falcon proposal (Giulio Golinelli, bitcoin-dev, Optech 2026-02-06):
  - About 20x the on-chain space of ECDSA, and about 2x faster verification.
  - Conduition flagged that constant-time signing is hard.
  - Optech noted the design is effectively a flag-day change in P2WPKH verification, i.e. a hard fork, despite being called a soft fork.
  - — [Optech 2026-02-06](https://bitcoinops.org/en/newsletters/2026/02/06/)
- P2TRv2 (Wuille thread, Optech 2026-08-07): a Taproot-like type that keeps EC key spends for today's fee profile and CISA compatibility. It includes a hash-based PQC opcode, and EC spending would be disabled later — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/)

### Inferences
- A no-fork tool exists (QSB), but its cost and nonstandard relay limit it to emergency use for high-value UTXOs.
- The developer momentum (Wuille, Poinsot, Conduition, Nick) points to hash-based signatures (SHRINCS/SPHINCS+) as the first PQ opcode, not lattice schemes.

### Gaps
- No assigned BIP number was found for any PQ signature opcode (e.g. OP_CHECKSHRINCS or OP_CHECKSPHINCS). The SHRINCS draft BIP explicitly defines only the scheme.
- No current status was found for ColliderScript (Heilman/Levy/Linus/Sattath, 2024). QSB's exact transaction size was not retrieved.

---

## Q4. Taproot fallback / commit-to-PQ-leaf, EC-disable triggers, and seed-based ZK and commit/reveal recovery

### Takeaway
Ruffing's 2025 proof makes "disable the Taproot key path, keep the script path" a credible way to rescue P2TR coins that already committed a PQ leaf. Wuille's July 2026 tripwire and miner-lockdown proposals would decide when to disable EC. Recovery for coins that are not upgraded rests on knowledge asymmetries: zk-STARK proofs of BIP-32 seeds (Osuntokun prototype), commit/reveal (Dryja's Lifeboat, Conduition's DropKick), and Shinobi's layered recovery. P2PK has no rescue.

### Cited Findings
- Tim Ruffing, "The Post-Quantum Security of Bitcoin's Taproot as a Commitment Scheme", ePrint 2025/1307 (received 2025-07-17), announced on bitcoin-dev 2025-07-23.
  - It bounds binding and hiding in the QROM, showing that Taproot is PQ-secure if restricted to script-path spends.
  - Orlovsky and Heilman noted that short-exposure attacks and known-pubkey wallets remain a problem.
  - — [ePrint 2025/1307](https://eprint.iacr.org/2025/1307); [bitcoin-dev thread](https://groups.google.com/g/bitcoindev/c/ydE5u5C0xVc)
- Wuille (bitcoin-dev, Optech 2026-07-03) proposed two EC-disable triggers bundled with the new output types — [Optech 2026-07-03](https://bitcoinops.org/en/newsletters/2026/07/03/)
  - **Tripwire (P2XX-T):** EC paths are disabled after a valid `<NUMS> OP_CHECKSIG` spend proves secp256k1 is broken.
  - **Miner lockdown (P2XX-ML):** a hashrate-majority signaled soft fork with a very long window.
  - Nagaev worried about false positives. Provoost suggested long delays. Conduition supported tripwire.
- Wuille later said neither P2TRv2 nor P2MR is categorically quantum-secure, because both depend on a decision to stop using secp256k1 — [Optech 2026-10-02](https://bitcoinops.org/en/newsletters/2026/10/02/)
- zk-STARK BIP-86 recovery (Olaoluwa Osuntokun, bitcoin-dev, Optech 2026-05-01): a working prover and verifier proving knowledge of a BIP-32 seed. It is unoptimized, and proof sizes and timings were not given in Optech — [Optech 2026-05-01](https://bitcoinops.org/en/newsletters/2026/05/01/)
- DropKick (Conduition, Optech 2026-09-04) — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Commit a PQ key plus ownership proof (OP_RETURN or taproot tweak). Untrusted aggregators can Merkle-batch commitments.
  - After a delay (about 100 blocks), reveal a PQ signature plus an SPV proof.
  - It is non-confiscatory if limited to decidable asymmetries, and cannot cover P2PK.
  - Compared with Dryja's **Lifeboat**, which needs each user to hold a PQ UTXO. Earlier commit/reveal work appeared in Optech #348/#361 (2025).
- Shinobi's layered recovery for hashed address types (Optech 2026-08-07): after secp256k1 is disabled, allow any of several recovery methods (BIP-32 ZK proof, timestamped attestation, commit-reveal). Conduition reframed recovery as authenticating knowledge asymmetries, noting Taproot internal keys could serve for P2TR — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/)
- Guy Fawkes-style SHA256 preimage ownership proofs (Optech 2025-04-04) — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)

### Gaps
- No primary text was found for Corallo's specific "commit PQ leaf and disable key path" design beyond the Optech summary. Optech's summary covers only the opcode.
- No numbers were retrieved for Osuntokun's STARK proof sizes or times.

---

## Q5. Signature schemes: sizes, verification, and block-space impact

### Takeaway
Every standardized PQ scheme is 10–270x larger than a 64-byte Schnorr signature. Bitcoin-tailored hash-based schemes narrow the gap:
- SPHINCS+ at a 2^40 signature cap: about 4 KB.
- SHRINCS stateful: 324–548 B.
- SHRINCS stateless fallback: about 5.8 KB.

Under today's witness discount, a 1-in/2-out PQ spend fits about 2–19x fewer transactions per block. Developers lean toward a **new witness-weight rule** (price CPU more, bytes less) or a separate PQ witness "style", not a simple bigger discount. Block-wide SNARK/STARK aggregation is being researched.

### Cited Findings
- NIST status — [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final); [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final); [EncryptionConsulting](https://www.encryptionconsulting.com/education-center/fn-dsa-fips-206/); [PQ registry](https://registry.projecteleven.com/algorithms/fn-dsa):
  - FIPS 203 (ML-KEM, key encapsulation, not signatures), FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) were finalized in August 2024.
  - FIPS 206 (FN-DSA/Falcon) remained a draft in 2026, with the final version expected late 2026 or early 2027 per secondary sources.
- Sizes from the standards (pk / sig, bytes) — [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final); [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final):
  - ML-DSA-44: 1312 / 2420
  - ML-DSA-65: 1952 / 3309
  - ML-DSA-87: 2592 / 4627
  - SLH-DSA-128s: 32 / 7856
  - SLH-DSA-128f: 32 / 17088
  - SLH-DSA-256s: 64 / 29792
- Falcon-512: about 897 / about 666 B. This figure is from the Falcon spec as commonly cited, not from a fetched NIST final. Optech described Falcon as about 20x ECDSA size and about 2x faster verification — [Optech 2026-02-06](https://bitcoinops.org/en/newsletters/2026/02/06/)
- Comparison table: ML-DSA-65 3,309 B; SLH-DSA-128s 7,856 B; SHRINCS compact about 324–580 B — [postquantum.com](https://postquantum.com/security-pqc/shrincs-op-checkshrincs-bitcoin-pqc/)
- Kudinov & Nick (Blockstream), "Hash-based signatures for Bitcoin", ePrint 2025/2203 (Dec 2025):
  - Standard SPHINCS+ is about 7.9 KB.
  - Optimizations (SPHINCS+C, TL-WOTS-TW, PORS+FP) plus a lower per-key cap reach about **4,036 B at 2^40 signatures**, with parameter sets around 3,440 and 3,128 B at lower caps. All NIST L1, stateless.
  - — [ePrint 2025/2203](https://eprint.iacr.org/2025/2203); [bitcoin-dev](https://groups.google.com/g/bitcoindev/c/gOfL5ag_bDU/m/n41i8uXACgAJ); [PQ registry](https://registry.projecteleven.com/algorithms/hbs-bitcoin)
- SHRINCS:
  - Jonas Nick on Delving, Optech 2026-02-06. A hybrid of SPHINCS+ (stateless) and unbalanced XMSS (stateful). The pubkey is a hash of both keys. Stateful signatures start at **324 B, growing about 16 B per signature** — [Optech 2026-02-06](https://bitcoinops.org/en/newsletters/2026/02/06/); [Blockstream blog](https://blog.blockstream.com/searching-for-shrincs-parameters/)
  - The draft BIP (Conduition for the SHRINCS working group, Optech 2026-09-04) uses different parameters:
    - 48-B pubkey, stateful signatures **from 548 B**, stateless fallback **5,777 B** (budget 2^40).
    - Verification claimed 4–16x faster per byte than BIP-340 with SHA-NI. Worst case is 2,792 SHA-256 compressions.
    - Black-box SLH-DSA compatible.
    - — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/); [bitcoin-dev draft](https://groups.google.com/g/bitcoindev/c/HbVboXIFiG8)
  - `libshrincs` (Nick and remix7531) is a C library with machine-checked WOTS+C proofs (Optech 2026-08-21) — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Reuse of stateful counters lets an observer forge signatures — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
- Related Blockstream schemes: SHRIMPS, about 2.5 KB signatures across several stateful devices (Optech 2026-04-03). A SHRINCS demo ran on Liquid in March 2026 — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/); [Unchained](https://unchainedcrypto.com/blockstream-researchers-propose-shrincs-a-post-quantum-bitcoin-signature-built-to-preserve-block-space/)
- Verification speed: Conduition's benchmarks show SLH-DSA verification can compete with libsecp256k1 Schnorr in common cases (Optech 2026-02-06; no numbers given) — [Optech 2026-02-06](https://bitcoinops.org/en/newsletters/2026/02/06/)
- Why hash-based over lattice: Conduition cited weaker assumptions, simpler implementation, fast verification, and a long-term fallback role. Kudinov noted Falcon's floating point can be emulated with integers — [Optech 2026-07-03](https://bitcoinops.org/en/newsletters/2026/07/03/)
- Hybrid signatures: BoP-2 (EuroCrypt 2026) has the Schnorr challenge commit to the PQ signature so the pair is strongly unforgeable. Wuille and Conduition questioned whether the complexity is worth it — [Optech 2026-07-03](https://bitcoinops.org/en/newsletters/2026/07/03/)
- Witness and block-space debate:
  - Riard: 5,777-B signatures cost about 90x today's on-chain cost unless discounted — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Wuille: post-Q-day hash-based signatures likely need a new costing rule weighting CPU over size — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Conduition: an 8x or larger serialized block-size increase would push archival storage into terabytes per year — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Wuille's segwit "witness styles" (style 1 = pqdata, each style with its own weight function, committed under the existing wtxid) — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/)
  - Towns: reserved PQ capacity should be unusable for ordinary data — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/)
- Aggregation:
  - Remix7531's RISC Zero STARK aggregation of standard SPHINCS: about 3.1 s/signature proving on an RTX 5090. Proofs are 218 KiB for 1 signature and 454 KiB for 512, versus 3.8 MiB of raw signatures. Verification is about 12–15 ms — [Optech 2026-07-03](https://bitcoinops.org/en/newsletters/2026/07/03/)
  - Conduition's block-wide SNARK sketch (Oct 2026): hash-based SNARK proofs are 300–500 kB. About 20 s to prove 10k signatures on 10 CPU threads (extrapolated). Uses a WOTS+C SPHINCS variant. Mining pools would run the prover. ZmnSCPxj raised DoS concerns — [Optech 2026-10-02](https://bitcoinops.org/en/newsletters/2026/10/02/)
- CISA (cross-input signature aggregation) saves at most about 28% weight, and only for many-input transactions (Wuille) — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)

### Inferences (own calculation; not from a source)
Model: a 1-input/2-output transaction. The non-witness part is about 380 WU (a P2TR key-path 1-in/2-out is about 446 WU or 112 vB, with a 66-B witness). The PQ witness is the signature, the pubkey in the leaf script, about 3 B of opcodes, a 33-B control block, and about 4 B of overhead (P2MR depth 0/1). Existing weight rule: 1 WU per witness byte, 4M WU per block.

| Scheme | sig / pk (B) | ≈tx weight (vB) | ≈tx per block | vs today |
|---|---|---|---|---|
| Schnorr P2TR key path (today) | 64 / (32 in output) | 112 | ~8,970 | 1x |
| SQIsign L1 (round-2 figures ~148/65, unverified here) | 148 / 65 | 158 | ~6,300 | 1.4x |
| SHRINCS stateful (draft BIP) | 548 / 48 | 254 | ~3,900 | 2.3x |
| Falcon-512 | ~666 / 897 | 496 | ~2,000 | 4.4x |
| ML-DSA-44 | 2420 / 1312 | 1,038 | ~960 | 9.3x |
| SPHINCS+ (Nick/Kudinov, 2^40) | 4036 / 32 | 1,122 | ~890 | 10x |
| ML-DSA-65 | 3309 / 1952 | 1,420 | ~700 | 12.7x |
| SHRINCS stateless fallback | 5777 / 48 | 1,561 | ~640 | 14x |
| SLH-DSA-128s | 7856 / 32 | 2,077 | ~480 | 18.6x |
| SLH-DSA-128f | 17088 / 32 | 4,385 | ~230 | 39x |

- Today's throughput is roughly 7 tx/s at about 9k transactions per block. An all-ML-DSA-44 or SPHINCS+ chain would drop to about 0.7–1.6 tx/s with the current weight rules. Block bytes would approach 4 MB, the full 4M WU limit for witness-heavy blocks.
- Raising the witness discount restores transaction count but scales bandwidth and storage roughly linearly, which is the reason for Conduition's terabytes-per-year warning. This is why aggregation and "price CPU, not bytes" rules are on the table.
- Lattice keys (ML-DSA, Falcon) also cost space for the pubkey. Hash-based keys are 32–48 B, which fits the P2MR leaf model well.

### Gaps
- SQIsign figures are from memory of NIST round-2 submissions, were not fetched, and should be verified. NIST additional-signature round status in 2026 was not checked.
- XMSS/LMS (SP 800-208) sizes were not fetched. They are stateful: LMS signatures are about 1.1–2.5 KB depending on parameters (unverified).
- No concrete Bitcoin PQ verification benchmarks (µs) were found beyond the qualitative claims.

---

## Q6. Status of the soft-fork debate as of Oct 2026: who supports what, Core stance, activation, timelines

### Takeaway
As of late October 2026, nothing is scheduled for activation. Bitcoin Core has merged no PQ consensus code, and there are no activation parameters. The live technical debate is centred on Pieter Wuille's Delving thread, covering P2MR vs P2TRv2 (and P2TRH/P2QR), whether to bundle CISA, EC-disable triggers, and witness pricing. A rough working consensus exists only on adding a PQ (likely hash-based) tapscript opcode and a PQ output type. Freezing and BIP-361 remain contested.

### Cited Findings
- Wuille's position (Delving thread "post-quantum output types", Optech #417/#421, Aug–Sep 2026):
  - Deploy **P2TRv2** now for casual users and **P2MR** for sophisticated users.
  - Later, a P2MR-based type with a new witness style.
  - Wallet and custodian support is the bottleneck, not fees.
  - Against bundling CISA.
  - — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/); [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
- Positions in the same debate:
  - Adam Gibson agrees with not bundling CISA — [Optech 2026-09-04](https://bitcoinops.org/en/newsletters/2026/09/04/)
  - Conduition: P2TRv2+CISA would be a strong migration incentive, but raises the stakes of EC-disabling. Proposes shipping both types — [Optech 2026-10-02](https://bitcoinops.org/en/newsletters/2026/10/02/)
  - Antoine Riard: P2TRv2 is acceptable if its vulnerable paths can later be disabled within the type; against bundling CISA — [Optech 2026-10-02](https://bitcoinops.org/en/newsletters/2026/10/02/)
  - Antoine Poinsot: P2TRv2 and CISA pull in opposite directions, and distinct output types could become a privacy fingerprint — [Optech 2026-10-02](https://bitcoinops.org/en/newsletters/2026/10/02/)
- Candidate output types tabulated by Wuille — [Optech 2026-08-07](https://bitcoinops.org/en/newsletters/2026/08/07/):
  - BIP-360 P2MR
  - P2TRv2
  - P2TRH (hashed output key with pubkey recovery)
  - P2QR (P2MR with EC opcodes disabled from the start)
- Algorithm-agility debate: "Limits of cryptographic algorithm agility" (Optech 2026-03-06) — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/)
- Off-chain layers: post-quantum BIP-324 and PQ Lightning (Optech 2026-06-05). PQLN by Ahmet Kurt, where ML-DSA signing is 0.33 ms (Optech #424, 2026-09-25) — [Optech topic](https://bitcoinops.org/en/topics/quantum-resistance/); [Optech #424](https://bitcoinops.org/en/newsletters/2026/09/25/)
- No activation date or specification has been agreed. The Presidio Bitcoin "Quantum Readiness" living paper says the ecosystem is in its first phase with no deployment timeline. It cites a Chaincode playbook that puts emergency activation at about 6–7 months if needed — [Presidio paper](https://presidiobtc.github.io/bitcoin-quantum/); [Presidio substack](https://presidiobitcoin.substack.com/p/bitcoins-quantum-readiness)
- Presidio Bitcoin Quantum Summit was held June 26, 2025, San Francisco — [Stacker News](https://stacker.news/items/1002657)
- BIP-361's own timeline: Phase A at activation plus about 3 years, Phase B at activation plus about 5 years — [BIP-361](https://github.com/bitcoin/bips/blob/master/bip-0361.mediawiki)
- One secondary source wrongly says BIP-360 was "integrated into the Bitcoin Core repository". It was the **bitcoin/bips** repo, and CoinDesk confirms there is no Core implementation — [CoinDesk](https://www.coindesk.com/markets/2026/04/10/quantum-safe-bitcoin-now-possible-without-a-soft-fork-but-costs-usd200-a-pop)
- Separate fork context: AMINA Bank research discusses an August 2026 fork debate (BIP-110 and others) alongside the "quantum clock". It was not verified in detail — [AMINA](https://aminagroup.com/research/bitcoin-fork-august-2026-bip-110-ecash-covenants-and-the-quantum-clock/)

### Inferences
- The most likely first soft fork would bundle three things: a PQ output type (P2MR and/or P2TRv2), a hash-based signature opcode (SHRINCS/SPHINCS+ family, now with a draft BIP), and possibly an EC-disable tripwire. A legacy-coin freeze (BIP-361-style) would be a separate, much more contested fork. Signature-scheme and witness-pricing questions are still open, so activation within 2026–2027 looks unlikely absent an emergency.

### Gaps
- No formal Bitcoin Core project statement on quantum was found. Core does not issue policy statements, so stances come from individual contributors (Wuille, Poinsot, Ruffing, Nick, Towns, Provoost).
- No 2026 quantum-specific conference (beyond the Bitcoin 2026 Las Vegas panel coverage) was verified.

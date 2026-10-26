# Implementation Architecture of a Post-Quantum-Capable Bitcoin Wallet (as of 26 Oct 2026)

Scope: engineering facts for building a wallet (libraries, key derivation, transactions/PSBT, hardware, hybrid design, testing). The threat model and the soft-fork politics are out of scope. Research budget was limited (~17 tool calls), so some items are listed under Gaps.

## 1. Libraries, maturity, audits, and Bitcoin-specific implementations

### Takeaway
No PQ signature scheme is in Bitcoin consensus as of Oct 2026. BIP-360 (P2MR) is a Draft that adds no PQ opcodes. The Bitcoin-specific PQ code (libbitcoinpqc/bitcoinpqc, the BTQ testnet, the witness-v3 ML-DSA-65 patch) is experimental and unaudited. General-purpose libraries (liboqs, RustCrypto ml-dsa, noble-post-quantum) are usable for prototypes, but each has an unaudited or partly audited status, and the RustCrypto crate has had real side-channel and verification CVEs.

### Cited Findings
**BIP-360 / P2MR (the base output type)**
- BIP-360 "Pay-to-Merkle-Root (P2MR)": Status Draft, Consensus (soft fork), version 0.12.1. Number assigned 2024-12-18, latest changelog entry 2026-07-24. Authors: Hunter Beast, Ethan Heilman, Isabel Foxen Duke. Requires BIPs 340/341/342. — [BIP-360 text](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- P2MR uses SegWit **version 2**, bech32m, mainnet prefix `bc1z`. scriptPubKey is `OP_2 OP_PUSHBYTES_32 <merkle_root>`. There is **no internal key and no key-path spend**. The root uses BIP-341 TapLeaf/TapBranch tagged hashes. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Control block is 1 + 32·m bytes (m = 0..128). The parity bit is always 1 and the internal pubkey is omitted. A depth-zero (single-leaf) tree is anyone-can-spend. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- BIP-360 itself **does not add PQ signature schemes**. Spends use existing tapscript ops (e.g., OP_CHECKSIG), and ML-DSA/SLH-DSA are mentioned only as future work. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Witness sizes: a P2TR key-path witness is 66 B. A P2MR depth-1 example witness is 135 B. In general a P2MR witness is 103 + 32·m B, which is 32 B smaller than the equivalent P2TR script-path spend. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Reference material: a Python reference implementation lives in `bip-0360/ref-impl/python`, and test vectors in `bip-0360/ref-impl/common/tests/data/p2mr_construction.json` (no key-path cases). The Rust and JS implementations moved to `jbride/libbitcoinpqc-bindings`. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- BIP-360 was merged into the BIPs repo as Draft on 11 Feb 2026. BIP-361 (phased legacy signature sunset) was assigned the same day and merged in April 2026. — [Phemex explainer](https://phemex.com/blogs/bitcoin-quantum-resistant-address-bip-360); [learnbitcoin BIP-361](https://www.learnbitcoin.com/glossary/bip-361) (secondary sources)

**libbitcoinpqc / bitcoinpqc**
- Implements three tapscript `OP_CHECKSIG` "overloads" for BIP-360 signatures: secp256k1 Schnorr (BIP-340), **ML-DSA-44**, and **SLH-DSA-SHA2-128s**. It ships P2MR construction fixtures (merkle root, scriptPubKey, bech32m address, control blocks). — [jbride/libbitcoinpqc-bindings](https://github.com/jbride/libbitcoinpqc-bindings)
- Bindings: Rust crate `bitcoinpqc`, Python `bitcoinpqc` 0.4.1 (PyPI), Node/TS `bitcoinpqc` (npm), WASM, and a C core `libbitcoinpqc` (git submodule). — [libbitcoinpqc-bindings](https://github.com/jbride/libbitcoinpqc-bindings)
- Breaking change in 0.4.0: SLH-DSA moved from SHAKE-128s to SHA2-128s and FN-DSA-512 was removed. **Old keys are incompatible and must be regenerated.** — [docs.rs bitcoinpqc 0.4.1](https://docs.rs/crate/bitcoinpqc/0.4.1); [bindings repo](https://github.com/jbride/libbitcoinpqc-bindings)
- The library does not generate randomness, so callers must supply a CSPRNG. docs.rs builds failed for 0.4.0 and 0.4.1 (the last successful docs build was 0.2.0). — [docs.rs bitcoinpqc](https://docs.rs/crate/bitcoinpqc/latest)
- Its own maturity statement: the code is "based on reference code from the NIST PQC standardization process and [is] not production-hardened". No audit is mentioned. The repo showed about 86 commits, 1 star, and 4 forks. — [libbitcoinpqc-bindings](https://github.com/jbride/libbitcoinpqc-bindings)

**Competing draft: witness v3 ML-DSA-65 key-path (Delving Bitcoin, 16 Apr 2026)**
- Author "echelonresearch" posted a draft BIP with output `OP_3 <SHA256(ML-DSA-65 pubkey)>`, bech32m HRP `bc1r`. The witness is [3309 B signature, 1952 B pubkey]. Verification happens in `VerifyWitnessProgram()` without the Script interpreter. The sighash is the tagged hash "PQSighash" (epoch 1, ext_flag 3), reusing BIP-341 precomputed hashes. The proposal is key-path only. The patch is against Bitcoin Core commit c97ac44c and uses **liboqs 0.15.0**. The author says an audited or in-tree implementation would be needed before activation. — [Delving Bitcoin mirror](https://mirror.b10c.me/delvingbitcoin-org/2026-04-16-bip-draft-witness-version-3-ml-dsa-65-post-quantum-key-path-spending-id2422.html) (repo: btcpqresearch/bip-pq-witness-v3)
- conduition replied (8 May 2026) with several objections: prefer ML-DSA in tapscript under P2MR for crypto-agility, use ML-DSA-44 (which matches secp256k1's 128-bit level) instead of -65, the proposal lacks a witness discount, and SLH-DSA or XMSS would be smaller and rely only on hash assumptions. — [same thread](https://mirror.b10c.me/delvingbitcoin-org/2026-04-16-bip-draft-witness-version-3-ml-dsa-65-post-quantum-key-path-spending-id2422.html)

**Test networks**
- BTQ Technologies' "Bitcoin Quantum" testnet v0.3.0 (19 Mar 2026) is described as the first working BIP-360 implementation. It reportedly has P2MR consensus validation, **five ML-DSA signature opcodes** in the P2MR tapscript context, and wallet tooling. BTQ claims 50+ miners and >100,000 blocks; these are company-reported and unverified. It is a separate network, not Bitcoin signet. — [The Quantum Insider](https://thequantuminsider.com/2026/03/20/btq-technologies-implements-bip-360-quantum-resistant-bitcoin-transactions-testnet/); [StockTitan / BTQ PR](https://www.stocktitan.net/news/BTQ/btq-technologies-announces-first-deployment-of-bip-360-on-bitcoin-41mvi16saj59.html)
- One outlet reports that no BIP-360 implementation work had begun in Bitcoin Core itself as of March 2026. — [cryptotimes.io](https://www.cryptotimes.io/2026/03/19/bitcoins-quantum-resistant-future-gets-real-as-bip-360-goes-live-on-testnet/)

**General-purpose PQ libraries**
- **liboqs**: 0.15.0 switched to final FIPS 204, added Wycheproof tests for ML-DSA, and dropped Dilithium (round-3) support. SPHINCS+ is announced for removal in 0.16.0. The liboqs site lists 0.16.0 as the current version. — [liboqs releases](https://github.com/open-quantum-safe/liboqs/releases); [openquantumsafe.org/liboqs](https://openquantumsafe.org/liboqs/)
- Trail of Bits assessed liboqs (2024 engagement, published April 2025), covering core code. I did not confirm whether the ML-DSA implementation was in scope. liboqs describes itself as for "prototyping and experimenting". — [openquantumsafe.org](https://openquantumsafe.org/); [PQCA anniversary post](https://pqca.org/blog/2025/post-quantum-cryptography-alliance-one-year-anniversary/); [liboqs GitHub](https://github.com/open-quantum-safe/liboqs)
- liboqs bindings exist beyond C, e.g., LibOQS.NET 0.3.0 (Jan 2026) built on liboqs 0.15.0. — [strathweb](https://www.strathweb.com/2026/01/liboqs-net-0-3-0-liboqs-0-15-0-full-suite-of-algorithms-and-other-new-features/)
- **RustCrypto `ml-dsa`**: the crate page says it has never been independently audited. — [crates.io ml-dsa](https://crates.io/crates/ml-dsa)
  - RUSTSEC-2025-0144 (CVSS 6.4): a variable-time division on secret data in decomposition could leak the signing key through timing. Fixed in 0.1.0-rc.3 with a constant-time Barrett reduction. — [RustSec](https://rustsec.org/advisories/RUSTSEC-2025-0144.html)
  - CVE-2026-24850 / GHSA-5x2r-hc65-25f9 (medium): verification accepted repeated hint indices, which FIPS 204 forbids. This is a malleability/consensus-divergence class bug. Affected 0.0.4 to 0.1.0-rc.3, fixed in 0.1.0-rc.4. — [GitHub advisory](https://github.com/RustCrypto/signatures/security/advisories/GHSA-5x2r-hc65-25f9)
- **noble-post-quantum (JS, paulmillr)**: implements ML-KEM, ML-DSA-44/65/87, all 12 SLH-DSA sets, Falcon (round-3, not FN-DSA), and hybrid KEMs. It "has not been independently audited". Version 0.6.1 was self-audited in April 2026, and an ACVP-based reproducibility study covered 0.7.0 ("not an audit"). It does **not claim constant-time** execution. — [noble-post-quantum README](https://github.com/paulmillr/noble-post-quantum)
  - Performance on Apple M4: ML-DSA-65 keygen about 719 ops/s, sign about 294 ops/s, verify about 610 ops/s (the column mapping was inferred from a misaligned table). SLH-DSA-SHA2-128s keygen 140 ms, sign 1,068 ms, verify 1.1 ms. SHA2-128f sign 47 ms. SHAKE-128s sign 5,114 ms (SHA2 variants are about 5x faster than SHAKE in JS). — [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)
  - Seeded keygen API: `ml_dsa*.keygen(seed)` takes a 32-byte seed and `falcon.keygen(seed)` a 48-byte seed. The SLH-DSA examples do not show a seed parameter. — [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)

### Inferences
- A wallet that wants to track the BIP-360 ecosystem today would pin bitcoinpqc (ML-DSA-44 + SLH-DSA-SHA2-128s), but should expect breaking parameter changes (one already happened in 0.4.0). The design should keep the scheme ID versioned alongside every key.
- For consensus-adjacent verification code, the RustCrypto hint-index CVE shows that strict FIPS 204 encoding checks are important. Non-strict verifiers in different wallets or nodes would disagree on validity.
- The JS stack (noble) is acceptable for watch-only and verification, but signing in a browser carries timing-leak risk by the library's own admission.

### Gaps
- PQClean status (archived or maintained?), `pqcrypto` Rust crates, Bouncy Castle PQC versions, and any FIPS 140-3 validated modules containing ML-DSA/SLH-DSA (e.g., CMVP certificate numbers) were not researched within budget.
- I found no evidence of BIP-360/PQ branches in rust-bitcoin, BDK, btcd, or bitcoinjs, nor of a public Bitcoin **signet** running P2MR. This was not exhaustively searched, so treat it as "not found", not "doesn't exist".
- I could not verify which specific opcode names the BTQ testnet uses, or how they map to libbitcoinpqc's "OP_CHECKSIG overload" approach.

## 2. Deterministic key derivation from a BIP-39 seed

### Takeaway
ML-DSA and SLH-DSA both support deterministic keygen from a short seed (a 32-byte ξ for ML-DSA, and n-byte seeds for SLH-DSA), so a BIP-39 seed can deterministically feed them through hardened-only derivation. Non-hardened (xpub) derivation is not available for ML-DSA (its public keys are rounded) or for hash-based schemes, so xpub watch-only wallets cannot generate addresses. The leading concrete proposal is Project Eleven's PQHD (a BIP-85 application, all levels hardened), which is still a draft and not a BIP.

### Cited Findings
- FIPS 204 defines `ML-DSA.KeyGen_internal(ξ)` with a 32-byte seed ξ, so a key pair is fully determined by 32 bytes. The IETF composite draft also lists the ML-DSA private key as a 32-byte "seed" for all three levels. — [FIPS 204](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf); [draft-ietf-lamps-pq-composite-sigs-19](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/)
- FIPS 205 defines `slh_keygen_internal(SK.seed, SK.prf, PK.seed)`, three n-byte values (n = 16 for the 128-bit sets). The secret key is 64 B and the public key 32 B for 128s/128f. — [FIPS 205](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf); sizes from [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)
- **PQHD (Project Eleven, draft)** uses the path `m/83696968'/505153'/<coin_type>'/<scheme>'/<account>'/<index>'`, with every level hardened. 83696968' is the BIP-85 purpose, and 505153' is ASCII "PQS". The BIP-85 entropy at the node seeds a SHAKE256 stream ("BIP-85-DRNG-SHAKE256"), and the registry defines how many bytes each scheme reads. — [pqdh/pqhd](https://github.com/pqdh/pqhd)
  - Registry: 100–102 ML-KEM, **200–202 ML-DSA-44/65/87**, **300–311 SLH-DSA (all 12 sets)**, 400–401 reserved for FN-DSA (pending FIPS 206). Stateful LMS/XMSS are **excluded**, because SP 800-208 forbids exporting their key material and a mnemonic cannot restore state. — [pqhd](https://github.com/pqdh/pqhd)
  - Status: "Draft. Nothing here is final until the spec reaches v1.0." It includes test vectors from `reference/python/gen_vectors.py`. iqlusion implements the `pqseed` Rust crate. — [pqhd](https://github.com/pqdh/pqhd)
  - The first 32 output bytes become the ML-DSA-65 keygen seed ξ (per search summary of PQHD/Cosmos material). Cosmos SDK PR #26872 proposes making PQHD/BIP-85 the default for ML-DSA-65 account keys, so they do not share the secp256k1 BIP-44 index space (issue #26871). — [cosmos-sdk PR #26872](https://github.com/cosmos/cosmos-sdk/pull/26872); [issue #26871](https://github.com/cosmos/cosmos-sdk/issues/26871)
- **Hardened-only limit for lattices:** ePrint 2026/380 "Lattice HD Wallets" gives a proven-secure hardened ML-DSA HD construction. Because ML-DSA **rounds public keys**, non-hardened derivation is impossible. Its xpub-style non-hardened construction uses Raccoon-G (unrounded public keys), which is not a NIST standard. — [ePrint 2026/380](https://eprint.iacr.org/2026/380); [Project Eleven blog](https://www.projecteleven.com/blog/lattice-hd-wallets-post-quantum-bip32-hierarchical-deterministic-wallets-from-lattice-assumptions)
- **Hash-based:** a bitcoindev thread says hardened derivation is natural, but public child derivation does not appear efficient. SLH-DSA's lack of algebraic structure means it cannot fully emulate BIP-32. — [bitcoindev "Hash-Based Signatures for Bitcoin's Post-Quantum Future"](https://groups.google.com/g/bitcoindev/c/gOfL5ag_bDU/m/0YuwSQ29CgAJ)
- A Delving Bitcoin thread argues that lattice algebra could enable PQ HD wallets, silent payments, key aggregation, and threshold signatures (research direction, not a spec). — [Delving Bitcoin #1854](https://delvingbitcoin.org/t/post-quantum-hd-wallets-silent-payments-key-aggregation-and-threshold-signatures/1854)
- **Stateful-scheme hazard:** XMSS has a 2^10 signature budget in Blockstream's benchmark set, and SHRINCS uses a stateful UXMSS part plus a stateless SLH-DSA-like fallback. Reusing state (e.g., after restoring from seed or a backup) breaks security, which is why PQHD excludes these schemes. — [Blockstream Research, 19 Aug 2026](https://blog.blockstream.com/hardware-wallets-post-quantum-signatures/); [pqhd](https://github.com/pqdh/pqhd)

### Inferences
- Watch-only designs must change. Instead of exporting one xpub, the signer must pre-export a batch of PQ public keys (1,312 B each for ML-DSA-44, 32 B for SLH-DSA-128) or pre-built P2MR leaf hashes / addresses. A gap-limit-style "key pool" that the hardware wallet tops up is the practical pattern.
- Because P2MR commits only to a Merkle root, a watch-only wallet can store 32-byte addresses plus leaf scripts. It needs the full PQ pubkey only at spend time (inside the leaf script), and the coordinator can fetch that from the signer.
- Seed-only recovery works for stateless schemes (ML-DSA, SLH-DSA). For SHRINCS/XMSS-style stateful keys, recovery must fall back to the stateless path or treat the state counter as unknown. This is the rationale for SHRINCS's stateless fallback.
- Separate the scheme IDs in the derivation path (as PQHD does) so one seed can never yield the same ξ for two schemes, and so a recovery tool can enumerate schemes.

### Gaps
- No Bitcoin BIP number or merged spec for PQ HD paths was found. No P2MR descriptor syntax was found either (BIP-360 changelog v0.7.0 mentions "update descriptor format", but the current text specifies none).
- I did not verify how PQHD maps SHAKE stream bytes onto SLH-DSA's three seeds.

## 3. Transaction construction: PSBT, witness size, fees, coin selection, Miniscript

### Takeaway
No PSBT (BIP-174/370) fields for PQ keys or signatures and no P2MR descriptor or Miniscript syntax have been specified as of Oct 2026, so wallet builders must use proprietary PSBT fields. PQ inputs are 15–60x heavier than Taproot key-path inputs: an ML-DSA-65 key-path input is about 1,300+ vB, and an SLH-DSA-128s signature alone is 7,856 B (about 1,964 vB before any discount debates). Fee estimation and coin selection must be weight-aware per input type.

### Cited Findings
- The BIP-360 text does not specify PSBT fields or descriptor syntax. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- Secondary sources only say BIP-174 "will likely need extensions". No concrete field proposal was found. — [search summary; postquantum.com roadmap](https://postquantum.com/quantum-threat-crypto/fixing-bitcoin-pqc-migration/)
- Witness-v3 ML-DSA-65 draft: a 1-in/1-out spend is about **1,400 vB (about 5,600 WU)**, about **14,000 sats at 10 sat/vB**. Standard-tx weight (400 kWU) allows about **72 PQ inputs per tx**, and a 4 MWU block allows about **720 PQ inputs**. PSBT and descriptors are explicitly not covered. — [Delving Bitcoin draft](https://mirror.b10c.me/delvingbitcoin-org/2026-04-16-bip-draft-witness-version-3-ml-dsa-65-post-quantum-key-path-spending-id2422.html)
- Size reference (bytes; pk / sig): ML-DSA-44 1,312 / 2,420; ML-DSA-65 1,952 / 3,309; ML-DSA-87 2,592 / 4,627; SLH-DSA-128s 32 / 7,856; SLH-DSA-128f 32 / 17,088; SLH-DSA-256s 64 / 29,792. — [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)
- Hash-based alternatives with smaller signatures: SPHINCS+ reduced to 2^40 signatures is 5,776 B. The SHRINCS stateful part is 324+ B (SHRINCS-B) or 1,092+ B (SHRINCS-L). XMSS 2^10 is 696 B. — [Blockstream Research](https://blog.blockstream.com/hardware-wallets-post-quantum-signatures/)
- P2MR script-path witness overhead (excluding the PQ sig/pk) is 103 + 32·m B for the Schnorr example. — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)

### Inferences
- Rough per-input witness for a P2MR leaf `<ML-DSA-44 pk> OP_CHECKSIG_MLDSA` at depth 1: 2,420 (sig) + about 1,315 (leaf script with the pk push) + 33 (control block) + length prefixes ≈ 3,775 WU ≈ **944 vB** of witness, versus 57.5 vB for a P2TR key-path input. SLH-DSA-128s: 7,856 + about 35 + 33 ≈ **about 1,985 vB**. These are my estimates assuming no new witness discount; the real opcodes are unspecified.
- Coin selection: per-input cost dominates, so consolidating UTXOs (while fees are low) and preferring few large inputs become first-order strategies. Fee estimators must compute weight per input *type* (classical vs ML-DSA vs SLH-DSA leaf), not assume a uniform vbyte size.
- A P2MR wallet can put a cheap Schnorr leaf and a PQ leaf in the same tree (BIP-360's crypto-agility idea). It spends via the Schnorr leaf until PQ is needed, and pays the large PQ cost only on the fallback. Estimators must know which leaf will be used.
- PSBT: until standardized, carry PQ pubkeys, signatures, leaf scripts, and the derivation path (with the PQHD scheme index) in `PSBT_IN_PROPRIETARY` / `PSBT_OUT_PROPRIETARY`. PSBTs with multiple PQ inputs will be tens of KB.

### Gaps
- No Miniscript fragment, descriptor (`mr()` or similar), or PSBT key-type proposal for PQ was found in BIPs or Delving as of Oct 2026.
- The final opcode semantics and any witness discount for PQ signatures are undecided (conduition explicitly raised the witness-discount question).

## 4. Hardware wallets and secure elements

### Takeaway
As of Oct 2026, no shipping hardware wallet signs Bitcoin transactions with PQ signatures. Research firmware shows SLH-DSA-128 signing takes **53–120 s** and SHRINCS-L about **3–8 s** on Jade/Trezor/Ledger/BitBox. ML-DSA is fast on Cortex-M4 (about **4M cycles to sign ML-DSA-44**, about 23 ms at 168 MHz), but it needs **45–108 KB of stack** unless memory-optimized. Ledger's SDK targets ≤16 KB of stack and so far ships no side-channel countermeasures. Trezor Safe 7 uses PQ only for boot, firmware, and attestation.

### Cited Findings
**pqm4 (Cortex-M4) benchmarks, average cycles (keygen / sign / verify) and memory bytes (keygen / sign / verify)** — [mupq/pqm4 benchmarks.md](https://raw.githubusercontent.com/mupq/pqm4/master/benchmarks.md)
- ML-DSA-44 (m4f): 1,426,025 / 3,943,121 / 1,421,623 cycles; 38,296 / 44,816 / 8,912 B
- ML-DSA-65 (m4f): 2,516,006 / 6,193,171 / 2,415,944 cycles; 60,824 / 68,872 / 9,888 B
- ML-DSA-87 (m4f): 4,275,859 / 7,947,380 / 4,193,104 cycles; 97,688 / 107,892 / 12,060 B
- The ML-DSA m4fstack variant needs far less memory (e.g., 4,408 B for ML-DSA-44 keygen) but is slower.
- Falcon/FN-DSA-512 (provisional, m4f): 67.7M / 22.5M / 0.40M cycles; 14,348 / 41,952 / 2,976 B. Keygen and sign vary widely between runs.
- SPHINCS+-SHA2-128s-simple (clean): 1.008G / **7.66G** / 7.47M cycles; about 2.5–3.1 KB stack.
- SPHINCS+-SHA2-128f-simple (clean): 15.7M / 369M / 21.9M cycles; about 2.5–2.9 KB stack.

**Blockstream Research, "Are Hardware Wallets Ready to Produce Post-Quantum Signatures?" (19 Aug 2026)** — [blog.blockstream.com](https://blog.blockstream.com/hardware-wallets-post-quantum-signatures/)
- Devices: Jade Plus, Trezor Safe 3 (Safe 3/5/7 class), Ledger Nano gen5/S+, BitBox02 Nova, with CPUs from 70 to 240 MHz. Jade uses a general MCU. Trezor and BitBox02 compute on the main MCU, with the SE guarding only PIN and secrets. **Ledger runs the app inside the secure element.**
- SLH-DSA-SHA2-128 (7,856 B) signing: Jade 52.85 s, Trezor 65.31 s, Ledger 120.12 s, BitBox02 100.1 s. Keygen: 7.06 / 8.64 / 15.82 / 12.7 s.
- SPHINCS+ 2^40 (5,776 B) signing: 43.28 / 53.45 / 94.98 / 78.4 s.
- SHRINCS-L stateful part (swn=96, 1,092 B) signing: 3.31 / 3.01 / 8.04 / 5.5 s. With overgrinding (swn=140) it takes 225.6–572.8 s.
- SHRINCS-B (324 B) signing: 21.75 / 25.82 / 41.83 / 30.9 s. XMSS 2^10 (696 B) signing: 57.8 / 75.63 / 118.2 / 79.6 s.
- Ledger needed a custom SHA-256 in the app to avoid syscall overhead. "Game while waiting" UX is not a side-channel countermeasure; masking is. ML-DSA was not benchmarked.
- Code: DmitriiKJ forks of Jade, trezor-firmware (`feature/shrincs`), ledger_slh_dsa / ledger_shrincs / ledger-xmss, and bitbox02-firmware. Libraries: BlockstreamResearch/shrincs-c, pq-code-package/slhdsa-c, XMSS/xmss-reference.

**Ledger** — [Ledger blog, 6 Jul 2026](https://www.ledger.com/blog-post-quantum-cryptography-ledger-sdk)
- The Ledger SDK added ML-KEM (FIPS 203) and ML-DSA (FIPS 204). SLH-DSA was not mentioned.
- App SRAM per device: Nano X 28 KB, Nano S Plus 32 KB, Flex 36 KB, Stax 36 KB, Nano Gen5 40 KB. The peak stack target is ≤16 KB. ML-DSA-87 needs `HAVE_MLDSA_OPTIMIZATION`, because without it the stack budget is exceeded on LNX. Techniques include on-the-fly key generation with only three scratch polynomials.
- ML-DSA signing may take up to **814 rejection-loop attempts**.
- **v1 has no side-channel/fault countermeasures** ("only algorithmic security": constant-time compares and zeroization). v2 plans shuffling plus arithmetic masking.
- The post does not say ML-DSA is usable for Bitcoin transactions, and gives no timings.
- PQShield / ePrint 2026/1333: a single ML-DSA signing can take up to about 20x the average, so min/avg/max metrics are misleading for planning. — [ePrint 2026/1333](https://eprint.iacr.org/2026/1333); [PQShield](https://pqshield.com/?p=11516)

**Trezor Safe 7** — [Trezor guide](https://trezor.io/guides/trezor-devices/trezor-safe-7/the-first-quantum-ready-hardware-wallet)
- The boardloader verifies firmware with **SLH-DSA-128**, and device attestation uses an **ML-DSA-44** certificate. Transaction signing is not PQ, and "quantum-ready firmware" is a future deliverable. A competitor notes the claim covers firmware, "not your funds". — [Freedom Factory PQ1 comparison](https://freedomfactory.io/compare/pq1-vs-trezor) (competitor source)

**Secure elements**
- Infineon SLC27 (TEGRION) ships a **Common-Criteria-certified** crypto library with ML-KEM and ML-DSA. — [electronica-azi](https://international.electronica-azi.ro/infineons-pqc-certified-contactless-and-dual-interface-security-controller-slc27-another-step-towards-a-quantum-safe-world/)
- STMicroelectronics ST54M (unveiled 24 Jun 2026) is an NFC + SE + eSIM chip with a PQC hardware accelerator (ML-KEM, ML-DSA). EUCC/EMVCo certifications were targeted for July 2026 (issuance unconfirmed). — [Quantum Computing Report](https://quantumcomputingreport.com/stmicroelectronics-launches-st54m-monolithic-mobile-chip-with-post-quantum-cryptography-accelerator/); [Military & Aerospace](https://www.militaryaerospace.com/communications/product/55394142/stmicroelectronics-unveils-secure-mobile-chip-with-post-quantum-cryptography)

### Inferences
- ML-DSA-44 on a 168 MHz Cortex-M4 is about 23 ms to sign (3.94M cycles / 168 MHz, average). That is about 1,000–3,000x faster than SLH-DSA-128s on similar MCUs. But the stack needs (45 KB m4f) exceed Ledger's 16 KB budget, which forces the slower stack-optimized variants.
- An SLH-DSA-128s signature in the 1–2 minute range per *input* makes multi-input PQ spends on current hardware painful (e.g., 5 inputs ≈ 5–10 min). This favors SHRINCS-style stateful-plus-fallback schemes, or ML-DSA, for frequent spends.
- MCU-centric designs (Trezor, BitBox, Jade, Coldcard-style) can add PQ in app firmware. SE-centric designs (Ledger) depend on vendor SE OS support and possibly recertification.
- QR/air-gap: an ML-DSA-44 signature plus pubkey is about 3.7 KB, and an SLH-DSA-128s signature is 7.9 KB, per input. A single QR v40 holds about 2.9 KB of binary data, so animated multi-part QR (UR/BBQr) is mandatory. Bandwidth grows roughly 30–100x compared with Schnorr PSBTs. (Inference; the QR capacity is the ISO 18004 figure, not researched here.)

### Gaps
- No primary-source PQ firmware announcements were found from Coinkite (Coldcard), Keystone, or BitBox beyond the Blockstream research forks. The Project Eleven hardware-wallet post returned HTTP 403.
- NXP PQC secure element status was not found. Ledger ML-DSA signing times on device were not published.
- pqm4 numbers for the SLH-DSA *FIPS 205 final* naming and for optimized (non-clean) SPHINCS+ were not extracted.

## 5. Hybrid (classical + PQ) signature design patterns

### Takeaway
The IETF's composite ML-DSA (draft-ietf-lamps-pq-composite-sigs-19, Apr 2026, in the RFC Editor queue) is the canonical hybrid pattern. It concatenates keys and signatures, and binds both components to a domain-separated, pre-hashed message so neither can be stripped off. In Bitcoin, the main pattern is not a composite signature but script-level agility: P2MR trees with Schnorr leaves and PQ leaves, or `CHECKSIG classical AND CHECKSIG PQ` within one leaf.

### Cited Findings
- draft-ietf-lamps-pq-composite-sigs-19 (21 Apr 2026): Proposed Standard, in the RFC Editor queue ("Final Approval Pending"), with no RFC number yet. — [IETF datatracker](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/)
- Construction: M' = Prefix ("CompositeAlgorithmSignatures2025") || Label (e.g., "COMPSIG-MLDSA44-Ed25519-SHA512") || len(ctx) || ctx || PH(M). The ML-DSA component signs M' with the Label as its context, and the traditional component signs M'. The signature is the concatenation of ML-DSA sig and traditional sig. Both component keys must be freshly generated and never reused. — [datatracker](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/)
- The rationale has three parts: protection against breaks or bugs in ML-DSA, weak non-separability (a component signature cannot be lifted out), and drop-in protocol compatibility. Caveat: the composite is EUF-CMA, **not SUF-CMA**. — [datatracker](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/)
- Example: ML-DSA-44 + Ed25519 has a 1,344 B public key and a 2,484 B signature (2,420 + 64). 18 combinations are registered. — [datatracker](https://datatracker.ietf.org/doc/draft-ietf-lamps-pq-composite-sigs/)
- The Bitcoin witness-v3 ML-DSA-65 author considered hybrid ECDSA+PQ and rejected it. conduition argued that ML-DSA-only outputs lose crypto-agility (a rescue soft fork would be needed if ML-DSA broke) and favored tapscript-level options. — [Delving Bitcoin draft thread](https://mirror.b10c.me/delvingbitcoin-org/2026-04-16-bip-draft-witness-version-3-ml-dsa-65-post-quantum-key-path-spending-id2422.html)
- libbitcoinpqc deliberately offers Schnorr + ML-DSA-44 (lattice) + SLH-DSA-SHA2-128s (hash) under P2MR, which diversifies across assumptions. — [libbitcoinpqc-bindings](https://github.com/jbride/libbitcoinpqc-bindings)

### Inferences
- SUF-CMA matters for Bitcoin: signature malleability affects txid-independent witness data, but pinning and relay policy can still care. Wallets should not assume composite signatures are non-malleable.
- A practical wallet policy is a P2MR tree with leaf A = Schnorr (cheap, used now), leaf B = ML-DSA-44 (fast PQ), and leaf C = SLH-DSA-128s (conservative hash-only fallback). An "AND" leaf (Schnorr + ML-DSA) gives true hybrid security for high-value cold storage at roughly 2.5 KB + 64 B per input.

### Gaps
- No Bitcoin BIP specifying a composite or AND-style hybrid signature was found.

## 6. Testing and verification

### Takeaway
Use NIST ACVP / KAT vectors and Wycheproof for the primitives, the BIP-360 P2MR construction vectors for output encoding, and PQHD vectors for derivation. Add strict-encoding negative tests, since a FIPS-204 encoding check was the root cause of a real 2026 CVE.

### Cited Findings
- liboqs 0.15.0 added Wycheproof tests for ML-DSA and updated to the final FIPS 204. — [liboqs releases](https://github.com/open-quantum-safe/liboqs/releases)
- noble-post-quantum 0.7.0 underwent an ACVP-based reproducibility study against pinned NIST vectors. — [noble-post-quantum](https://github.com/paulmillr/noble-post-quantum)
- BIP-360 ships `p2mr_construction.json` test vectors (building on BIP-341 vectors). — [BIP-360](https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki)
- PQHD includes test vectors for every active registry entry. — [pqhd](https://github.com/pqdh/pqhd)
- RustCrypto ml-dsa's repeated-hint-index acceptance (CVE-2026-24850) was a regression from a `<` changed to `<=`. Negative and malformed-signature vectors (as in Wycheproof) catch this class of bug. — [GHSA-5x2r-hc65-25f9](https://github.com/RustCrypto/signatures/security/advisories/GHSA-5x2r-hc65-25f9)
- ML-DSA timing benchmarking needs distribution-aware methodology because of rejection sampling (ePrint 2026/1333). — [ePrint 2026/1333](https://eprint.iacr.org/2026/1333)
- The witness-v3 draft includes Bitcoin Core functional tests in its repo. — [Delving Bitcoin draft](https://mirror.b10c.me/delvingbitcoin-org/2026-04-16-bip-draft-witness-version-3-ml-dsa-65-post-quantum-key-path-spending-id2422.html)

### Inferences
- Recommended test matrix:
  1. ACVP and KAT vectors for keygen from seed, sign (deterministic and hedged), and verify.
  2. Wycheproof-style negative vectors.
  3. Cross-implementation differential fuzzing (e.g., liboqs vs RustCrypto vs noble vs bitcoinpqc) on verify, to catch consensus-divergence bugs.
  4. PQHD derivation vectors.
  5. P2MR address and control-block vectors.
  6. Timing tests (dudect/ctgrind-style) on target MCUs.

### Gaps
- No public fuzzing campaign (OSS-Fuzz etc.) for bitcoinpqc was found. CMVP/FIPS 140-3 certificate details for any ML-DSA module were not gathered.

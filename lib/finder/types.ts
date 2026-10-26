// Shared shapes for the low-cap finder (/finder). Everything here is plain
// data so the same objects flow from the API route to the client untouched.

export type ChainId = "solana" | "base" | "bsc" | "ethereum" | "robinhood";

export interface ChainInfo {
  id: ChainId;
  label: string;
  gt: string; // GeckoTerminal network id
  goplus: string | null; // GoPlus EVM chain id (null = Solana endpoint)
  honeypot: boolean; // Honeypot.is can simulate trades on this chain
  explorer: (address: string) => string;
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  solana: {
    id: "solana",
    label: "Solana",
    gt: "solana",
    goplus: null,
    honeypot: false,
    explorer: (a) => `https://solscan.io/token/${a}`,
  },
  base: {
    id: "base",
    label: "Base",
    gt: "base",
    goplus: "8453",
    honeypot: true,
    explorer: (a) => `https://basescan.org/token/${a}`,
  },
  bsc: {
    id: "bsc",
    label: "BNB",
    gt: "bsc",
    goplus: "56",
    honeypot: true,
    explorer: (a) => `https://bscscan.com/token/${a}`,
  },
  ethereum: {
    id: "ethereum",
    label: "Ethereum",
    gt: "eth",
    goplus: "1",
    honeypot: true,
    explorer: (a) => `https://etherscan.io/token/${a}`,
  },
  // Robinhood's Arbitrum Orbit L2 (chain id 4663). Honeypot.is answers
  // "Invalid chain", so there is no sell simulation here.
  robinhood: {
    id: "robinhood",
    label: "Robinhood",
    gt: "robinhood",
    goplus: "4663",
    honeypot: false,
    explorer: (a) => `https://robinhoodchain.blockscout.com/token/${a}`,
  },
};

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export function isChainId(v: string): v is ChainId {
  return v in CHAINS;
}

// Where a candidate was discovered. "profile" and "boost" are paid DexScreener
// placements, so they are shown as promotion, never scored as merit.
export type Origin = "new" | "trending" | "profile" | "boost" | "lookup";

export type Window = "m5" | "h1" | "h6" | "h24";
export const WINDOWS: Window[] = ["m5", "h1", "h6", "h24"];

export interface Flow {
  buys: number;
  sells: number;
  buyers: number | null; // unique wallets (GeckoTerminal only)
  sellers: number | null;
}

// One pool's market snapshot, merged from DexScreener + GeckoTerminal.
export interface Market {
  pairAddress: string;
  dexId: string;
  url: string;
  priceUsd: number | null;
  liquidityUsd: number | null; // null on bonding curves
  mcapUsd: number | null; // market cap, falling back to FDV
  createdAt: number | null; // ms
  volume: Record<Window, number>;
  priceChange: Record<Window, number>;
  flow: Record<Window, Flow>;
  bondingCurve: boolean;
}

export interface Socials {
  twitter: boolean;
  telegram: boolean;
  website: boolean;
  links: { type: string; url: string }[];
}

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";
export type CheckGroup = "market" | "activity" | "contract" | "holders";

export interface Check {
  id: string; // stable rule id, matches the report's rule table
  group: CheckGroup;
  label: string;
  status: CheckStatus;
  value: string; // the observed value, human readable
  rule: string; // the threshold that produced `status`
}

export interface ScorePart {
  id: string;
  label: string;
  weight: number;
  value: number; // 0..1
}

export type Verdict = "pass" | "caution" | "fail";

export interface FinderToken {
  chain: ChainId;
  address: string;
  symbol: string;
  name: string;
  icon: string | null;
  origins: Origin[];
  promoted: boolean; // DexScreener paid profile / boost
  market: Market | null;
  socials: Socials;
  securitySource: string | null; // e.g. "rugcheck+goplus", null = not checked
  checks: Check[];
  verdict: Verdict;
  score: number; // 0..100, 0 when verdict is fail
  scoreParts: ScorePart[];
  riskMultiplier: number;
}

export interface ScanParams {
  chain: ChainId;
  minLiq: number;
  maxMcap: number;
}

export interface ScanResult {
  params: ScanParams;
  at: number; // ms
  tokens: FinderToken[];
  sources: Record<string, "ok" | "error">;
}

export const DEFAULT_MIN_LIQ = 10_000;
export const DEFAULT_MAX_MCAP = 5_000_000;

// Query-string → ScanParams with sane bounds (shared by both API routes).
export function parseScanParams(q: URLSearchParams): ScanParams | null {
  const chain = q.get("chain") ?? "solana";
  if (!isChainId(chain)) return null;
  const n = (k: string, d: number, lo: number, hi: number) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && q.get(k) !== null && q.get(k) !== ""
      ? Math.min(Math.max(v, lo), hi)
      : d;
  };
  return {
    chain,
    minLiq: n("minLiq", DEFAULT_MIN_LIQ, 0, 10_000_000),
    maxMcap: n("maxMcap", DEFAULT_MAX_MCAP, 10_000, 10_000_000_000),
  };
}

// The finder's business logic: every rule that turns raw on-chain / DEX data
// into pass | warn | fail, and the activity score. Pure functions, no I/O.
//
// Rule ids (M*, A*, S*, E*, H*) are stable and documented one-to-one in
// reports/Low cap finder onchain checks.md. Thresholds marked "heuristic" are
// tunable starting points, not empirically validated cut-offs.

import type {
  Check,
  CheckGroup,
  CheckStatus,
  Market,
  ScanParams,
  ScorePart,
  Socials,
  Verdict,
} from "./types";

const usd = (n: number | null | undefined) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};
const pct = (n: number | null | undefined, d = 1) =>
  n === null || n === undefined || !Number.isFinite(n) ? "n/a" : `${n.toFixed(d)}%`;
const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

function check(
  id: string,
  group: CheckGroup,
  label: string,
  status: CheckStatus,
  value: string,
  rule: string
): Check {
  return { id, group, label, status, value, rule };
}

// ---- derived market metrics --------------------------------------------------

export function buyShare(m: Market, w: "m5" | "h1" | "h6" | "h24"): number | null {
  const f = m.flow[w];
  const n = f.buys + f.sells;
  return n > 0 ? f.buys / n : null;
}

// h1 volume relative to the average hour of the last 24h. 6 = "+500%".
export function volumeSurge(m: Market): number | null {
  const avgHour = m.volume.h24 / 24;
  if (!(avgHour > 0)) return null;
  return m.volume.h1 / avgHour;
}

// Trade acceleration: last 5 minutes vs the average 5 minutes of the last hour.
export function tradeAcceleration(m: Market): number | null {
  const h1 = m.flow.h1.buys + m.flow.h1.sells;
  const m5 = m.flow.m5.buys + m.flow.m5.sells;
  if (h1 === 0) return null;
  return m5 / (h1 / 12);
}

export function ageMinutes(m: Market, now = Date.now()): number | null {
  return m.createdAt ? (now - m.createdAt) / 60_000 : null;
}

// ---- M: market gates ----------------------------------------------------------

export function marketChecks(m: Market, p: ScanParams, now = Date.now()): Check[] {
  const out: Check[] = [];

  // M1 liquidity floor. Bonding curves have no pool yet: warn, don't fail.
  if (m.liquidityUsd === null) {
    out.push(
      check("M1", "market", "Liquidity", m.bondingCurve ? "warn" : "unknown",
        m.bondingCurve ? "bonding curve" : "n/a",
        `≥ ${usd(p.minLiq)} in the pool (bonding curve = not yet graduated)`)
    );
  } else {
    out.push(
      check("M1", "market", "Liquidity", m.liquidityUsd >= p.minLiq ? "pass" : "fail",
        usd(m.liquidityUsd), `≥ ${usd(p.minLiq)} in the pool`)
    );
  }

  // M2 low-cap ceiling (this is a low-cap finder, large caps are out of scope).
  out.push(
    m.mcapUsd === null
      ? check("M2", "market", "Market cap", "unknown", "n/a", `≤ ${usd(p.maxMcap)}`)
      : check("M2", "market", "Market cap", m.mcapUsd <= p.maxMcap ? "pass" : "fail",
          usd(m.mcapUsd), `≤ ${usd(p.maxMcap)}`)
  );

  // M3 liquidity depth relative to cap (heuristic): < 3% means a small sell
  // moves price violently and the cap is mostly paper.
  if (m.liquidityUsd !== null && m.mcapUsd) {
    const r = (m.liquidityUsd / m.mcapUsd) * 100;
    out.push(
      check("M3", "market", "Liquidity / cap", r >= 3 ? "pass" : "warn", pct(r),
        "≥ 3% of market cap (heuristic)")
    );
  }

  // M4 age: under 15 minutes there is not enough history to judge anything.
  const age = ageMinutes(m, now);
  out.push(
    age === null
      ? check("M4", "market", "Pool age", "unknown", "n/a", "≥ 15 min")
      : check("M4", "market", "Pool age", age >= 15 ? "pass" : "warn", fmtAge(age),
          "≥ 15 min of trading history")
  );

  return out;
}

export function fmtAge(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 48 * 60) return `${(min / 60).toFixed(1)}h`;
  return `${Math.round(min / 1440)}d`;
}

// ---- A: trading-activity rules --------------------------------------------------

export function activityChecks(m: Market): Check[] {
  const out: Check[] = [];
  const h1 = m.flow.h1;
  const h24 = m.flow.h24;
  const tx1 = h1.buys + h1.sells;

  // A1 alive: no trades in the last hour = dead or abandoned.
  out.push(
    check("A1", "activity", "Trades (1h)", tx1 === 0 ? "fail" : tx1 < 10 ? "warn" : "pass",
      String(tx1), "> 0 required, ≥ 10 for a pass")
  );

  // A2 wash trading (arXiv 2507.01963): volume up > 500% while price moves < 5%.
  const surge = volumeSurge(m);
  if (surge === null) {
    out.push(check("A2", "activity", "Wash-trade pattern", "unknown", "n/a",
      "1h volume > 6× hourly avg with |Δprice 1h| < 5%"));
  } else {
    const wash = surge > 6 && Math.abs(m.priceChange.h1) < 5 && m.volume.h1 > 1000;
    out.push(check("A2", "activity", "Wash-trade pattern", wash ? "fail" : "pass",
      `${surge.toFixed(1)}× vol, ${pct(m.priceChange.h1)} price`,
      "fail if 1h volume > 6× hourly avg with |Δprice 1h| < 5%"));
  }

  // A3 thin-liquidity price inflation (arXiv 2507.01963): +100% in 24h with
  // ≥ 90% buys from ≤ 10 unique traders.
  const share24 = buyShare(m, "h24");
  const traders24 = h24.buyers !== null ? h24.buyers + (h24.sellers ?? 0) : null;
  if (m.priceChange.h24 > 100 && share24 !== null && share24 >= 0.9) {
    const few = traders24 !== null ? traders24 <= 10 : h24.buys + h24.sells <= 10;
    out.push(check("A3", "activity", "Price inflation", few ? "fail" : "warn",
      `${pct(m.priceChange.h24, 0)}, ${pct(share24 * 100, 0)} buys, ${traders24 ?? "?"} traders`,
      "fail if +100% / 24h with ≥ 90% buys from ≤ 10 traders"));
  } else {
    out.push(check("A3", "activity", "Price inflation", "pass",
      `${pct(m.priceChange.h24, 0)} 24h`, "fail if +100% / 24h with ≥ 90% buys from ≤ 10 traders"));
  }

  // A4 collapse / rug signature.
  const crashed = m.priceChange.h1 <= -80 || m.priceChange.h6 <= -90;
  out.push(check("A4", "activity", "Price collapse",
    crashed ? "fail" : m.priceChange.h24 <= -50 ? "warn" : "pass",
    `${pct(m.priceChange.h1, 0)} 1h · ${pct(m.priceChange.h6, 0)} 6h · ${pct(m.priceChange.h24, 0)} 24h`,
    "fail if ≤ −80% in 1h or ≤ −90% in 6h; warn if ≤ −50% in 24h"));

  // A5 sell pressure (heuristic).
  const share1 = buyShare(m, "h1");
  out.push(
    share1 === null
      ? check("A5", "activity", "Buy share (1h)", "unknown", "n/a", "≥ 35% of trades are buys")
      : check("A5", "activity", "Buy share (1h)", share1 >= 0.35 ? "pass" : "warn",
          pct(share1 * 100, 0), "≥ 35% of trades are buys (heuristic)")
  );

  // A6 trader breadth: unique buying wallets in the last hour.
  if (h1.buyers === null) {
    out.push(check("A6", "activity", "Unique buyers (1h)", "unknown", "n/a", "≥ 5 wallets"));
  } else {
    out.push(check("A6", "activity", "Unique buyers (1h)", h1.buyers >= 5 ? "pass" : "warn",
      String(h1.buyers), "≥ 5 distinct wallets (heuristic)"));
  }

  // A7 bot churn: many trades per wallet = a few wallets cycling volume.
  if (traders24 && traders24 > 0) {
    const per = (h24.buys + h24.sells) / traders24;
    out.push(check("A7", "activity", "Trades per wallet (24h)", per <= 8 ? "pass" : "warn",
      per.toFixed(1), "≤ 8 trades per unique wallet (heuristic)"));
  }

  return out;
}

// ---- S: Solana contract + holder rules (RugCheck + GoPlus) --------------------

const AUTH_NONE = new Set(["", "11111111111111111111111111111111"]);

function gpFlag(gp: any, key: string): boolean | null {
  const v = gp?.[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "object" && "status" in v) return v.status === "1";
  return v === "1";
}

export function solanaChecks(rc: any, gp: any, m: Market | null): Check[] {
  const out: Check[] = [];
  const has = (v: unknown) => typeof v === "string" && !AUTH_NONE.has(v);

  // S1 / S2 mint & freeze authority — the classic Solana rug levers.
  const mintAuth = rc ? has(rc.mintAuthority) : gpFlag(gp, "mintable");
  const freezeAuth = rc ? has(rc.freezeAuthority) : gpFlag(gp, "freezable");
  out.push(tri("S1", "contract", "Mint authority revoked", mintAuth, "revoked",
    "active — supply can be inflated", "fail if a mint authority exists"));
  out.push(tri("S2", "contract", "Freeze authority revoked", freezeAuth, "revoked",
    "active — wallets can be frozen", "fail if a freeze authority exists"));

  // S3–S6 Token-2022 / GoPlus levers.
  out.push(tri("S3", "contract", "Balances immutable", gpFlag(gp, "balance_mutable_authority"),
    "yes", "authority can change balances", "fail if balance_mutable_authority"));
  const hooks = Array.isArray(gp?.transfer_hook) ? gp.transfer_hook.length : null;
  out.push(tri("S4", "contract", "No transfer hook", hooks === null ? null : hooks > 0,
    "none", `${hooks} hook(s)`, "fail if a transfer hook program is set"));
  const frozenDefault = gp?.default_account_state === undefined ? null : gp.default_account_state === "2";
  out.push(tri("S5", "contract", "Accounts not frozen by default", frozenDefault, "ok",
    "new accounts start frozen", "fail if default_account_state = frozen"));
  const closable = gpFlag(gp, "closable");
  const nonTransfer = gp?.non_transferable === undefined ? null : gp.non_transferable === "1";
  out.push(tri("S6", "contract", "Transferable, not closable",
    closable === null && nonTransfer === null ? null : !!closable || !!nonTransfer,
    "ok", nonTransfer ? "non-transferable" : "mint closable", "fail if non-transferable or closable"));

  // S7 transfer fee (Token-2022).
  const fee = num(rc?.transferFee?.pct);
  if (fee !== null) {
    out.push(check("S7", "contract", "Transfer fee", fee > 10 ? "fail" : fee > 0 ? "warn" : "pass",
      pct(fee), "warn if > 0%, fail if > 10%"));
  }

  // S8 mutable metadata: name/image can be swapped (impersonation risk).
  const mutable = rc?.tokenMeta?.mutable ?? gpFlag(gp, "metadata_mutable");
  if (mutable !== null && mutable !== undefined) {
    out.push(check("S8", "contract", "Metadata immutable", mutable ? "warn" : "pass",
      mutable ? "mutable" : "immutable", "warn if metadata can still be changed"));
  }

  // S9 RugCheck's own verdicts.
  if (rc) {
    if (rc.rugged) {
      out.push(check("S9", "contract", "RugCheck", "fail", "flagged as rugged", "fail if rugged"));
    } else {
      const danger = (rc.risks ?? []).filter((r: any) => r.level === "danger");
      out.push(check("S9", "contract", "RugCheck danger risks", danger.length ? "fail" : "pass",
        danger.length ? danger.map((r: any) => r.name).join(", ") : "none",
        "fail on any RugCheck risk with level = danger"));
    }
  } else {
    out.push(check("S9", "contract", "RugCheck", "unknown", "unavailable", "report required"));
  }

  out.push(...solanaHolderChecks(rc, m));
  return out;
}

// Concentration must exclude pools, lockers and bonding-curve vaults, or every
// pre-graduation token would look like a 96%-whale rug.
function solanaHolderChecks(rc: any, m: Market | null): Check[] {
  if (!rc || !Array.isArray(rc.topHolders)) {
    return [check("H1", "holders", "Top-10 holders", "unknown", "n/a", "≤ 30% of supply")];
  }
  const out: Check[] = [];
  const excluded = new Set<string>();
  for (const [addr, info] of Object.entries<any>(rc.knownAccounts ?? {})) {
    if (info?.type === "AMM" || info?.type === "LOCKER") excluded.add(addr);
  }
  for (const mk of rc.markets ?? []) {
    for (const k of ["pubkey", "liquidityA", "liquidityB"]) if (mk[k]) excluded.add(mk[k]);
    for (const k of ["liquidityAAccount", "liquidityBAccount"])
      if (mk[k]?.owner) excluded.add(mk[k].owner);
  }
  if (m?.pairAddress) excluded.add(m.pairAddress);

  let holders: any[] = rc.topHolders.filter(
    (h: any) => !excluded.has(h.address) && !excluded.has(h.owner)
  );
  let curveNote = "";
  if (m?.bondingCurve && holders[0]?.pct > 50 && !holders[0]?.insider) {
    holders = holders.slice(1); // the curve vault itself
    curveNote = " (curve vault excluded)";
  }

  const top10 = holders.slice(0, 10).reduce((s, h) => s + (h.pct ?? 0), 0);
  out.push(check("H1", "holders", "Top-10 holders", top10 > 30 ? "fail" : top10 > 20 ? "warn" : "pass",
    pct(top10) + curveNote, "fail if > 30%, warn if > 20% (pools/lockers excluded)"));

  const top1 = holders[0]?.pct ?? 0;
  out.push(check("H2", "holders", "Largest wallet", top1 > 15 ? "warn" : "pass", pct(top1),
    "warn if a single wallet holds > 15%"));

  const supply = num(rc.token?.supply);
  const creatorBal = num(rc.creatorBalance);
  if (supply && creatorBal !== null) {
    const c = (creatorBal / supply) * 100;
    out.push(check("H3", "holders", "Creator holding", c > 20 ? "fail" : c > 5 ? "warn" : "pass",
      pct(c), "warn if > 5%, fail if > 20%"));
  }

  const insiderPct = holders.filter((h) => h.insider).reduce((s, h) => s + (h.pct ?? 0), 0);
  const graph = num(rc.graphInsidersDetected) ?? 0;
  out.push(check("H4", "holders", "Insider wallets",
    insiderPct > 20 ? "fail" : insiderPct > 0 || graph > 0 ? "warn" : "pass",
    `${pct(insiderPct)} held · ${graph} linked`, "warn if any insiders, fail if insiders hold > 20%"));

  const total = num(rc.totalHolders);
  if (total !== null) {
    out.push(check("H5", "holders", "Holder count", total >= 50 ? "pass" : "warn", String(total), "≥ 50 holders"));
  }

  if (!m?.bondingCurve) {
    const lp = Math.max(0, ...(rc.markets ?? []).map((mk: any) => num(mk.lp?.lpLockedPct) ?? 0));
    out.push(check("H6", "holders", "LP locked / burned", lp >= 50 ? "pass" : "warn", pct(lp),
      "warn if < 50% of LP is locked or burned"));
  }
  return out;
}

// ---- E: EVM contract + holder rules (GoPlus) -------------------------------------

const DEAD = /^0x0{40}$|^0x0{36}dead$|^0x000000000000000000000000000000000000dead$/i;

export function evmChecks(gp: any): Check[] {
  if (!gp) {
    return [check("E1", "contract", "GoPlus report", "unknown", "unavailable", "report required")];
  }
  const out: Check[] = [];
  const f = (k: string) => (gp[k] === undefined || gp[k] === "" ? null : gp[k] === "1");
  const owner: string = gp.owner_address ?? "";
  const renounced = owner === "" || DEAD.test(owner);

  // E1 honeypot: can you actually sell?
  const hp = f("is_honeypot");
  const cannotSell = f("cannot_sell_all");
  const cannotBuy = f("cannot_buy");
  out.push(tri("E1", "contract", "Sellable (not a honeypot)",
    hp === null && cannotSell === null ? null : !!hp || !!cannotSell || !!cannotBuy,
    "yes", hp ? "honeypot" : cannotSell ? "cannot sell all" : "cannot buy",
    "fail if is_honeypot, cannot_sell_all or cannot_buy"));

  // E2 / E3 taxes. GoPlus returns fractions ("0.05" = 5%); "" = not simulated.
  const sell = num(gp.sell_tax);
  const buy = num(gp.buy_tax);
  out.push(sell === null
    ? check("E2", "contract", "Sell tax", "unknown", "not simulated", "fail if > 10%")
    : check("E2", "contract", "Sell tax", sell > 0.1 ? "fail" : sell > 0.05 ? "warn" : "pass",
        pct(sell * 100), "warn if > 5%, fail if > 10% (heuristic)"));
  out.push(buy === null
    ? check("E3", "contract", "Buy tax", "unknown", "not simulated", "warn if > 10%")
    : check("E3", "contract", "Buy tax", buy > 0.1 ? "warn" : "pass", pct(buy * 100), "warn if > 10%"));

  // E4 owner backdoors that can take funds regardless of renouncement.
  const backdoor = ["hidden_owner", "owner_change_balance", "can_take_back_ownership", "selfdestruct"]
    .filter((k) => f(k));
  out.push(check("E4", "contract", "No owner backdoors", backdoor.length ? "fail" : "pass",
    backdoor.length ? backdoor.join(", ") : "none",
    "fail on hidden_owner, owner_change_balance, can_take_back_ownership, selfdestruct"));

  // E5 source verified.
  const open = f("is_open_source");
  out.push(tri("E5", "contract", "Source verified", open === null ? null : !open, "verified",
    "unverified bytecode", "fail if the contract source is not verified"));

  // E6 owner-controlled trading levers — moot once ownership is renounced.
  const levers = ["transfer_pausable", "is_blacklisted", "slippage_modifiable",
    "personal_slippage_modifiable", "trading_cooldown", "anti_whale_modifiable"].filter((k) => f(k));
  out.push(check("E6", "contract", "Trading restrictions",
    levers.length && !renounced ? "warn" : "pass",
    levers.length ? `${levers.join(", ")}${renounced ? " (owner renounced)" : ""}` : "none",
    "warn if the owner can pause, blacklist or change taxes"));

  // E7 mintable / upgradeable.
  const mintable = f("is_mintable");
  out.push(check("E7", "contract", "Fixed supply",
    mintable ? (renounced ? "warn" : "fail") : "pass",
    mintable ? `mintable${renounced ? " (owner renounced)" : ""}` : "fixed",
    "fail if mintable with an active owner"));
  if (f("is_proxy")) {
    out.push(check("E8", "contract", "Not upgradeable", "warn", "proxy contract",
      "warn if the logic can be swapped via a proxy"));
  }

  // E9 serial scammer.
  if (f("honeypot_with_same_creator")) {
    out.push(check("E9", "contract", "Creator history", "fail", "creator deployed honeypots",
      "fail if the same creator shipped a honeypot before"));
  }

  out.push(...evmHolderChecks(gp));
  return out;
}

function evmHolderChecks(gp: any): Check[] {
  const out: Check[] = [];
  const pairs = new Set<string>(
    (gp.dex ?? []).map((d: any) => String(d.pair ?? "").toLowerCase())
  );
  const holders: any[] = (gp.holders ?? []).filter(
    (h: any) =>
      !(h.is_locked === 1) &&
      !(h.is_contract === 1) && // pools, lockers, vesting — see report limitations
      !DEAD.test(h.address ?? "") &&
      !pairs.has(String(h.address ?? "").toLowerCase())
  );
  if (!gp.holders?.length) {
    out.push(check("H1", "holders", "Top-10 holders", "unknown", "no holder data yet", "≤ 30% of supply"));
  } else {
    const top10 = holders.slice(0, 10).reduce((s, h) => s + Number(h.percent ?? 0) * 100, 0);
    out.push(check("H1", "holders", "Top-10 holders", top10 > 30 ? "fail" : top10 > 20 ? "warn" : "pass",
      pct(top10), "fail if > 30%, warn if > 20% (contracts, locks, burns excluded)"));
    const top1 = Number(holders[0]?.percent ?? 0) * 100;
    out.push(check("H2", "holders", "Largest wallet", top1 > 15 ? "warn" : "pass", pct(top1),
      "warn if a single wallet holds > 15%"));
  }

  const creator = num(gp.creator_percent);
  if (creator !== null) {
    const c = creator * 100;
    out.push(check("H3", "holders", "Creator holding", c > 20 ? "fail" : c > 5 ? "warn" : "pass",
      pct(c), "warn if > 5%, fail if > 20%"));
  }

  const count = num(gp.holder_count);
  if (count) {
    out.push(check("H5", "holders", "Holder count", count >= 50 ? "pass" : "warn", String(count), "≥ 50 holders"));
  }

  if (gp.lp_holders?.length) {
    const safe = gp.lp_holders
      .filter((h: any) => h.is_locked === 1 || DEAD.test(h.address ?? ""))
      .reduce((s: number, h: any) => s + Number(h.percent ?? 0) * 100, 0);
    out.push(check("H6", "holders", "LP locked / burned", safe >= 50 ? "pass" : "warn", pct(safe),
      "warn if < 50% of LP is locked or burned"));
  }
  return out;
}

// Honeypot.is buy/sell simulation result → one extra check (detail view).
export function honeypotCheck(hp: any): Check {
  if (!hp || hp.simulationSuccess !== true) {
    return check("E10", "contract", "Sell simulation", "unknown",
      hp?.error ?? "not simulated (pair unsupported)", "simulated sell must succeed");
  }
  const isHp = hp.honeypotResult?.isHoneypot === true;
  const sellTax = num(hp.simulationResult?.sellTax) ?? 0; // percent
  return check("E10", "contract", "Sell simulation",
    isHp || sellTax > 10 ? "fail" : sellTax > 5 ? "warn" : "pass",
    isHp ? "honeypot" : `sell tax ${pct(sellTax)}`,
    "fail if the simulated sell reverts or taxes > 10%");
}

// Placeholder when the security sweep skipped a token (outside the top-N).
export function uncheckedSecurity(): Check[] {
  return [
    check("S0", "contract", "Contract checks", "unknown", "not checked in this scan",
      "open the token for a full check"),
  ];
}

// "true means bad" helper: null → unknown, true → fail, false → pass.
function tri(id: string, group: CheckGroup, label: string, bad: boolean | null,
  okValue: string, badValue: string, rule: string): Check {
  if (bad === null) return check(id, group, label, "unknown", "n/a", rule);
  return check(id, group, label, bad ? "fail" : "pass", bad ? badValue : okValue, rule);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---- verdict + score --------------------------------------------------------------

// Checks a token cannot "pass" without: if any of these is unknown (provider
// down, token too fresh to be indexed, not swept) the best verdict is caution.
const CRITICAL = new Set(["S1", "S2", "E1", "E2", "H1"]);

export function verdictOf(checks: Check[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "fail";
  const warns = checks.filter((c) => c.status === "warn").length;
  const swept = checks.some((c) => c.group === "contract" && c.id !== "S0");
  const criticalUnknown = checks.some((c) => CRITICAL.has(c.id) && c.status === "unknown");
  if (warns >= 3 || !swept || criticalUnknown) return "caution";
  return "pass";
}

// Activity score: weighted 0..1 features × a risk multiplier from warnings.
export function scoreOf(
  m: Market | null,
  socials: Socials,
  checks: Check[],
  p: ScanParams
): { score: number; parts: ScorePart[]; riskMultiplier: number } {
  const parts: ScorePart[] = [];
  const add = (id: string, label: string, weight: number, value: number) =>
    parts.push({ id, label, weight, value: clamp01(value) });

  if (m) {
    const h1 = m.flow.h1;
    // Breadth: unique buyers (fallback: buy count / 2). 200 → full marks.
    const buyers = h1.buyers ?? h1.buys / 2;
    add("breadth", "Unique buyers 1h", 0.25, Math.log10(1 + buyers) / Math.log10(201));
    // Pressure: buy share 40% → 0, 70% → 1.
    add("pressure", "Buy pressure 1h", 0.15, ((buyShare(m, "h1") ?? 0) - 0.4) / 0.3);
    // Turnover: 24h volume / liquidity, log-scaled, 20× → 1.
    const liq = m.liquidityUsd ?? m.mcapUsd ?? 0;
    const turnover = liq > 0 ? m.volume.h24 / liq : 0;
    add("turnover", "Volume / liquidity 24h", 0.15, Math.log10(1 + turnover) / Math.log10(21));
    // Acceleration: last 5m trade rate vs 1h average. 0.5× → 0, 3× → 1.
    add("accel", "Trade acceleration", 0.2, ((tradeAcceleration(m) ?? 0) - 0.5) / 2.5);
    // Depth: liquidity above the floor, 100× floor → 1.
    add("depth", "Liquidity depth", 0.15,
      m.liquidityUsd ? Math.log10(m.liquidityUsd / p.minLiq) / 2 : 0);
  }
  // Socials present (pump.fun graduation study: a Telegram link ≈ 5× odds).
  add("socials", "Socials linked", 0.1,
    (Number(socials.twitter) + Number(socials.telegram) + Number(socials.website)) / 3);

  const warns = checks.filter((c) => c.status === "warn").length;
  const riskMultiplier = checks.some((c) => c.status === "fail")
    ? 0
    : Math.max(0.3, 1 - 0.1 * warns);
  const raw = parts.reduce((s, x) => s + x.weight * x.value, 0);
  return { score: Math.round(raw * riskMultiplier * 100), parts, riskMultiplier };
}

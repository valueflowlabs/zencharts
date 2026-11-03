// The built-in command set. Add a command by appending to COMMANDS — the
// registry, help output, and Tab-completion pick it up automatically.

import type { Command, CommandContext } from "./types";
import {
  MAX_MOMENTUM_LOOKBACK,
  MIN_MOMENTUM_LOOKBACK,
} from "../indicators/momentum";
import {
  CONE_LEVELS,
  CONE_MODELS,
  MAX_CONE_HORIZON,
  MIN_CONE_HORIZON,
  isValidConeModel,
  scoreCone,
} from "../indicators/cone";
import {
  CORRIDOR_QUANTILES,
  fitPowerLaw,
  powerLawPrice,
  scorePowerLaw,
} from "../indicators/powerlaw";
import {
  DVOL_FORWARD_DAYS,
  FUNDING_FORWARD_DAYS,
  annualiseFunding,
  scoreDvol,
  scoreFunding,
} from "../indicators/derivatives";
import {
  ALIGNS,
  HALVINGS,
  computeCycles,
  cycleNow,
  daysBetween,
  issuanceShock,
  nextHalvingEstimate,
  scoreCycles,
  type Align,
} from "../indicators/cycles";
import {
  PUELL_WINDOW_DAYS,
  capitulations,
  halvingEffect,
  pointAt,
  revenueMultiple,
} from "../indicators/miners";
import { lagCorrelation, logChange, monthly } from "../indicators/liquidity";
import { valueAt } from "../indicators/align";
import {
  DEFAULT_FEE_BP,
  DEFAULT_MA_LENGTH,
  DEFAULT_TSMOM_LOOKBACK,
  backtest as runBacktest,
  strategyLabel,
  type Metrics,
  type Strategy,
} from "../backtest";
import { fetchClosedDaily, fetchSeries } from "../data";
import { DAY, isoDate } from "../time";
import type { Overlays } from "../config/overlays";

const help: Command = {
  name: "help",
  aliases: ["?"],
  summary: "List available commands",
  usage: "help [command]",
  run: (ctx) => {
    const [which] = ctx.args;
    if (which) {
      const c = ctx.commands.find(
        (c) => c.name === which || c.aliases?.includes(which)
      );
      if (!c) return ctx.print(`no such command: ${which}`, "err");
      ctx.print(`${c.name} — ${c.summary}`, "out");
      if (c.usage) ctx.print(`usage: ${c.usage}`, "info");
      if (c.aliases?.length)
        ctx.print(`aliases: ${c.aliases.join(", ")}`, "info");
      return;
    }
    ctx.print("commands:", "info");
    for (const c of ctx.commands) {
      ctx.print(`  ${c.name.padEnd(9)} ${c.summary}`, "out");
    }
    ctx.print("tip: Tab completes · ↑/↓ history · ` or Esc toggles", "info");
  },
  complete: (preceding, _config, commands) =>
    preceding.length === 0 ? commands.map((c) => c.name) : [],
};

const theme: Command = {
  name: "theme",
  summary: "Show, list, or change the color theme",
  usage: "theme | theme list | theme set <name> | theme <name>",
  run: (ctx) => {
    const [sub, maybeName] = ctx.args;
    if (!sub) {
      ctx.print(`current theme: ${ctx.config.themeName}`, "out");
      ctx.print("usage: theme list | theme set <name> | theme <name>", "info");
      return;
    }
    if (sub === "list") {
      for (const t of ctx.config.themes) {
        const active = t.name === ctx.config.themeName ? "  (active)" : "";
        ctx.print(`  ${t.name.padEnd(10)} ${t.label}${active}`, "out");
      }
      return;
    }
    const name = sub === "set" ? maybeName : sub;
    if (!name) return ctx.print("usage: theme set <name>", "err");
    const ok = ctx.config.setTheme(name);
    ctx.print(
      ok ? `theme → ${name}` : `unknown theme: ${name} (try 'theme list')`,
      ok ? "out" : "err"
    );
  },
  complete: (preceding, config) => {
    const names = config.themes.map((t) => t.name);
    if (preceding.length === 0) return ["list", "set", ...names];
    if (preceding[0] === "set" && preceding.length === 1) return names;
    return [];
  },
};

const symbol: Command = {
  name: "symbol",
  aliases: ["chart", "pair"],
  summary: "Show, list, or change the charted instrument",
  usage: "symbol | symbol list | symbol set <id> | symbol <id>",
  run: (ctx) => {
    const [sub, maybeId] = ctx.args;
    const current = ctx.config.symbols.find((s) => s.id === ctx.config.symbol);
    if (!sub) {
      ctx.print(
        `current: ${current?.label ?? ctx.config.symbol} (${ctx.config.symbol})`,
        "out"
      );
      ctx.print("usage: symbol list | symbol set <id> | symbol <id>", "info");
      return;
    }
    if (sub === "list") {
      for (const s of ctx.config.symbols) {
        const active = s.id === ctx.config.symbol ? "  (active)" : "";
        ctx.print(`  ${s.id.padEnd(6)} ${s.label}${active}`, "out");
      }
      return;
    }
    const id = sub === "set" ? maybeId : sub;
    if (!id) return ctx.print("usage: symbol set <id>", "err");
    const ok = ctx.config.setSymbol(id);
    if (!ok) return ctx.print(`unknown symbol: ${id} (try 'symbol list')`, "err");
    const label = ctx.config.symbols.find((s) => s.id === id)?.label ?? id;
    ctx.print(`chart → ${label}`, "out");
  },
  complete: (preceding, config) => {
    const ids = config.symbols.map((s) => s.id);
    if (preceding.length === 0) return ["list", "set", ...ids];
    if (preceding[0] === "set" && preceding.length === 1) return ids;
    return [];
  },
};

const momentum: Command = {
  name: "momentum",
  aliases: ["mom"],
  summary: "Toggle the momentum indicator (% change over N bars)",
  usage: "momentum | momentum on | momentum off | momentum lookback <n>",
  run: (ctx) => {
    const [sub, arg] = ctx.args;
    const { momentum: on, momentumLookback: n } = ctx.config;
    if (!sub) {
      ctx.print(`momentum: ${on ? "on" : "off"} · lookback ${n} bars`, "out");
      ctx.print(
        "usage: momentum on | momentum off | momentum lookback <n>",
        "info"
      );
      return;
    }
    if (sub === "on" || sub === "off") {
      ctx.config.setMomentum(sub === "on");
      ctx.print(`momentum → ${sub}`, "out");
      return;
    }
    if (sub === "toggle") {
      ctx.config.setMomentum(!on);
      ctx.print(`momentum → ${on ? "off" : "on"}`, "out");
      return;
    }
    if (sub === "lookback") {
      const next = Number(arg);
      if (!arg || !ctx.config.setMomentumLookback(next)) {
        return ctx.print(
          `lookback must be a whole number ${MIN_MOMENTUM_LOOKBACK}–${MAX_MOMENTUM_LOOKBACK}`,
          "err"
        );
      }
      ctx.print(`momentum lookback → ${next} bars`, "out");
      return;
    }
    ctx.print(`unknown: momentum ${sub} (try 'help momentum')`, "err");
  },
  complete: (preceding) => {
    if (preceding.length === 0) return ["on", "off", "toggle", "lookback"];
    if (preceding[0] === "lookback" && preceding.length === 1)
      return ["10", "20", "50", "100"];
    return [];
  },
};

// ---- forecasting overlays -------------------------------------------------

const pct = (x: number, digits = 1) =>
  Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}%` : "—";
const num = (x: number, digits = 2) =>
  Number.isFinite(x) ? x.toFixed(digits) : "—";

// Shared on/off/toggle handling. Returns true if the sub-command was handled.
function handleSwitch(
  ctx: CommandContext,
  key: "cone" | "powerlaw" | "cycles" | "miners" | "liquidity" | "funding" | "dvol",
  sub: string | undefined,
  note?: string
): boolean {
  const on = ctx.config.overlays[key];
  let next: boolean;
  if (sub === "on" || sub === "off") next = sub === "on";
  else if (sub === "toggle") next = !on;
  else return false;
  ctx.config.setOverlays({ [key]: next } as Partial<Overlays>);
  ctx.print(`${key} → ${next ? "on" : "off"}`, "out");
  if (next && note) ctx.print(note, "info");
  return true;
}

const SWITCH = ["on", "off", "toggle"];

const cone: Command = {
  name: "cone",
  summary: "Volatility cone: the likely price range over the next N bars",
  usage:
    "cone on|off | cone model ewma|garch|dvol | cone horizon <bars> | cone score [days]",
  run: async (ctx) => {
    const [sub, arg] = ctx.args;
    const o = ctx.config.overlays;
    if (!sub) {
      ctx.print(
        `cone: ${o.cone ? "on" : "off"} · model ${o.coneModel} · horizon ${o.coneHorizon} bars`,
        "out"
      );
      ctx.print(
        "bands: 80% and 95% of outcomes should land inside (zero drift — range, not direction)",
        "info"
      );
      return;
    }
    if (handleSwitch(ctx, "cone", sub)) return;
    if (sub === "model") {
      if (!isValidConeModel(arg)) {
        return ctx.print(`model must be one of: ${CONE_MODELS.join(", ")}`, "err");
      }
      ctx.config.setOverlays({ coneModel: arg });
      ctx.print(`cone model → ${arg}`, "out");
      if (arg === "dvol") ctx.print("dvol is BTC only (Deribit implied vol)", "info");
      return;
    }
    if (sub === "horizon") {
      const n = Number(arg);
      if (!arg || !ctx.config.setOverlays({ coneHorizon: n })) {
        return ctx.print(
          `horizon must be a whole number ${MIN_CONE_HORIZON}–${MAX_CONE_HORIZON}`,
          "err"
        );
      }
      ctx.print(`cone horizon → ${n} bars`, "out");
      return;
    }
    if (sub === "score") {
      const h = arg ? Number(arg) : 30;
      if (!Number.isInteger(h) || h < 1 || h > MAX_CONE_HORIZON) {
        return ctx.print(`days must be a whole number 1–${MAX_CONE_HORIZON}`, "err");
      }
      const model = o.coneModel;
      ctx.print(`scoring ${model} cone, ${h}-day horizon, on daily closes…`, "info");
      const { times, closes } = await fetchClosedDaily(ctx.config.symbol);
      let dvolAt: ((t: number) => number | undefined) | undefined;
      if (model === "dvol") {
        const dvol = await fetchSeries("dvol", ctx.config.symbol);
        dvolAt = (t) => valueAt(dvol, t + DAY);
      }
      const score = scoreCone(times, closes, model, h, dvolAt);
      const head = CONE_LEVELS.map((l) => `${Math.round(l.coverage * 100)}% band`);
      ctx.print(
        `  window   origins  ${head.map((x) => x.padStart(10)).join(" ")}`,
        "info"
      );
      for (const row of score.rows) {
        if (!row.n) continue;
        const cells = row.breach.map((b, i) => {
          const target = 1 - CONE_LEVELS[i].coverage;
          return `${(b * 100).toFixed(1)}%/${Math.round(target * 100)}`.padStart(10);
        });
        ctx.print(`  ${row.label.padEnd(8)} ${String(row.n).padStart(7)}  ${cells.join(" ")}`, "out");
      }
      ctx.print(
        "breach rate / target: close outside the band h days later. Near target = calibrated; above = too narrow, below = too wide.",
        "info"
      );
      if (model === "garch") ctx.print("garch refitted each 1 Jan on past data only", "info");
      return;
    }
    ctx.print(`unknown: cone ${sub} (try 'help cone')`, "err");
  },
  complete: (preceding) => {
    if (preceding.length === 0) return [...SWITCH, "model", "horizon", "score"];
    if (preceding[0] === "model" && preceding.length === 1) return CONE_MODELS;
    if (preceding[0] === "horizon" && preceding.length === 1)
      return ["10", "30", "90", "180"];
    if (preceding[0] === "score" && preceding.length === 1)
      return ["7", "30", "90"];
    return [];
  },
};

const powerlaw: Command = {
  name: "powerlaw",
  aliases: ["pl"],
  summary: "Power-law trend corridor (BTC, 1D/1W, log scale)",
  usage: "powerlaw | powerlaw on|off | powerlaw score",
  run: async (ctx) => {
    const [sub] = ctx.args;
    const note = "shown on BTC 1D/1W charts; the price axis switches to log while on";
    if (handleSwitch(ctx, "powerlaw", sub, note)) return;
    if (ctx.config.symbol !== "btc") {
      return ctx.print("the power law is fitted to BTC only", "err");
    }
    const { times, closes } = await fetchClosedDaily("btc");
    if (!sub) {
      const fit = fitPowerLaw(times, closes);
      if (!fit) return ctx.print("not enough history to fit", "err");
      const t = times[times.length - 1];
      const price = closes[closes.length - 1];
      const [lo, mid, hi] = CORRIDOR_QUANTILES.map((_, i) => powerLawPrice(fit, t, i));
      ctx.print(
        `powerlaw: ${ctx.config.overlays.powerlaw ? "on" : "off"} · exponent ${num(fit.b, 2)} · fit on ${fit.n} days`,
        "out"
      );
      ctx.print(
        `today: ${price.toFixed(0)} · fair ${mid.toFixed(0)} (${pct(price / mid - 1, 0)}) · corridor ${lo.toFixed(0)}–${hi.toFixed(0)}`,
        "out"
      );
      return;
    }
    if (sub === "score") {
      const s = scorePowerLaw(times, closes);
      if (!s) return ctx.print("not enough history to score", "err");
      ctx.print(
        `12-month forecasts, expanding-window refit, ${s.origins} origins ${s.from} → ${s.to}`,
        "info"
      );
      ctx.print(`  rmse (log10)  power law ${num(s.rmseModel, 3)} · random walk ${num(s.rmseRandomWalk, 3)}`, "out");
      ctx.print(`  power law closer on ${(s.winRate * 100).toFixed(0)}% of origins`, "out");
      ctx.print(
        `  Diebold–Mariano ${num(s.dm.stat, 2)} (p ${num(s.dm.p, 3)}) — negative favours the power law`,
        "out"
      );
      ctx.print(
        `  exponent drift: ${s.slopes.map((x) => `${x.date.slice(0, 4)} ${num(x.b, 2)}`).join(" · ")}`,
        "out"
      );
      const pass = s.dm.stat < 0 && s.dm.p < 0.05;
      ctx.print(
        pass
          ? "pass: beats the random walk at 12 months (still a trend anchor, not a law)"
          : "no significant edge over the random walk at 12 months",
        pass ? "info" : "err"
      );
      return;
    }
    ctx.print(`unknown: powerlaw ${sub} (try 'help powerlaw')`, "err");
  },
  complete: (preceding) => (preceding.length === 0 ? [...SWITCH, "score"] : []),
};

const usd = (x: number) =>
  x >= 1000 ? `${Math.round(x).toLocaleString("en-US")}` : x.toFixed(x >= 10 ? 0 : 2);

const cycles: Command = {
  name: "cycles",
  aliases: ["halving"],
  summary: "Halving cycles: tops, lows, overlay of past cycles, self-test (BTC)",
  usage:
    "cycles | cycles on|off | cycles align halving|low|off | cycles score | cycles miners [on|off] | cycles liquidity [on|off]",
  run: async (ctx) => {
    const [sub, arg] = ctx.args;
    const note =
      "on BTC 1D/1W: ▲ halvings · ▼ cycle tops · ▲ lows · shading rise → fall → base; the price axis switches to log while on";
    if (handleSwitch(ctx, "cycles", sub, note)) {
      if (sub !== "off") {
        const next = nextHalvingEstimate();
        ctx.print(
          `next halving: block ${next.height.toLocaleString("en-US")} ≈ ${isoDate(next.time).slice(0, 7)}, marked at the right edge of the chart`,
          "info"
        );
        if (ctx.config.symbol !== "btc") ctx.print("cycles are drawn on BTC only — try 'symbol btc'", "info");
      }
      return;
    }
    if (sub === "liquidity") {
      const pane = "pane: US M2 12-month growth (bars) · Fed net liquidity 52-week growth (line), % (1D/1W)";
      if (handleSwitch(ctx, "liquidity", arg, pane)) return;
      if (arg) return ctx.print("usage: cycles liquidity [on|off]", "err");
      return printLiquidity(ctx);
    }
    if (sub === "miners") {
      const pane = "pane: miner revenue ÷ its 365-day mean · ▼ hash-ribbon capitulation starts (BTC, 1D/1W)";
      if (handleSwitch(ctx, "miners", arg, pane)) return;
      if (arg) return ctx.print("usage: cycles miners [on|off]", "err");
      if (ctx.config.symbol !== "btc") return ctx.print("mining data is Bitcoin only — try 'symbol btc'", "err");
      return printMiners(ctx);
    }
    if (sub === "align") {
      if (arg !== "off" && !ALIGNS.includes(arg as Align)) {
        return ctx.print("usage: cycles align halving|low|off", "err");
      }
      ctx.config.setOverlays(arg === "off" ? { cyclesAlign: "off" } : { cycles: true, cyclesAlign: arg as Align });
      ctx.print(`cycles align → ${arg}`, "out");
      if (arg !== "off") {
        ctx.print(
          arg === "halving"
            ? "earlier cycles from their halving, scaled to halving 4's price and laid over the live cycle"
            : "earlier cycles from their bear-market low, scaled to the 2022 low and laid over the live cycle",
          "info"
        );
      }
      return;
    }
    if (sub && sub !== "score") return ctx.print(`unknown: cycles ${sub} (try 'help cycles')`, "err");
    if (ctx.config.symbol !== "btc") {
      return ctx.print("halving cycles are a BTC thing — try 'symbol btc'", "err");
    }
    const { times, closes } = await fetchClosedDaily("btc");
    const list = computeCycles(times, closes);
    if (!list.length) return ctx.print("not enough history", "err");
    if (sub === "score") return printCycleScore(ctx, times, closes, list);

    const done = list.filter((c) => c.complete);
    const now = cycleNow(times, closes, list);
    if (now) {
      const ahead = now.peers.filter((p) => now.sinceHalving > p.sinceHalving).map((p) => p.n);
      const behind = now.peers.filter((p) => now.sinceHalving <= p.sinceHalving).map((p) => p.n);
      const vs = [
        ahead.length ? `ahead of #${ahead.join(", #")}` : "",
        behind.length ? `behind #${behind.join(", #")}` : "",
      ].filter(Boolean).join(", ");
      ctx.print(
        `day ${now.day} of cycle ${now.cycle.n} · ${pct(now.sinceHalving, 0)} since the halving · ${pct(now.fromTop, 0)} from the high so far${vs ? ` · ${vs} at the same day` : ""}`,
        "out"
      );
      if (now.peers.length) {
        ctx.print(
          `  earlier cycles at day ${now.day}: ${now.peers.map((p) => `#${p.n} ${pct(p.sinceHalving, 0)}`).join(" · ")}`,
          "info"
        );
      }
    }

    // Fits the console's ~60 columns; +d = days since the previous column's date.
    ctx.print("  # halving    top          +d    ×  low         +d  drawdown", "info");
    for (const c of list) {
      const toTop = daysBetween(c.halving.time, c.top.time);
      const mult = `×${Math.round(c.top.price / c.halving.price)}`;
      const low =
        c.complete && c.low
          ? `${isoDate(c.low.time)} ${String(daysBetween(c.top.time, c.low.time)).padStart(4)}  ${pct(c.low.price / c.top.price - 1, 0)}`
          : "—";
      ctx.print(
        `  ${c.n} ${isoDate(c.halving.time)} ${isoDate(c.top.time)}${c.complete ? " " : "*"} ${String(toTop).padStart(4)} ${mult.padStart(4)}  ${low}`,
        "out"
      );
    }
    ctx.print(
      `  prices: ${list.map((c) => `#${c.n} ${usd(c.halving.price)} → ${usd(c.top.price)}`).join(" · ")}`,
      "out"
    );

    // Timing as a window, not a date.
    if (done.length && now) {
      const days = done.map((c) => daysBetween(c.halving.time, c.top.time));
      const lo = Math.min(...days);
      const hi = Math.max(...days);
      const h = now.cycle.halving.time;
      const topDay = daysBetween(h, now.cycle.top.time);
      ctx.print(
        `timing: halving → top took ${lo}–${hi} days → window for #${now.cycle.n} ${isoDate(h + lo * DAY)} … ${isoDate(h + hi * DAY)} · high so far on day ${topDay} (${topDay >= lo && topDay <= hi ? "inside" : "outside"})`,
        "out"
      );
    }

    // Diminishing returns: the honest forecast is "smaller again".
    const mults = list.map((c) => c.top.price / c.halving.price);
    const decay = mults.slice(1, done.length).map((m, i) => mults[i] / m);
    if (decay.length) {
      const g = Math.exp(decay.reduce((s, x) => s + Math.log(x), 0) / decay.length);
      const nextMult = mults[done.length - 1] / g;
      ctx.print(
        `returns: top multiple ${done.map((_, i) => `×${Math.round(mults[i])}`).join(" → ")} (each ÷${decay.map((x) => x.toFixed(1)).join(", ÷")}) · same decay → ~×${nextMult.toFixed(1)} for #${done.length + 1}${list.length > done.length ? `, high so far ×${mults[done.length].toFixed(1)}` : ""}`,
        "out"
      );
    }

    // Supply shock: why the halving should matter less each time.
    ctx.print(
      `supply shock (new coins/yr as % of supply, before → after): ${HALVINGS.map((h) => {
        const s = issuanceShock(h.height);
        return `#${h.n} ${(s.before * 100).toFixed(1)}→${(s.after * 100).toFixed(1)}%`;
      }).join(" · ")}`,
      "out"
    );

    const next = nextHalvingEstimate();
    const s = issuanceShock(next.height);
    ctx.print(
      `next halving: block ${next.height.toLocaleString("en-US")} ≈ ${isoDate(next.time).slice(0, 7)} (10-min blocks; usually a few weeks early) · ${(s.before * 100).toFixed(2)}→${(s.after * 100).toFixed(2)}%`,
      "out"
    );
    ctx.print(
      "* = high so far: the live cycle's top and low are only known in hindsight · 3 complete cycles is a tiny sample — see 'cycles score'",
      "info"
    );
  },
  complete: (preceding) => {
    if (preceding.length === 0) return [...SWITCH, "align", "score", "miners", "liquidity"];
    if (preceding[0] === "align" && preceding.length === 1) return [...ALIGNS, "off"];
    if ((preceding[0] === "miners" || preceding[0] === "liquidity") && preceding.length === 1)
      return ["on", "off"];
    return [];
  },
};

const LIQ_LAGS = [0, 1, 2, 3, 6, 9, 12];
const LIQ_SINCE = Date.UTC(2013, 0, 1) / 1000; // BTC is liquid enough to trade from here

async function printLiquidity(ctx: CommandContext) {
  ctx.print(
    "liquidity · FRED: US M2 · Fed net liquidity = balance sheet − TGA − reverse repo · stamped when published",
    "info"
  );
  const [m2, m2yoy, netliq, netliqyoy, daily] = await Promise.all([
    fetchSeries("m2", "btc"),
    fetchSeries("m2yoy", "btc"),
    fetchSeries("netliq", "btc"),
    fetchSeries("netliqyoy", "btc"),
    fetchClosedDaily("btc"),
  ]);
  if (!m2.length || !netliq.length) return ctx.print("no liquidity data", "err");
  const list = computeCycles(daily.times, daily.closes);
  const p1 = (x: number | null) => (x === null ? "—" : `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`);
  const at = (pts: typeof m2, t: number) => pointAt(pts, t);

  // Liquidity growth at the cycle's turning points.
  const head = ["halving", "top", "low"].map((h) => h.padStart(7)).join(" ");
  ctx.print(`  #   ${"M2, 12-month growth".padEnd(23)}  net liquidity, 52-week`, "info");
  ctx.print(`      ${head}  ${head}`, "info");
  for (const c of list) {
    const low = c.complete && c.low ? c.low.time : null;
    const cells = (pts: typeof m2) =>
      [c.halving.time, c.top.time, low].map((t) => (t === null ? "—" : p1(at(pts, t))).padStart(7)).join(" ");
    ctx.print(`  ${c.n}   ${cells(m2yoy)}  ${cells(netliqyoy)}${c.complete ? "" : " *"}`, "out");
  }

  // Lag correlations: BTC vs liquidity known `lag` months earlier.
  const btcM = monthly(daily.times.map((t, i) => ({ time: t, value: daily.closes[i] })));
  const m2M = monthly(m2);
  const nlM = monthly(netliq);
  const rows: [string, Map<number, number>, Map<number, number>][] = [
    ["12m M2, overlapping", logChange(btcM, 12), logChange(m2M, 12)],
    ["1m M2", logChange(btcM, 1), logChange(m2M, 1)],
    ["1m net liquidity", logChange(btcM, 1), logChange(nlM, 1)],
  ];
  ctx.print(
    `correlation with BTC's change, liquidity lagged by k months (since 2013)`,
    "info"
  );
  ctx.print(`  ${"k (months)".padEnd(20)}${LIQ_LAGS.map((k) => String(k).padStart(5)).join(" ")}`, "info");
  let best = { r: 0, k: 0, label: "", n: 0 };
  for (const [label, btc, liq] of rows) {
    const cells = LIQ_LAGS.map((k) => {
      const c = lagCorrelation(btc, liq, k, LIQ_SINCE);
      if (!label.startsWith("12m") && Math.abs(c.r) > Math.abs(best.r)) best = { r: c.r, k, label, n: c.n };
      return (Number.isFinite(c.r) ? c.r.toFixed(2) : "—").padStart(5);
    });
    ctx.print(`  ${label.padEnd(20)}${cells.join(" ")}`, "out");
  }
  const noise = best.n ? 2 / Math.sqrt(best.n) : NaN;
  ctx.print(
    `  monthly noise band ±${num(noise, 2)} (n≈${best.n}) · 12-month windows overlap, so that row shares trend and overstates`,
    "info"
  );
  const edge = Math.abs(best.r) > noise;
  ctx.print(
    edge
      ? `monthly: strongest ${best.label} at k=${best.k}, r ${num(best.r, 2)} — beyond noise, but one of ${LIQ_LAGS.length * 2} tries`
      : `monthly: no correlation beyond noise at any lag (best ${best.label} k=${best.k}, r ${num(best.r, 2)})`,
    edge ? "info" : "err"
  );

  const last = (p: typeof m2) => p[p.length - 1];
  ctx.print(
    `now: M2 ${p1(last(m2yoy).value)} yoy (data to ${isoDate(last(m2yoy).time - 56 * DAY).slice(0, 7)}) · net liquidity $${Math.round(last(netliq).value).toLocaleString("en-US")}bn, ${p1(last(netliqyoy).value)} over 52 weeks`,
    "out"
  );
  ctx.print(
    "US only: global liquidity (China, ECB, BoJ, FX) is not included · * = live cycle, top is the high so far",
    "info"
  );
}

async function printMiners(ctx: CommandContext) {
  ctx.print("miner economics · mempool.space daily mining history", "info");
  const [hashrate, revenue, hashprice, feeshare, daily] = await Promise.all([
    fetchSeries("hashrate", "btc"),
    fetchSeries("revenue", "btc"),
    fetchSeries("hashprice", "btc"),
    fetchSeries("feeshare", "btc"),
    fetchClosedDaily("btc"),
  ]);
  if (!hashprice.length) return ctx.print("no mining data", "err");
  const list = computeCycles(daily.times, daily.closes);
  const mult = revenueMultiple(revenue);
  const caps = capitulations(hashrate);

  // Halving shock to miners: revenue per unit of hashrate roughly halves
  // overnight unless price or fees make up for it.
  ctx.print("  # halving    hashprice $/PH/day  change  hashrate 30d  fees", "info");
  for (const h of HALVINGS) {
    const e = halvingEffect(h.time, { hashprice, hashrate, feeshare });
    const hp = (x: number | null) => (x === null ? "—" : x >= 100 ? x.toFixed(0) : x.toPrecision(3));
    const change = e.hashpriceBefore && e.hashpriceAfter ? pct(e.hashpriceAfter / e.hashpriceBefore - 1, 0) : "—";
    ctx.print(
      `  ${h.n} ${isoDate(h.time)} ${hp(e.hashpriceBefore).padStart(8)} → ${hp(e.hashpriceAfter).padEnd(8)} ${change.padStart(6)}  ${(e.hashrateChange === null ? "—" : pct(e.hashrateChange, 0)).padStart(12)}  ${e.feeShareAfter === null ? "—" : `${e.feeShareAfter.toFixed(1)}%`}`,
      "out"
    );
  }

  // Revenue multiple at each turning point.
  const at = (t: number) => pointAt(mult, t + DAY);
  const m = (x: number | null) => (x === null ? "—" : x.toFixed(2));
  ctx.print(
    `revenue multiple (÷ ${PUELL_WINDOW_DAYS}-day mean) at tops: ${list.map((c) => `#${c.n} ${m(at(c.top.time))}${c.complete ? "" : "*"}`).join(" · ")}`,
    "out"
  );
  const lows = list.filter((c) => c.complete && c.low);
  ctx.print(`  at lows: ${lows.map((c) => `#${c.n} ${m(at(c.low!.time))}`).join(" · ")}`, "out");

  // Did capitulations line up with the cycle lows?
  const near = lows.map((c) => {
    const lowT = c.low!.time;
    const dist = caps
      .map((k) => {
        const end = k.end ?? Date.now() / 1000;
        return lowT < k.start ? (k.start - lowT) / DAY : lowT > end ? (lowT - end) / DAY : 0;
      })
      .reduce((a, b) => Math.min(a, b), Infinity);
    return { n: c.n, dist: Math.round(dist) };
  });
  const from2014 = caps.filter((k) => k.start >= Date.UTC(2014, 0, 1) / 1000);
  ctx.print(
    `capitulations (30-day hashrate < 60-day, ≥ 7 days): ${from2014.length} since 2014 · nearest to each cycle low: ${near.map((x) => `#${x.n} ${x.dist === 0 ? "during" : `${x.dist}d away`}`).join(" · ")}`,
    "out"
  );
  for (const k of from2014.slice(-5)) {
    ctx.print(
      `  ${isoDate(k.start)} → ${k.end ? isoDate(k.end) : "ongoing"} · ${k.days}d · 30-day hashrate ${pct(k.hashDrop, 0)}`,
      "out"
    );
  }
  const capDays = from2014.reduce((s, k) => s + k.days, 0);
  ctx.print(
    `  base rate: ${((capDays / ((Date.now() / 1000 - Date.UTC(2014, 0, 1) / 1000) / DAY)) * 100).toFixed(0)}% of days since 2014 are in a capitulation — a match near a low is only meaningful above that`,
    "info"
  );

  // Now.
  const last = (p: typeof hashprice) => p[p.length - 1]?.value ?? NaN;
  const live = caps.find((k) => k.end === null);
  const yearAgo = pointAt(hashprice, hashprice[hashprice.length - 1].time - 365 * DAY);
  ctx.print(
    `now: hashprice $${last(hashprice).toFixed(1)}/PH/day (${yearAgo ? pct(last(hashprice) / yearAgo - 1, 0) : "—"} vs a year ago) · hashrate ${Math.round(last(hashrate))} EH/s · revenue multiple ${m(last(mult))} · fees ${last(feeshare).toFixed(1)}% · ${live ? `capitulation since ${isoDate(live.start)}` : "no capitulation"}`,
    "out"
  );
  ctx.print(
    "revenue multiple uses subsidy + fees (Puell uses subsidy alone) · * = live cycle's high so far · a handful of episodes: description, not a signal",
    "info"
  );
}

function printCycleScore(ctx: CommandContext, times: number[], closes: number[], list: ReturnType<typeof computeCycles>) {
  ctx.print(
    "cycle analogue vs random walk · 365-day log return, origin every 30 days, earlier cycles only",
    "info"
  );
  const variants: [Align, number, string][] = [
    ["halving", 0, "halving"],
    ["halving", -30, "halving −30d"],
    ["halving", 30, "halving +30d"],
    ["low", 0, "low"],
  ];
  ctx.print("  anchor        origins  rmse cyc   rmse rw  wins     DM      p", "info");
  const rows = variants.map(([a, shift, label]) => scoreCycles(times, closes, list, a, shift, label));
  for (const r of rows) {
    if (!r) continue;
    ctx.print(
      `  ${r.label.padEnd(13)} ${String(r.origins).padStart(7)}  ${num(r.rmseModel, 3).padStart(8)}  ${num(r.rmseRandomWalk, 3).padStart(8)}  ${(r.winRate * 100).toFixed(0).padStart(3)}%  ${num(r.dm.stat, 2).padStart(5)}  ${num(r.dm.p, 3).padStart(5)}`,
      "out"
    );
  }
  const base = rows[0];
  if (base) ctx.print(`  origins ${base.from} → ${base.to} (halving anchor)`, "info");
  const pass = rows.filter(Boolean).every((r) => r!.dm.stat < 0 && r!.dm.p < 0.05);
  const any = rows.some((r) => r && r.dm.stat < 0 && r.dm.p < 0.05);
  ctx.print(
    pass
      ? "pass: the analogue beats the random walk under every anchoring (still 3 cycles of evidence)"
      : any
        ? "fragile: beats the random walk under some anchorings only — the result depends on the choice"
        : "no significant edge over the random walk at 12 months",
    pass ? "info" : "err"
  );
  ctx.print(
    "low anchors are used only after the next halving confirms them (no hindsight) · DM: negative favours the cycle analogue",
    "info"
  );
}

const funding: Command = {
  name: "funding",
  summary: "Perpetual funding-rate pane (leverage / crash-risk gauge)",
  usage: "funding | funding on|off | funding score",
  run: async (ctx) => {
    const [sub] = ctx.args;
    if (handleSwitch(ctx, "funding", sub, "annualised %, Binance perpetual")) return;
    const events = annualiseFunding(await fetchSeries("funding", ctx.config.symbol));
    if (!events.length) return ctx.print("no funding data", "err");
    if (!sub) {
      const last = events[events.length - 1];
      const recent = events
        .filter((e) => e.time > last.time - 30 * DAY)
        .map((e) => e.value);
      const avg = recent.reduce((s, x) => s + x, 0) / recent.length;
      ctx.print(
        `funding: ${ctx.config.overlays.funding ? "on" : "off"} · latest ${last.value.toFixed(1)}%/yr · 30-day avg ${avg.toFixed(1)}%/yr`,
        "out"
      );
      return;
    }
    if (sub === "score") {
      const { times, closes } = await fetchClosedDaily(ctx.config.symbol);
      const rows = scoreFunding(times, closes, events);
      ctx.print(
        `top-decile funding days (vs all earlier days) → next ${FUNDING_FORWARD_DAYS} days`,
        "info"
      );
      ctx.print("  period         group   days   avg max drawdown   avg return", "info");
      let gapHolds = rows.length > 0;
      for (const r of rows) {
        for (const [name, g] of [["top 10%", r.top], ["rest", r.rest]] as const) {
          ctx.print(
            `  ${r.label.padEnd(13)}  ${name.padEnd(7)} ${String(g.n).padStart(5)}   ${pct(g.meanDrawdown).padStart(16)}   ${pct(g.meanReturn).padStart(10)}`,
            "out"
          );
        }
        if (!(r.top.n && r.top.meanDrawdown < r.rest.meanDrawdown)) gapHolds = false;
      }
      ctx.print(
        gapHolds
          ? "pass: high funding came before deeper drawdowns in both periods"
          : "fail: the drawdown gap does not hold in both periods",
        gapHolds ? "info" : "err"
      );
      return;
    }
    ctx.print(`unknown: funding ${sub} (try 'help funding')`, "err");
  },
  complete: (preceding) => (preceding.length === 0 ? [...SWITCH, "score"] : []),
};

const dvol: Command = {
  name: "dvol",
  summary: "Deribit implied-vol (DVOL) pane with realised vol (BTC)",
  usage: "dvol | dvol on|off | dvol score",
  run: async (ctx) => {
    const [sub] = ctx.args;
    if (handleSwitch(ctx, "dvol", sub, "bright line: DVOL · muted line: trailing 30-day realised vol")) return;
    const points = await fetchSeries("dvol", ctx.config.symbol);
    if (!points.length) return ctx.print("no DVOL data", "err");
    if (!sub) {
      const last = points[points.length - 1];
      ctx.print(
        `dvol: ${ctx.config.overlays.dvol ? "on" : "off"} · ${last.value.toFixed(1)} (30-day implied vol, %/yr) at the ${isoDate(last.time - DAY)} close`,
        "out"
      );
      return;
    }
    if (sub === "score") {
      const { times, closes } = await fetchClosedDaily(ctx.config.symbol);
      const s = scoreDvol(times, closes, (t) => valueAt(points, t + DAY));
      if (!s) return ctx.print("not enough overlapping history", "err");
      ctx.print(`DVOL vs the next ${DVOL_FORWARD_DAYS} days' realised vol, ${s.n} days`, "info");
      ctx.print(`  mean DVOL ${num(s.meanDvol, 1)} · mean realised ${num(s.meanRealised, 1)} · DVOL above realised ${(s.premiumShare * 100).toFixed(0)}% of days`, "out");
      ctx.print(`  realised = ${num(s.fit.intercept, 1)} + ${num(s.fit.slope, 2)} × DVOL (R² ${num(s.fit.r2, 2)})`, "out");
      ctx.print(`  rmse: DVOL ${num(s.rmseDvol, 1)} · naive trailing 30-day vol ${num(s.rmseTrailing, 1)}`, "out");
      const pass = s.rmseDvol < s.rmseTrailing;
      ctx.print(
        pass
          ? "pass: DVOL forecasts realised vol better than the naive baseline"
          : "fail: DVOL does not beat trailing realised vol",
        pass ? "info" : "err"
      );
      return;
    }
    ctx.print(`unknown: dvol ${sub} (try 'help dvol')`, "err");
  },
  complete: (preceding) => (preceding.length === 0 ? [...SWITCH, "score"] : []),
};

function metricsCells(m: Metrics): string {
  return `${pct(m.cagr, 0).padStart(6)} ${pct(m.maxDrawdown, 0).padStart(6)} ${num(m.sharpe, 2).padStart(6)}`;
}

const backtest: Command = {
  name: "backtest",
  aliases: ["bt"],
  summary: "Trend-filter backtest vs buy-and-hold (daily, long/flat)",
  usage: "backtest [ma [n] | tsmom [days]] [fee <bp>]",
  run: async (ctx) => {
    const args = [...ctx.args];
    let feeBp = DEFAULT_FEE_BP;
    const feeAt = args.indexOf("fee");
    if (feeAt >= 0) {
      feeBp = Number(args[feeAt + 1]);
      if (!Number.isFinite(feeBp) || feeBp < 0 || feeBp > 500) {
        return ctx.print("fee must be 0–500 basis points per side", "err");
      }
      args.splice(feeAt, 2);
    }
    // Accept "ma200" as well as "ma 200".
    const [rawKind = "ma", rawN] = args;
    const m = /^(ma|tsmom)(\d+)?$/.exec(rawKind);
    if (!m) return ctx.print(`unknown strategy: ${rawKind} (ma or tsmom)`, "err");
    const n = Number(m[2] ?? rawN ?? (m[1] === "ma" ? DEFAULT_MA_LENGTH : DEFAULT_TSMOM_LOOKBACK));
    if (!Number.isInteger(n) || n < 2 || n > 1000) {
      return ctx.print("length must be a whole number of days 2–1000", "err");
    }
    const strategy: Strategy =
      m[1] === "ma" ? { kind: "ma", length: n } : { kind: "tsmom", lookback: n };

    const { times, closes } = await fetchClosedDaily(ctx.config.symbol);
    const rows = runBacktest(times, closes, strategy, feeBp);
    if (!rows.length) return ctx.print("not enough history", "err");
    ctx.print(
      `${strategyLabel(strategy)} long/flat vs buy-and-hold · ${ctx.config.symbol.toUpperCase()} daily · ${feeBp} bp/side · signal at close t, held from t+1`,
      "info"
    );
    const cols = ["cagr", "maxdd", "sharpe"].map((h) => h.padStart(6)).join(" ");
    ctx.print(`  ${"".padEnd(20)}${"strategy".padEnd(20)} | ${"buy-and-hold".padEnd(20)} |`, "info");
    ctx.print(`  ${"window".padEnd(6)} ${"from".padEnd(10)}   ${cols} | ${cols} | in mkt trades`, "info");
    for (const r of rows) {
      ctx.print(
        `  ${r.label.padEnd(6)} ${isoDate(r.from)}   ${metricsCells(r.strategy)} | ${metricsCells(r.buyHold)} | ${(r.strategy.exposure * 100).toFixed(0).padStart(5)}% ${String(r.strategy.trades).padStart(6)}`,
        "out"
      );
    }
    ctx.print(
      "judge on max drawdown and Sharpe, not CAGR · USDT≈USD · no taxes, funding or slippage beyond the fee",
      "info"
    );
  },
  complete: (preceding) => {
    if (preceding.length === 0) return ["ma", "ma200", "tsmom", "tsmom365", "fee"];
    if (preceding[preceding.length - 1] === "fee") return ["0", "10", "25"];
    return preceding.includes("fee") ? [] : ["fee"];
  },
};

const config: Command = {
  name: "config",
  summary: "Show the current configuration",
  usage: "config [show]",
  run: (ctx) => {
    const sub = ctx.args[0] ?? "show";
    if (sub !== "show") return ctx.print(`unknown: config ${sub}`, "err");
    ctx.print("configuration:", "info");
    ctx.print(`  theme  = ${ctx.config.themeName}`, "out");
    ctx.print(`  symbol = ${ctx.config.symbol}`, "out");
    ctx.print(
      `  momentum = ${ctx.config.momentum ? "on" : "off"} (lookback ${ctx.config.momentumLookback})`,
      "out"
    );
    const o = ctx.config.overlays;
    ctx.print(
      `  cone     = ${o.cone ? "on" : "off"} (${o.coneModel}, ${o.coneHorizon} bars)`,
      "out"
    );
    ctx.print(`  powerlaw = ${o.powerlaw ? "on" : "off"}`, "out");
    ctx.print(
      `  cycles   = ${o.cycles ? "on" : "off"} (align ${o.cyclesAlign}, miners ${o.miners ? "on" : "off"}, liquidity ${o.liquidity ? "on" : "off"})`,
      "out"
    );
    ctx.print(`  funding  = ${o.funding ? "on" : "off"}`, "out");
    ctx.print(`  dvol     = ${o.dvol ? "on" : "off"}`, "out");
  },
  complete: (preceding) => (preceding.length === 0 ? ["show"] : []),
};

const clear: Command = {
  name: "clear",
  aliases: ["cls"],
  summary: "Clear the console",
  run: (ctx) => ctx.clear(),
};

const about: Command = {
  name: "about",
  summary: "About zencharts",
  run: (ctx) => {
    ctx.print("zencharts — zen-mode crypto/USD charts", "out");
    ctx.print(
      "instruments: BTC, ZEC · data: Binance + Bitstamp · DVOL: Deribit",
      "info"
    );
    ctx.print("this console configures the app — type 'help'", "info");
    ctx.print(
      "charts: TradingView Lightweight Charts™ — https://www.tradingview.com/",
      "info"
    );
  },
};

const finder: Command = {
  name: "finder",
  summary: "Open the low-cap token finder (/finder)",
  run: (ctx) => {
    ctx.print("opening /finder …", "info");
    if (typeof window !== "undefined") window.location.assign("/finder");
  },
};

const exit: Command = {
  name: "exit",
  aliases: ["close", "quit"],
  summary: "Close the console",
  run: (ctx) => {
    ctx.print("bye", "info");
    ctx.close();
  },
};

export const COMMANDS: Command[] = [
  help,
  theme,
  symbol,
  momentum,
  cone,
  powerlaw,
  cycles,
  funding,
  dvol,
  backtest,
  config,
  finder,
  clear,
  about,
  exit,
];

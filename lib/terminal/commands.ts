// The built-in command set. Add a command by appending to COMMANDS — the
// registry, help output, and Tab-completion pick it up automatically.

import type { Command } from "./types";

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
    ctx.print("instruments: BTC, ZEC · data: Binance + Bitstamp", "info");
    ctx.print("this console configures the app — type 'help'", "info");
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
  config,
  clear,
  about,
  exit,
];

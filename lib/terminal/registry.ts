// Parses a raw input line and dispatches to a command. The only entry point
// the UI needs; keeps parsing/dispatch out of the React layer.

import { COMMANDS } from "./commands";
import type { Command, ConfigApi, OutputKind } from "./types";

export { COMMANDS };

const byName = new Map<string, Command>();
for (const c of COMMANDS) {
  byName.set(c.name, c);
  for (const a of c.aliases ?? []) byName.set(a, c);
}

export function findCommand(name: string): Command | undefined {
  return byName.get(name);
}

// All invokable tokens (names + aliases), for Tab-completion.
export function commandNames(): string[] {
  return [...byName.keys()].sort();
}

export interface CompletionResult {
  items: string[]; // candidates for the current token, prefix-filtered
  token: string; // the in-progress token being completed
  usage?: string; // usage of the identified command, for a hint line
}

// Compute completions for a raw input line and cursor-at-end. Pure function of
// (input, config) so the UI can derive suggestions reactively.
export function getCompletions(
  input: string,
  config: ConfigApi
): CompletionResult {
  const trimmed = input.replace(/^\s+/, "");
  const endsWithSpace = /\s$/.test(input) && trimmed.length > 0;
  const tokens = trimmed.length ? trimmed.split(/\s+/) : [];

  let token: string;
  let preceding: string[];
  if (endsWithSpace) {
    token = "";
    preceding = tokens;
  } else {
    token = tokens[tokens.length - 1] ?? "";
    preceding = tokens.slice(0, -1);
  }

  let candidates: string[];
  let usage: string | undefined;
  if (preceding.length === 0) {
    candidates = commandNames();
  } else {
    const cmd = findCommand(preceding[0]);
    usage = cmd?.usage;
    candidates = cmd?.complete
      ? cmd.complete(preceding.slice(1), config, COMMANDS)
      : [];
  }

  const items = [...new Set(candidates)]
    .filter((c) => c.startsWith(token))
    .sort();

  return { items, token, usage };
}

export interface RunDeps {
  print: (text: string, kind?: OutputKind) => void;
  clear: () => void;
  close: () => void;
  config: ConfigApi;
}

export async function runCommand(raw: string, deps: RunDeps): Promise<void> {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return;
  const [name, ...args] = parts;
  const cmd = findCommand(name);
  if (!cmd) {
    deps.print(`command not found: ${name} (try 'help')`, "err");
    return;
  }
  try {
    await cmd.run({
      args,
      raw,
      print: deps.print,
      clear: deps.clear,
      close: deps.close,
      config: deps.config,
      commands: COMMANDS,
    });
  } catch (err) {
    deps.print(
      `error: ${err instanceof Error ? err.message : String(err)}`,
      "err"
    );
  }
}

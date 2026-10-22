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

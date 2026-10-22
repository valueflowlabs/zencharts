// Terminal command engine types. Deliberately free of any React/DOM imports so
// the command layer stays testable and the UI is just one possible host.

export type OutputKind = "input" | "out" | "info" | "err";

export interface OutputLine {
  id: number;
  kind: OutputKind;
  text: string;
}

// The slice of app configuration that commands are allowed to touch.
export interface ConfigApi {
  themeName: string;
  themes: { name: string; label: string }[];
  setTheme: (name: string) => boolean;
}

// Everything a command needs to do its job, injected by the host.
export interface CommandContext {
  args: string[];
  raw: string;
  print: (text: string, kind?: OutputKind) => void;
  clear: () => void;
  close: () => void;
  config: ConfigApi;
  commands: Command[];
}

export interface Command {
  name: string;
  aliases?: string[];
  summary: string;
  usage?: string;
  run: (ctx: CommandContext) => void | Promise<void>;
  // Candidate completions for the argument currently being typed. `preceding`
  // are the already-completed args (after the command name); the engine filters
  // the returned list by the in-progress token's prefix. `commands` is the full
  // registry (so e.g. `help` can complete command names).
  complete?: (
    preceding: string[],
    config: ConfigApi,
    commands: Command[]
  ) => string[];
}

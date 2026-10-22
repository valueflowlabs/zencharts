"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useConfig } from "@/lib/config/ConfigContext";
import { runCommand, commandNames } from "@/lib/terminal/registry";
import type { ConfigApi, OutputKind, OutputLine } from "@/lib/terminal/types";

const HISTORY_KEY = "zencharts.terminal.history";
const HISTORY_MAX = 100;
const PROMPT = "❯";

let lineId = 0;
const nextId = () => ++lineId;

const banner = (): OutputLine[] => [
  {
    id: nextId(),
    kind: "info",
    text: "zencharts console — type 'help', Esc to close",
  },
];

export default function Terminal() {
  const { themeName, themes, setTheme } = useConfig();

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<OutputLine[]>(banner);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const print = useCallback((text: string, kind: OutputKind = "out") => {
    setLines((prev) => [...prev, { id: nextId(), kind, text }]);
  }, []);
  const clear = useCallback(() => setLines([]), []);
  const close = useCallback(() => setOpen(false), []);

  const config: ConfigApi = useMemo(
    () => ({ themeName, themes, setTheme }),
    [themeName, themes, setTheme]
  );

  // Load persisted command history.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setHistory(saved.filter((s) => typeof s === "string"));
    } catch {
      /* ignore */
    }
  }, []);

  // Focus the input and keep the latest output in view.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  // Backtick toggles the console (Quake-style), unless typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "`" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(async () => {
    const raw = input.trim();
    setInput("");
    setHistIdx(null);
    if (!raw) return;
    print(`${PROMPT} ${raw}`, "input");
    setHistory((prev) => {
      const next = [...prev.filter((h) => h !== raw), raw].slice(-HISTORY_MAX);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    await runCommand(raw, { print, clear, close, config });
  }, [input, print, clear, close, config]);

  const navHistory = useCallback(
    (dir: -1 | 1) => {
      if (history.length === 0) return;
      const base = histIdx === null ? history.length : histIdx;
      const idx = Math.max(0, Math.min(history.length, base + dir));
      setHistIdx(idx);
      setInput(idx >= history.length ? "" : history[idx]);
    },
    [history, histIdx]
  );

  const complete = useCallback(() => {
    const parts = input.split(/\s+/);
    if (parts.length > 1) return; // only complete the command name
    const frag = parts[0] ?? "";
    if (!frag) return;
    const matches = commandNames().filter((n) => n.startsWith(frag));
    if (matches.length === 1) setInput(matches[0] + " ");
    else if (matches.length > 1) print(matches.join("  "), "info");
  }, [input, print]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        void submit();
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowUp":
        e.preventDefault();
        navHistory(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        navHistory(1);
        break;
      case "Tab":
        e.preventDefault();
        complete();
        break;
    }
  };

  return (
    <>
      <button
        className="term-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open configuration console"
        aria-expanded={open}
        title="Configuration console (`)"
      >
        {PROMPT}_
      </button>

      {open && (
        <div className="term-panel" role="dialog" aria-label="Configuration console">
          <div className="term-head">
            <span className="term-title">config console</span>
            <button
              className="term-x"
              onClick={() => setOpen(false)}
              aria-label="Close console"
            >
              ×
            </button>
          </div>

          <div className="term-output" ref={outputRef}>
            {lines.map((l) => (
              <div key={l.id} className={`term-line term-line--${l.kind}`}>
                {l.text}
              </div>
            ))}
          </div>

          <div className="term-input-row" onClick={() => inputRef.current?.focus()}>
            <span className="term-prompt">{PROMPT}</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="command input"
            />
          </div>
        </div>
      )}
    </>
  );
}

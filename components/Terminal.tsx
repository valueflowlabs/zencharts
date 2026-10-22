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
import { runCommand, getCompletions } from "@/lib/terminal/registry";
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
    text: "zencharts console — type 'help', Tab to complete, Esc to close",
  },
];

export default function Terminal() {
  const { themeName, themes, setTheme, symbol, symbols, setSymbol } =
    useConfig();

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<OutputLine[]>(banner);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);

  // Completion UI state.
  const [activeIdx, setActiveIdx] = useState(-1); // -1 = no explicit pick
  const [dismissed, setDismissed] = useState(false); // Esc hides until retype

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  const print = useCallback((text: string, kind: OutputKind = "out") => {
    setLines((prev) => [...prev, { id: nextId(), kind, text }]);
  }, []);
  const clear = useCallback(() => setLines([]), []);
  const close = useCallback(() => setOpen(false), []);

  const config: ConfigApi = useMemo(
    () => ({ themeName, themes, setTheme, symbol, symbols, setSymbol }),
    [themeName, themes, setTheme, symbol, symbols, setSymbol]
  );

  // Reactive completions for the current input.
  const completion = useMemo(
    () => getCompletions(input, config),
    [input, config]
  );
  const showSuggest =
    open && !dismissed && input.length > 0 && completion.items.length > 0;

  // Ghost suggestion = remainder of the active (or first) candidate.
  const ghostItem = showSuggest
    ? completion.items[activeIdx >= 0 ? activeIdx : 0]
    : undefined;
  const ghostRemainder =
    ghostItem &&
    ghostItem.startsWith(completion.token) &&
    ghostItem !== completion.token
      ? ghostItem.slice(completion.token.length)
      : "";

  // Load persisted command history.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved))
        setHistory(saved.filter((s) => typeof s === "string"));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);
  // Keep the highlighted suggestion visible.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

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

  const changeInput = (value: string) => {
    setInput(value);
    setActiveIdx(-1);
    setDismissed(false);
    setHistIdx(null);
  };

  // Replace the in-progress token with `item` and advance.
  const applyCompletion = useCallback(
    (item: string) => {
      const base = completion.token
        ? input.slice(0, input.length - completion.token.length)
        : input;
      setInput(base + item + " ");
      setActiveIdx(-1);
      setDismissed(false);
      setHistIdx(null); // completing starts a fresh line, not a history walk
      inputRef.current?.focus();
    },
    [completion.token, input]
  );

  const submit = useCallback(async () => {
    const raw = input.trim();
    setInput("");
    setHistIdx(null);
    setActiveIdx(-1);
    setDismissed(false);
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
      // Suppress the suggestion menu for the whole history walk so ↑/↓ keep
      // recalling (typing re-enables it via changeInput).
      setDismissed(true);
      setActiveIdx(-1);
    },
    [history, histIdx]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const items = completion.items;

    // When the suggestion menu is open, arrows/Tab drive it.
    if (showSuggest) {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          applyCompletion(items[activeIdx >= 0 ? activeIdx : 0]);
          return;
        case "ArrowDown":
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % items.length);
          return;
        case "ArrowUp":
          e.preventDefault();
          setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
          return;
        case "ArrowRight": {
          const atEnd =
            e.currentTarget.selectionStart === input.length &&
            e.currentTarget.selectionEnd === input.length;
          if (atEnd && ghostRemainder) {
            e.preventDefault();
            applyCompletion(ghostItem!);
            return;
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          setDismissed(true);
          return;
        case "Enter":
          if (activeIdx >= 0) {
            e.preventDefault();
            applyCompletion(items[activeIdx]);
            return;
          }
          break; // no explicit pick -> fall through to submit
      }
    }

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        void submit();
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        e.preventDefault();
        if (completion.items.length > 0) setDismissed(false); // re-open menu
        break;
      case "ArrowUp":
        e.preventDefault();
        navHistory(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        navHistory(1);
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

          <div className="term-foot">
            {showSuggest && (
              <ul className="term-suggest" role="listbox">
                {completion.items.map((item, i) => (
                  <li
                    key={item}
                    ref={i === activeIdx ? activeItemRef : null}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={`term-suggest-item${
                      i === activeIdx ? " is-active" : ""
                    }`}
                    // mousedown (not click) so the input keeps focus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyCompletion(item);
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {completion.usage && input.length > 0 && (
              <div className="term-hint">usage: {completion.usage}</div>
            )}

            <div
              className="term-input-row"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="term-prompt">{PROMPT}</span>
              <div className="term-input-wrap">
                <div className="term-ghost" aria-hidden="true">
                  <span className="term-ghost-typed">{input}</span>
                  {ghostRemainder}
                </div>
                <input
                  ref={inputRef}
                  className="term-input"
                  value={input}
                  onChange={(e) => changeInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  aria-label="command input"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

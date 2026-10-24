"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_THEME,
  STORAGE_KEY,
  THEMES,
  getTheme,
  themeList,
  themeToVars,
  type Theme,
} from "@/lib/themes";
import {
  DEFAULT_SYMBOL,
  instrumentList,
  isValidSymbol,
} from "@/lib/instruments";
import {
  DEFAULT_MOMENTUM_LOOKBACK,
  isValidLookback,
} from "@/lib/indicators/momentum";
import {
  DEFAULT_OVERLAYS,
  patchOverlays,
  readOverlays,
  type Overlays,
} from "@/lib/config/overlays";

// The app's configuration surface, shaped so new settings can be added here and
// exposed to the terminal without churn.
export interface ConfigValue {
  themeName: string;
  theme: Theme;
  themes: { name: string; label: string }[];
  setTheme: (name: string) => boolean; // false if the name is unknown
  symbol: string;
  symbols: { id: string; label: string }[];
  setSymbol: (id: string) => boolean; // false if the id is unknown
  momentum: boolean; // momentum histogram shown under the candles
  setMomentum: (on: boolean) => void;
  momentumLookback: number; // bars
  setMomentumLookback: (n: number) => boolean; // false if out of range
  overlays: Overlays; // forecasting overlays and panes
  setOverlays: (patch: Partial<Overlays>) => boolean; // false if invalid
}

const ConfigContext = createContext<ConfigValue | null>(null);

interface Saved {
  themeName: string;
  symbol: string;
  momentum: boolean;
  momentumLookback: number;
  overlays: Overlays;
}

function readSaved(): Saved {
  const fallback: Saved = {
    themeName: DEFAULT_THEME,
    symbol: DEFAULT_SYMBOL,
    momentum: false,
    momentumLookback: DEFAULT_MOMENTUM_LOOKBACK,
    overlays: DEFAULT_OVERLAYS,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      themeName: c?.themeName && THEMES[c.themeName] ? c.themeName : DEFAULT_THEME,
      symbol: c?.symbol && isValidSymbol(c.symbol) ? c.symbol : DEFAULT_SYMBOL,
      momentum: c?.momentum === true,
      momentumLookback: isValidLookback(c?.momentumLookback)
        ? c.momentumLookback
        : DEFAULT_MOMENTUM_LOOKBACK,
      overlays: readOverlays(c?.overlays),
    };
  } catch {
    return fallback;
  }
}

function applyThemeVars(theme: Theme) {
  const el = document.documentElement;
  const vars = themeToVars(theme);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  el.style.colorScheme = theme.scheme;
  el.setAttribute("data-theme", theme.name);
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from storage so first client render already matches the inline
  // boot script — no flash, no hydration mismatch (these aren't rendered).
  const [saved] = useState(readSaved);
  const [themeName, setThemeName] = useState<string>(saved.themeName);
  const [symbol, setSymbolState] = useState<string>(saved.symbol);
  const [momentum, setMomentum] = useState<boolean>(saved.momentum);
  const [momentumLookback, setLookbackState] = useState<number>(
    saved.momentumLookback
  );
  const [overlays, setOverlaysState] = useState<Overlays>(saved.overlays);

  const theme = getTheme(themeName);

  useEffect(() => {
    applyThemeVars(theme);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          themeName,
          symbol,
          momentum,
          momentumLookback,
          overlays,
        })
      );
    } catch {
      /* ignore quota/availability errors */
    }
  }, [themeName, theme, symbol, momentum, momentumLookback, overlays]);

  const setTheme = useCallback((name: string): boolean => {
    if (!THEMES[name]) return false;
    setThemeName(name);
    return true;
  }, []);

  const setSymbol = useCallback((id: string): boolean => {
    if (!isValidSymbol(id)) return false;
    setSymbolState(id);
    return true;
  }, []);

  const setMomentumLookback = useCallback((n: number): boolean => {
    if (!isValidLookback(n)) return false;
    setLookbackState(n);
    return true;
  }, []);

  const setOverlays = useCallback(
    (patch: Partial<Overlays>): boolean => {
      const next = patchOverlays(overlays, patch);
      if (!next) return false;
      setOverlaysState(next);
      return true;
    },
    [overlays]
  );

  const value = useMemo<ConfigValue>(
    () => ({
      themeName,
      theme,
      themes: themeList(),
      setTheme,
      symbol,
      symbols: instrumentList(),
      setSymbol,
      momentum,
      setMomentum,
      momentumLookback,
      setMomentumLookback,
      overlays,
      setOverlays,
    }),
    [
      themeName,
      theme,
      setTheme,
      symbol,
      setSymbol,
      momentum,
      momentumLookback,
      setMomentumLookback,
      overlays,
      setOverlays,
    ]
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): ConfigValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within a ConfigProvider");
  return ctx;
}

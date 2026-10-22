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
}

const ConfigContext = createContext<ConfigValue | null>(null);

function readSaved(): { themeName: string; symbol: string } {
  const fallback = { themeName: DEFAULT_THEME, symbol: DEFAULT_SYMBOL };
  if (typeof window === "undefined") return fallback;
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      themeName: c?.themeName && THEMES[c.themeName] ? c.themeName : DEFAULT_THEME,
      symbol: c?.symbol && isValidSymbol(c.symbol) ? c.symbol : DEFAULT_SYMBOL,
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
  const [{ themeName: initTheme, symbol: initSymbol }] = useState(readSaved);
  const [themeName, setThemeName] = useState<string>(initTheme);
  const [symbol, setSymbolState] = useState<string>(initSymbol);

  const theme = getTheme(themeName);

  useEffect(() => {
    applyThemeVars(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeName, symbol }));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [themeName, theme, symbol]);

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

  const value = useMemo<ConfigValue>(
    () => ({
      themeName,
      theme,
      themes: themeList(),
      setTheme,
      symbol,
      symbols: instrumentList(),
      setSymbol,
    }),
    [themeName, theme, setTheme, symbol, setSymbol]
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

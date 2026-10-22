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

// The app's configuration surface. Currently just the theme, but shaped so new
// settings can be added here and exposed to the terminal without churn.
export interface ConfigValue {
  themeName: string;
  theme: Theme;
  themes: { name: string; label: string }[];
  setTheme: (name: string) => boolean; // false if the name is unknown
}

const ConfigContext = createContext<ConfigValue | null>(null);

function readSavedThemeName(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (c?.themeName && THEMES[c.themeName]) return c.themeName;
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_THEME;
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
  // boot script — no flash, no hydration mismatch (themeName isn't rendered).
  const [themeName, setThemeName] = useState<string>(readSavedThemeName);

  const theme = getTheme(themeName);

  useEffect(() => {
    applyThemeVars(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeName }));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [themeName, theme]);

  const setTheme = useCallback((name: string): boolean => {
    if (!THEMES[name]) return false;
    setThemeName(name);
    return true;
  }, []);

  const value = useMemo<ConfigValue>(
    () => ({ themeName, theme, themes: themeList(), setTheme }),
    [themeName, theme, setTheme]
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

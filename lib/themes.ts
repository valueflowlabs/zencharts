// Theme definitions and the bootstrap used to apply a theme before paint.
// Plain module (no React) so it can be imported by both the client config
// provider and the server layout's inline boot script — one source of truth.

export type ColorScheme = "dark" | "light";

export interface Theme {
  name: string;
  label: string;
  scheme: ColorScheme;
  // Page chrome — surfaced to CSS as custom properties (see themeToVars).
  page: {
    background: string;
    text: string; // muted (axis labels, idle controls)
    textStrong: string; // readable (terminal output, prompts)
    panel: string; // translucent surfaces (tf bar, terminal)
    border: string;
    accent: string;
    accentText: string;
    danger: string;
  };
  // Chart — applied directly to lightweight-charts.
  chart: {
    background: string;
    text: string;
    grid: string;
    border: string;
    up: string;
    down: string;
  };
}

export const STORAGE_KEY = "zencharts.config";
export const DEFAULT_THEME = "zen-dark";

// Insertion order is the listing order in the console.
export const THEMES: Record<string, Theme> = {
  "zen-dark": {
    name: "zen-dark",
    label: "Zen Dark",
    scheme: "dark",
    page: {
      background: "#0a0a0a",
      text: "#5a5a5a",
      textStrong: "#cfcfcf",
      panel: "rgba(18,18,18,0.72)",
      border: "rgba(255,255,255,0.08)",
      accent: "#d9d9d9",
      accentText: "#0a0a0a",
      danger: "#ef5350",
    },
    chart: {
      background: "#0a0a0a",
      text: "#5a5a5a",
      grid: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.06)",
      up: "#26a69a",
      down: "#ef5350",
    },
  },
  "zen-light": {
    name: "zen-light",
    label: "Zen Light",
    scheme: "light",
    page: {
      background: "#f6f6f4",
      text: "#9a9a96",
      textStrong: "#222222",
      panel: "rgba(255,255,255,0.82)",
      border: "rgba(0,0,0,0.1)",
      accent: "#1a1a1a",
      accentText: "#f6f6f4",
      danger: "#d33a3a",
    },
    chart: {
      background: "#f6f6f4",
      text: "#9a9a96",
      grid: "rgba(0,0,0,0.05)",
      border: "rgba(0,0,0,0.1)",
      up: "#089981",
      down: "#f23645",
    },
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    scheme: "dark",
    page: {
      background: "#0b1021",
      text: "#5b6687",
      textStrong: "#c3cbe6",
      panel: "rgba(18,24,46,0.75)",
      border: "rgba(130,150,210,0.14)",
      accent: "#8aa0ff",
      accentText: "#0b1021",
      danger: "#ff5c7a",
    },
    chart: {
      background: "#0b1021",
      text: "#5b6687",
      grid: "rgba(130,150,210,0.06)",
      border: "rgba(130,150,210,0.14)",
      up: "#3fb6a0",
      down: "#ff5c7a",
    },
  },
  matrix: {
    name: "matrix",
    label: "Matrix",
    scheme: "dark",
    page: {
      background: "#000800",
      text: "#2f7f3f",
      textStrong: "#39ff88",
      panel: "rgba(0,16,0,0.78)",
      border: "rgba(0,255,120,0.16)",
      accent: "#00ff66",
      accentText: "#001200",
      danger: "#ff5555",
    },
    chart: {
      background: "#000800",
      text: "#2f7f3f",
      grid: "rgba(0,255,120,0.05)",
      border: "rgba(0,255,120,0.12)",
      up: "#00ff66",
      down: "#0aa64a",
    },
  },
  grey: {
    name: "grey",
    label: "Grey",
    scheme: "dark",
    page: {
      background: "#242426",
      text: "#8a8a8f",
      textStrong: "#e4e4e7",
      panel: "rgba(52,52,56,0.78)",
      border: "rgba(255,255,255,0.1)",
      accent: "#b4b4ba",
      accentText: "#242426",
      danger: "#e57373",
    },
    // Monochrome candles: a lighter grey for up, darker for down.
    chart: {
      background: "#242426",
      text: "#8a8a8f",
      grid: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.09)",
      up: "#d4d4d8",
      down: "#6b6b70",
    },
  },
};

export function getTheme(name: string): Theme {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
}

export function themeList(): { name: string; label: string }[] {
  return Object.values(THEMES).map((t) => ({ name: t.name, label: t.label }));
}

// Map a theme's page palette to the CSS custom properties the stylesheet uses.
export function themeToVars(theme: Theme): Record<string, string> {
  const p = theme.page;
  return {
    "--bg": p.background,
    "--fg": p.text,
    "--fg-strong": p.textStrong,
    "--panel": p.panel,
    "--border": p.border,
    "--accent": p.accent,
    "--accent-fg": p.accentText,
    "--danger": p.danger,
  };
}

// Self-contained IIFE injected at the top of <body>. Reads the saved theme and
// applies its CSS vars + color-scheme before first paint, so there is no flash.
export function themeBootScript(): string {
  const vars: Record<string, Record<string, string>> = {};
  const scheme: Record<string, string> = {};
  for (const name of Object.keys(THEMES)) {
    vars[name] = themeToVars(THEMES[name]);
    scheme[name] = THEMES[name].scheme;
  }
  return `(function(){try{var V=${JSON.stringify(vars)},S=${JSON.stringify(
    scheme
  )},D=${JSON.stringify(DEFAULT_THEME)},K=${JSON.stringify(
    STORAGE_KEY
  )};var n=D;try{var c=JSON.parse(localStorage.getItem(K)||'{}');if(c&&c.themeName&&V[c.themeName])n=c.themeName;}catch(e){}var v=V[n],el=document.documentElement;for(var k in v){el.style.setProperty(k,v[k]);}el.style.colorScheme=S[n];el.setAttribute('data-theme',n);}catch(e){}})();`;
}

"use client";

import { useEffect } from "react";

// `C` toggles chart-only mode: every floating control (timeframe bar,
// console button and panel) is hidden so only the chart remains. Press
// `C` again to bring them back. The flag lives on <html> as a data
// attribute, so CSS alone does the hiding and no component re-renders.
export default function ChartOnlyToggle() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        e.key.toLowerCase() !== "c" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat ||
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      const on = root.toggleAttribute("data-chart-only");
      // Don't leave focus on a control that just became invisible.
      if (on && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      root.removeAttribute("data-chart-only");
    };
  }, []);

  return null;
}

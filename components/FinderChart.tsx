"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type UTCTimestamp,
} from "lightweight-charts";
import type { OhlcvBar } from "@/lib/finder/sources";
import { fmtPrice } from "@/lib/finder/format";

// Compact 5-minute candle chart for the finder's detail panel.
export default function FinderChart({ candles }: { candles: OhlcvBar[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || candles.length === 0) return;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: v("--fg", "#5a5a5a"),
        fontFamily: v("--mono", "monospace"),
        fontSize: 10,
        attributionLogo: false, // credited in the page footer
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter: fmtPrice },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    });
    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles]);

  if (candles.length === 0) {
    return <div className="fd-chart fd-chart--empty">no candle data for this pool yet</div>;
  }
  return <div ref={ref} className="fd-chart" />;
}

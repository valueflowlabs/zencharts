"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type UTCTimestamp,
} from "lightweight-charts";
import type { OhlcvBar } from "@/lib/finder/sources";
import { fmtPrice } from "@/lib/finder/format";

// Compact 5-minute candle chart for the finder's detail panel.
//
// The server fetches candles, but GeckoTerminal's keyless limit is shared by
// every app on Vercel's egress IPs. When the server came back empty, the
// browser asks GeckoTerminal directly (CORS is open) on the viewer's own quota.
export default function FinderChart({
  candles: initial,
  network,
  pool,
}: {
  candles: OhlcvBar[];
  network: string;
  pool: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [candles, setCandles] = useState(initial);

  useEffect(() => {
    if (initial.length > 0 || !pool) return;
    let alive = true;
    fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pool}/ohlcv/minute?aggregate=5&limit=288&token=base`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const rows: number[][] = json?.data?.attributes?.ohlcv_list ?? [];
        if (!alive || rows.length === 0) return;
        setCandles(
          rows
            .map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }))
            .sort((a, b) => a.time - b.time)
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initial, network, pool]);

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

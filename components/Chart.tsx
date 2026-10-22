"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { TimeframeKey } from "@/lib/timeframes";
import type { Candle } from "@/lib/types";
import { useConfig } from "@/lib/config/ConfigContext";

// How often we refresh the latest candle so the chart feels "live",
// keyed by timeframe. Lower timeframes update more often.
const POLL_MS: Record<TimeframeKey, number> = {
  "15m": 5_000,
  "30m": 5_000,
  "1h": 10_000,
  "4h": 15_000,
  "1d": 30_000,
  "1w": 60_000,
};

type Status = "loading" | "ready" | "error";

async function fetchCandles(
  interval: TimeframeKey,
  limit: number | undefined,
  signal?: AbortSignal
): Promise<Candle[]> {
  // No `limit` -> full multi-source history; a `limit` -> fast recent fetch.
  const qs = limit === undefined ? "" : `&limit=${limit}`;
  const res = await fetch(`/api/candles?interval=${interval}${qs}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { candles: Candle[] };
  return data.candles;
}

export default function Chart({ timeframe }: { timeframe: TimeframeKey }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const { theme } = useConfig();
  // Keep the latest theme reachable from the mount-only effect without making
  // the chart re-create on every theme change (that is handled separately).
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Create the chart once, on mount (colored from the current theme).
  useEffect(() => {
    if (!containerRef.current) return;
    const c = themeRef.current.chart;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: c.background },
        textColor: c.text,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: c.border },
      timeScale: {
        borderColor: c.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Recolor the live chart whenever the theme changes.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const c = theme.chart;
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: c.background },
        textColor: c.text,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });
    series.applyOptions({
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
    });
  }, [theme]);

  // (Re)load data whenever the timeframe changes, then poll the last candle.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    setStatus("loading");

    fetchCandles(timeframe, undefined, controller.signal)
      .then((candles) => {
        if (cancelled) return;
        series.setData(
          candles.map((c) => ({ ...c, time: c.time as UTCTimestamp }))
        );
        chart.timeScale().fitContent();
        setStatus("ready");

        // Poll just the most recent candle and update/append it in place.
        pollTimer = setInterval(async () => {
          try {
            const latest = await fetchCandles(timeframe, 1);
            if (cancelled || latest.length === 0) return;
            const c = latest[latest.length - 1];
            series.update({ ...c, time: c.time as UTCTimestamp });
          } catch {
            /* transient network hiccup — ignore, next tick retries */
          }
        }, POLL_MS[timeframe]);
      })
      .catch((err) => {
        if (!cancelled && err?.name !== "AbortError") setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [timeframe]);

  return (
    <div className="chart-wrap">
      <div ref={containerRef} className="chart" />
      {status === "loading" && (
        <div className="chart-spinner" role="status" aria-label="Loading data" />
      )}
      {status === "error" && (
        <div className="chart-overlay">
          couldn’t reach market data — retrying on next switch
        </div>
      )}
    </div>
  );
}

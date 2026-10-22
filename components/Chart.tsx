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
  limit: number,
  signal?: AbortSignal
): Promise<Candle[]> {
  const res = await fetch(`/api/candles?interval=${interval}&limit=${limit}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { candles: Candle[] };
  return data.candles;
}

export default function Chart({ timeframe }: { timeframe: TimeframeKey }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Create the chart once, on mount.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#5a5a5a",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // (Re)load data whenever the timeframe changes, then poll the last candle.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    setStatus("loading");

    fetchCandles(timeframe, 1000, controller.signal)
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
      {status === "loading" && <div className="chart-overlay">loading…</div>}
      {status === "error" && (
        <div className="chart-overlay">
          couldn’t reach market data — retrying on next switch
        </div>
      )}
    </div>
  );
}

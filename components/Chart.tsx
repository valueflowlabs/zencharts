"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { momentumAt, momentumSeries } from "@/lib/indicators/momentum";

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

// Vertical split when the momentum pane is shown: candles on top, momentum
// histogram in the bottom ~20%.
const CANDLE_MARGINS = { top: 0.2, bottom: 0.1 }; // library default
const CANDLE_MARGINS_WITH_PANE = { top: 0.08, bottom: 0.26 };
const MOMENTUM_MARGINS = { top: 0.8, bottom: 0.02 };

// Translucent version of a #rrggbb color, so the pane stays quiet.
function soften(hex: string, alpha = "80"): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex + alpha : hex;
}

async function fetchCandles(
  symbol: string,
  interval: TimeframeKey,
  limit: number | undefined,
  signal?: AbortSignal
): Promise<Candle[]> {
  // No `limit` -> full multi-source history; a `limit` -> fast recent fetch.
  const qs = limit === undefined ? "" : `&limit=${limit}`;
  const res = await fetch(
    `/api/candles?symbol=${symbol}&interval=${interval}${qs}`,
    { signal }
  );
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as { candles: Candle[] };
  return data.candles;
}

export default function Chart({ timeframe }: { timeframe: TimeframeKey }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const momentumRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const { theme, symbol, momentum, momentumLookback } = useConfig();
  // Keep the latest theme reachable from the mount-only effect without making
  // the chart re-create on every theme change (that is handled separately).
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // Same for the momentum settings, read by the live poll.
  const momentumCfgRef = useRef({ on: momentum, lookback: momentumLookback });
  momentumCfgRef.current = { on: momentum, lookback: momentumLookback };

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
      // The price axis runs on into the momentum pane (v4 has no real panes);
      // blank the non-positive "prices" there instead of showing -10000.00.
      localization: {
        priceFormatter: (p: number) => (p > 0 ? p.toFixed(2) : ""),
      },
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

    const momentumSeriesApi = chart.addHistogramSeries({
      priceScaleId: "momentum",
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
        minMove: 0.01,
      },
    });
    chart.priceScale("momentum").applyOptions({ scaleMargins: MOMENTUM_MARGINS });

    chartRef.current = chart;
    seriesRef.current = series;
    momentumRef.current = momentumSeriesApi;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      momentumRef.current = null;
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

  // Redraw the momentum pane from the candles currently on the chart.
  const drawMomentum = useCallback(() => {
    const chart = chartRef.current;
    const mom = momentumRef.current;
    if (!chart || !mom) return;
    const { on, lookback } = momentumCfgRef.current;
    chart
      .priceScale("right")
      .applyOptions({
        scaleMargins: on ? CANDLE_MARGINS_WITH_PANE : CANDLE_MARGINS,
      });
    mom.applyOptions({ visible: on });
    if (!on) return mom.setData([]);
    const c = themeRef.current.chart;
    mom.setData(
      momentumSeries(candlesRef.current, lookback).map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
        color: soften(p.value >= 0 ? c.up : c.down),
      }))
    );
  }, []);

  useEffect(drawMomentum, [drawMomentum, momentum, momentumLookback, theme]);

  // (Re)load data whenever the instrument or timeframe changes, then poll the
  // last candle.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    setStatus("loading");
    candlesRef.current = [];
    drawMomentum();

    fetchCandles(symbol, timeframe, undefined, controller.signal)
      .then((candles) => {
        if (cancelled) return;
        series.setData(
          candles.map((c) => ({ ...c, time: c.time as UTCTimestamp }))
        );
        candlesRef.current = candles;
        drawMomentum();
        chart.timeScale().fitContent();
        setStatus("ready");

        // Poll just the most recent candle and update/append it in place.
        pollTimer = setInterval(async () => {
          try {
            const latest = await fetchCandles(symbol, timeframe, 1);
            if (cancelled || latest.length === 0) return;
            const c = latest[latest.length - 1];
            series.update({ ...c, time: c.time as UTCTimestamp });

            // Keep our copy in step (replace the live bar or append a new one)
            // and refresh the last momentum bar.
            const all = candlesRef.current;
            if (all.length && all[all.length - 1].time === c.time) {
              all[all.length - 1] = c;
            } else if (!all.length || c.time > all[all.length - 1].time) {
              all.push(c);
            }
            const { on, lookback } = momentumCfgRef.current;
            const p = on ? momentumAt(all, all.length - 1, lookback) : null;
            if (p && momentumRef.current) {
              const tc = themeRef.current.chart;
              momentumRef.current.update({
                time: p.time as UTCTimestamp,
                value: p.value,
                color: soften(p.value >= 0 ? tc.up : tc.down),
              });
            }
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
  }, [symbol, timeframe, drawMomentum]);

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

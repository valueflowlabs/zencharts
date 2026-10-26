"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { TimeframeKey } from "@/lib/timeframes";
import type { Candle } from "@/lib/types";
import { useConfig } from "@/lib/config/ConfigContext";
import { momentumAt, momentumSeries } from "@/lib/indicators/momentum";
import { buildCone } from "@/lib/indicators/cone";
import {
  CORRIDOR_QUANTILES,
  FUTURE_DAYS,
  fitPowerLaw,
  powerLawPrice,
} from "@/lib/indicators/powerlaw";
import {
  annualiseFunding,
  realisedVolSeries,
} from "@/lib/indicators/derivatives";
import { snapToBars, valueAt, type Point } from "@/lib/indicators/align";
import { fetchCandles, fetchSeries } from "@/lib/data";
import { BAR_SECONDS, DAY } from "@/lib/time";

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

// v4 has no real panes, so bottom panes are overlay price scales stacked with
// `scaleMargins`; the candles shrink to make room. Listed top to bottom.
type PaneId = "momentum" | "funding" | "dvol";
const PANE_ORDER: PaneId[] = ["momentum", "funding", "dvol"];
const CANDLE_MARGINS = { top: 0.2, bottom: 0.1 }; // library default
const PANE_HEIGHT = [0, 0.2, 0.17, 0.14]; // per pane, by number of panes shown

function paneLayout(shown: PaneId[]) {
  const n = shown.length;
  const h = PANE_HEIGHT[n] ?? 0.14;
  const panes = new Map<PaneId, { top: number; bottom: number }>();
  shown.forEach((id, i) => {
    panes.set(id, { top: 1 - (n - i) * h, bottom: (n - i - 1) * h + 0.02 });
  });
  return {
    candles: n ? { top: 0.08, bottom: n * h + 0.06 } : CANDLE_MARGINS,
    panes,
  };
}

// Translucent version of a #rrggbb color, so the pane stays quiet.
function soften(hex: string, alpha = "80"): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex + alpha : hex;
}

const asTime = (t: number) => t as UTCTimestamp;
const toLine = (pts: Point[]) =>
  pts.map((p) => ({ time: asTime(p.time), value: p.value }));

// Thin, quiet line for overlays: no price label, no crosshair dot.
const QUIET_LINE = {
  lineWidth: 1,
  lastValueVisible: false,
  priceLineVisible: false,
  crosshairMarkerVisible: false,
} as const;

interface ExternalData {
  symbol: string;
  funding?: Point[]; // annualised %
  dvol?: Point[];
}

export default function Chart({ timeframe }: { timeframe: TimeframeKey }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const momentumRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const fundingRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const dvolRef = useRef<ISeriesApi<"Line"> | null>(null);
  const realisedRef = useRef<ISeriesApi<"Line"> | null>(null);
  // Cone: centre, 80% upper/lower, 95% upper/lower.
  const coneRefs = useRef<ISeriesApi<"Line">[]>([]);
  // Power law: one line per CORRIDOR_QUANTILES entry.
  const powerLawRefs = useRef<ISeriesApi<"Line">[]>([]);
  const candlesRef = useRef<Candle[]>([]);
  const externalRef = useRef<ExternalData>({ symbol: "" });
  const [externalVersion, setExternalVersion] = useState(0);
  const [status, setStatus] = useState<Status>("loading");

  const { theme, symbol, momentum, momentumLookback, overlays } = useConfig();
  // Keep the latest settings reachable from the mount-only effect and the live
  // poll without re-creating the chart (theme changes are handled separately).
  const settingsRef = useRef({ theme, symbol, momentum, momentumLookback, overlays, timeframe });
  settingsRef.current = { theme, symbol, momentum, momentumLookback, overlays, timeframe };

  // Create the chart once, on mount (colored from the current theme).
  useEffect(() => {
    if (!containerRef.current) return;
    const c = settingsRef.current.theme.chart;

    // TradingView Lightweight Charts™
    // Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/
    // The on-chart logo is off; the required link to tradingview.com lives in
    // the console's `about` command instead.
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        attributionLogo: false,
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
      // The price axis runs on into the bottom panes (v4 has no real panes);
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

    const pane = (id: PaneId, formatter: (v: number) => string) => ({
      priceScaleId: id,
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: "custom" as const, formatter, minMove: 0.01 },
    });
    const signedPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

    momentumRef.current = chart.addHistogramSeries(pane("momentum", signedPct));
    fundingRef.current = chart.addHistogramSeries(pane("funding", signedPct));
    const volFormat = (v: number) => v.toFixed(1);
    realisedRef.current = chart.addLineSeries({
      ...pane("dvol", volFormat),
      ...QUIET_LINE,
    });
    dvolRef.current = chart.addLineSeries({
      ...pane("dvol", volFormat),
      lineWidth: 1,
      crosshairMarkerVisible: false,
    });

    // Overlays share the candles' price scale so they line up with price.
    coneRefs.current = Array.from({ length: 5 }, () =>
      chart.addLineSeries({ ...QUIET_LINE, visible: false })
    );
    powerLawRefs.current = CORRIDOR_QUANTILES.map(() =>
      chart.addLineSeries({ ...QUIET_LINE, visible: false })
    );

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      momentumRef.current = null;
      fundingRef.current = null;
      dvolRef.current = null;
      realisedRef.current = null;
      coneRefs.current = [];
      powerLawRefs.current = [];
    };
  }, []);

  // End jumps to the latest bar (current price), keeping the zoom level,
  // unless typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target;
      if (
        e.key !== "End" ||
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      chartRef.current?.timeScale().scrollToRealTime();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  // Bottom panes: layout, then momentum, funding and DVOL from current data.
  const drawPanes = useCallback(() => {
    const chart = chartRef.current;
    const mom = momentumRef.current;
    const fund = fundingRef.current;
    const dvol = dvolRef.current;
    const realised = realisedRef.current;
    if (!chart || !mom || !fund || !dvol || !realised) return;
    const s = settingsRef.current;
    const c = s.theme.chart;
    const candles = candlesRef.current;
    const ext = externalRef.current.symbol === s.symbol ? externalRef.current : null;
    const barTimes = candles.map((k) => k.time);

    const want: Record<PaneId, boolean> = {
      momentum: s.momentum,
      funding: s.overlays.funding && !!ext?.funding,
      dvol: s.overlays.dvol && !!ext?.dvol,
    };
    const layout = paneLayout(PANE_ORDER.filter((id) => want[id]));
    chart.priceScale("right").applyOptions({ scaleMargins: layout.candles });
    for (const [id, margins] of layout.panes) {
      chart.priceScale(id).applyOptions({ scaleMargins: margins });
    }

    mom.applyOptions({ visible: want.momentum });
    mom.setData(
      want.momentum
        ? momentumSeries(candles, s.momentumLookback).map((p) => ({
            time: asTime(p.time),
            value: p.value,
            color: soften(p.value >= 0 ? c.up : c.down),
          }))
        : []
    );

    fund.applyOptions({ visible: want.funding });
    fund.setData(
      want.funding && ext?.funding
        ? snapToBars(ext.funding, barTimes, s.timeframe, "mean").map((p) => ({
            time: asTime(p.time),
            value: p.value,
            color: soften(p.value >= 0 ? c.up : c.down),
          }))
        : []
    );

    dvol.applyOptions({ visible: want.dvol, color: s.theme.page.accent });
    realised.applyOptions({ visible: want.dvol, color: soften(c.text, "cc") });
    if (want.dvol && ext?.dvol) {
      dvol.setData(toLine(snapToBars(ext.dvol, barTimes, s.timeframe, "last")));
      realised.setData(
        toLine(
          realisedVolSeries(
            barTimes,
            candles.map((k) => k.close),
            BAR_SECONDS[s.timeframe]
          )
        )
      );
    } else {
      dvol.setData([]);
      realised.setData([]);
    }
  }, []);

  // Overlays on the price scale: volatility cone and power-law corridor.
  const drawForecasts = useCallback(() => {
    const chart = chartRef.current;
    const coneLines = coneRefs.current;
    const plLines = powerLawRefs.current;
    if (!chart || coneLines.length !== 5 || !plLines.length) return;
    const s = settingsRef.current;
    const accent = s.theme.page.accent;
    const candles = candlesRef.current;
    const ext = externalRef.current.symbol === s.symbol ? externalRef.current : null;
    const barSeconds = BAR_SECONDS[s.timeframe];
    const last = candles[candles.length - 1];

    // Cone: σ from closed bars only; anchored at the live bar's current price.
    const cone =
      s.overlays.cone && last
        ? buildCone({
            closes: candles.slice(0, -1).map((k) => k.close),
            anchorTime: last.time,
            anchorPrice: last.close,
            barSeconds,
            horizon: s.overlays.coneHorizon,
            model: s.overlays.coneModel,
            dvol: ext?.dvol ? valueAt(ext.dvol, Date.now() / 1000) : undefined,
          })
        : null;
    const coneData = cone
      ? [
          cone.centre,
          cone.bands[0].upper,
          cone.bands[0].lower,
          cone.bands[1].upper,
          cone.bands[1].lower,
        ]
      : [];
    const coneStyle = [
      { color: soften(accent, "66"), lineStyle: LineStyle.Dotted },
      { color: soften(accent, "aa"), lineStyle: LineStyle.Dashed },
      { color: soften(accent, "aa"), lineStyle: LineStyle.Dashed },
      { color: soften(accent, "55"), lineStyle: LineStyle.Dashed },
      { color: soften(accent, "55"), lineStyle: LineStyle.Dashed },
    ];
    coneLines.forEach((line, i) => {
      line.applyOptions({ visible: !!cone, ...coneStyle[i] });
      line.setData(cone ? toLine(coneData[i]) : []);
    });

    // Power law: BTC on daily/weekly only. Fitted to the chart's closed bars,
    // then extended FUTURE_DAYS past the last bar.
    const plAllowed =
      s.overlays.powerlaw &&
      s.symbol === "btc" &&
      (s.timeframe === "1d" || s.timeframe === "1w");
    const closed = candles.slice(0, -1);
    const fit = plAllowed
      ? fitPowerLaw(
          closed.map((k) => k.time),
          closed.map((k) => k.close)
        )
      : null;
    const times = candles.map((k) => k.time);
    if (fit && last) {
      for (let t = last.time + barSeconds; t <= last.time + FUTURE_DAYS * DAY; t += barSeconds) {
        times.push(t);
      }
    }
    const plStyle = [
      { color: soften(accent, "55"), lineStyle: LineStyle.Dashed },
      { color: soften(accent, "88"), lineStyle: LineStyle.Solid },
      { color: soften(accent, "55"), lineStyle: LineStyle.Dashed },
    ];
    plLines.forEach((line, i) => {
      line.applyOptions({ visible: !!fit, ...plStyle[i] });
      line.setData(
        fit
          ? times.map((t) => ({ time: asTime(t), value: powerLawPrice(fit, t, i) }))
          : []
      );
    });

    // A power law is a straight line only on a log axis.
    chart.priceScale("right").applyOptions({
      mode: fit ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, []);

  const redraw = useCallback(() => {
    drawPanes();
    drawForecasts();
  }, [drawPanes, drawForecasts]);

  useEffect(redraw, [
    redraw,
    momentum,
    momentumLookback,
    overlays,
    theme,
    externalVersion,
  ]);

  // Fetch the external series the enabled overlays need, once per symbol.
  const needFunding = overlays.funding;
  const needDvol = overlays.dvol || (overlays.cone && overlays.coneModel === "dvol");
  useEffect(() => {
    if (externalRef.current.symbol !== symbol) {
      externalRef.current = { symbol };
      setExternalVersion((v) => v + 1);
    }
    const ext = externalRef.current;
    const controller = new AbortController();
    const load = async (key: "funding" | "dvol") => {
      try {
        const raw = await fetchSeries(key, symbol, controller.signal);
        if (externalRef.current !== ext) return;
        ext[key] = key === "funding" ? annualiseFunding(raw) : raw;
        setExternalVersion((v) => v + 1);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn(`zencharts: ${key} unavailable — ${(err as Error).message}`);
        }
      }
    };
    if (needFunding && !ext.funding) load("funding");
    if (needDvol && !ext.dvol) load("dvol");
    return () => controller.abort();
  }, [symbol, needFunding, needDvol]);

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
    redraw();

    fetchCandles(symbol, timeframe, undefined, controller.signal)
      .then((candles) => {
        if (cancelled) return;
        series.setData(candles.map((c) => ({ ...c, time: asTime(c.time) })));
        candlesRef.current = candles;
        redraw();
        chart.timeScale().fitContent();
        setStatus("ready");

        // Poll just the most recent candle and update/append it in place.
        pollTimer = setInterval(async () => {
          try {
            const latest = await fetchCandles(symbol, timeframe, 1);
            if (cancelled || latest.length === 0) return;
            const c = latest[latest.length - 1];
            series.update({ ...c, time: asTime(c.time) });

            // Keep our copy in step (replace the live bar or append a new one).
            const all = candlesRef.current;
            if (all.length && all[all.length - 1].time === c.time) {
              all[all.length - 1] = c;
            } else if (!all.length || c.time > all[all.length - 1].time) {
              all.push(c);
              // A bar closed: refit the forecasts and panes once, not per tick.
              redraw();
              return;
            }
            const { momentum: on, momentumLookback: lookback, theme: t } =
              settingsRef.current;
            const p = on ? momentumAt(all, all.length - 1, lookback) : null;
            if (p && momentumRef.current) {
              momentumRef.current.update({
                time: asTime(p.time),
                value: p.value,
                color: soften(p.value >= 0 ? t.chart.up : t.chart.down),
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
  }, [symbol, timeframe, redraw]);

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

import { NextResponse } from "next/server";
import { isValidTimeframe } from "@/lib/timeframes";
import type { Candle } from "@/lib/types";

// Public Binance market-data host: free, no API key, no geo restrictions,
// read-only. We proxy it server-side so the browser never hits a cross-origin
// API and we can normalize the payload into our own compact Candle shape.
const BINANCE_HOST = "https://data-api.binance.vision";
const SYMBOL = "BTCUSDT"; // BTC/USDT — the most liquid proxy for BTC/USD.
const MAX_LIMIT = 1000;

export const dynamic = "force-dynamic"; // always fetch fresh market data

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "500");

  if (!isValidTimeframe(interval)) {
    return NextResponse.json(
      { error: `Unsupported interval: "${interval}"` },
      { status: 400 }
    );
  }

  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) ? limitParam : 500, 1),
    MAX_LIMIT
  );

  const url = `${BINANCE_HOST}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error (${res.status})` },
        { status: 502 }
      );
    }

    // Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]
    const raw = (await res.json()) as unknown[][];

    const candles: Candle[] = raw.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000), // ms -> s
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    }));

    return NextResponse.json({ symbol: SYMBOL, interval, candles });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach market-data provider" },
      { status: 502 }
    );
  }
}

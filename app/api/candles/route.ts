import { NextResponse } from "next/server";
import { isValidTimeframe } from "@/lib/timeframes";
import { getHistory, getRecent } from "@/lib/sources";
import { DEFAULT_SYMBOL, getInstrument, isValidSymbol } from "@/lib/instruments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // in-memory cache + pagination need Node

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") ?? "";
  const symbolParam = searchParams.get("symbol") ?? DEFAULT_SYMBOL;
  const limitParam = searchParams.get("limit");

  if (!isValidTimeframe(interval)) {
    return NextResponse.json(
      { error: `Unsupported interval: "${interval}"` },
      { status: 400 }
    );
  }
  if (!isValidSymbol(symbolParam)) {
    return NextResponse.json(
      { error: `Unsupported symbol: "${symbolParam}"` },
      { status: 400 }
    );
  }

  const label = getInstrument(symbolParam).label;

  try {
    // `limit` present -> fast recent fetch (used by the client's live poll).
    // `limit` absent  -> full multi-source history.
    if (limitParam !== null) {
      const limit = Math.min(Math.max(Number(limitParam) || 1, 1), 1000);
      const candles = await getRecent(symbolParam, interval, limit);
      return NextResponse.json({ symbol: label, interval, candles });
    }

    const candles = await getHistory(symbolParam, interval);
    return NextResponse.json({ symbol: label, interval, candles });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach market-data provider" },
      { status: 502 }
    );
  }
}

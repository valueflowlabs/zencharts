import { NextResponse } from "next/server";
import { isValidTimeframe } from "@/lib/timeframes";
import { getHistory, getRecent } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // in-memory cache + pagination need Node

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") ?? "";
  const limitParam = searchParams.get("limit");

  if (!isValidTimeframe(interval)) {
    return NextResponse.json(
      { error: `Unsupported interval: "${interval}"` },
      { status: 400 }
    );
  }

  try {
    // `limit` present -> fast recent fetch (used by the client's live poll).
    // `limit` absent  -> full multi-source history.
    if (limitParam !== null) {
      const limit = Math.min(Math.max(Number(limitParam) || 1, 1), 1000);
      const candles = await getRecent(interval, limit);
      return NextResponse.json({ symbol: "BTCUSD", interval, candles });
    }

    const candles = await getHistory(interval);
    return NextResponse.json({ symbol: "BTCUSD", interval, candles });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach market-data provider" },
      { status: 502 }
    );
  }
}

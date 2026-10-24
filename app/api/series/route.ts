import { NextResponse } from "next/server";
import { DEFAULT_SYMBOL, isValidSymbol } from "@/lib/instruments";
import { SeriesUnavailable, getSeries, isValidSeriesId } from "@/lib/series";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // in-memory cache + pagination need Node

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const symbol = searchParams.get("symbol") ?? DEFAULT_SYMBOL;

  if (!isValidSeriesId(id)) {
    return NextResponse.json(
      { error: `Unsupported series: "${id}"` },
      { status: 400 }
    );
  }
  if (!isValidSymbol(symbol)) {
    return NextResponse.json(
      { error: `Unsupported symbol: "${symbol}"` },
      { status: 400 }
    );
  }

  try {
    const points = await getSeries(id, symbol);
    return NextResponse.json({ id, symbol, points });
  } catch (err) {
    if (err instanceof SeriesUnavailable) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to reach market-data provider" },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { parseScanParams } from "@/lib/finder/types";
import { analyzeToken, isValidAddress } from "@/lib/finder/scan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/finder/token?chain=solana&address=<mint|0x…>
// Full check for one token (security on demand, sell simulation, 5m candles).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const params = parseScanParams(q);
  const address = (q.get("address") ?? "").trim();
  if (!params) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }
  if (!isValidAddress(params.chain, address)) {
    return NextResponse.json(
      { error: `Not a valid ${params.chain} token address` },
      { status: 400 }
    );
  }
  try {
    const report = await analyzeToken(params.chain, address, params);
    if (!report) {
      return NextResponse.json(
        { error: "No DEX pool found for this token" },
        { status: 404 }
      );
    }
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach on-chain data providers" },
      { status: 502 }
    );
  }
}

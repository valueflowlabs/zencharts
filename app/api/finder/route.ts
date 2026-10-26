import { NextResponse } from "next/server";
import { parseScanParams } from "@/lib/finder/types";
import { scan } from "@/lib/finder/scan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // in-memory caches live in the Node process

// GET /api/finder?chain=solana&minLiq=10000&maxMcap=5000000
export async function GET(request: Request) {
  const params = parseScanParams(new URL(request.url).searchParams);
  if (!params) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }
  try {
    return NextResponse.json(await scan(params));
  } catch {
    return NextResponse.json(
      { error: "Failed to reach on-chain data providers" },
      { status: 502 }
    );
  }
}

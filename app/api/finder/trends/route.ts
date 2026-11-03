import { NextResponse } from "next/server";
import { trends } from "@/lib/finder/trends";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/finder/trends
// On-chain narratives, search and mainstream attention, Bitcoin research and
// news. The same for every viewer; cached server-side for a few minutes.
export async function GET() {
  try {
    return NextResponse.json(await trends());
  } catch {
    return NextResponse.json(
      { error: "Failed to reach trend data providers" },
      { status: 502 }
    );
  }
}

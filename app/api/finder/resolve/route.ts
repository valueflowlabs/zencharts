import { NextResponse } from "next/server";
import { isChainId } from "@/lib/finder/types";
import { isValidAddress } from "@/lib/finder/scan";
import { dsPair } from "@/lib/finder/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/finder/resolve?chain=robinhood&id=<pair id | token address>
// Turns the id from a DexScreener link into the token address the finder
// checks. Pair links (including 32-byte v4 pool ids) resolve to the pair's
// base token; an id that is not a pair is taken as a token address.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const chain = q.get("chain") ?? "";
  const id = (q.get("id") ?? "").trim();
  if (!isChainId(chain)) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }
  if (!/^[0-9A-Za-z]{32,66}$/.test(id)) {
    return NextResponse.json({ error: "Not a valid pair or token id" }, { status: 400 });
  }
  const pair = await dsPair(chain, id);
  const address: string | undefined = pair?.baseToken?.address;
  if (address && isValidAddress(chain, address)) {
    return NextResponse.json({ chain, address });
  }
  if (isValidAddress(chain, id)) {
    return NextResponse.json({ chain, address: id });
  }
  return NextResponse.json({ error: "No DexScreener pair found for this link" }, { status: 404 });
}

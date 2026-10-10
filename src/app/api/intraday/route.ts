import { NextRequest, NextResponse } from "next/server";
import { getStockIntraday } from "@/lib/server/dnse";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 60);

  if (!symbols.length) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  const data = await getStockIntraday(symbols);
  return NextResponse.json(data, {
    // Intraday 5-min bars change slowly; let the CDN absorb bursts.
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
  });
}

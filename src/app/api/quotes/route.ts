import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/server/vndirect";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  if (!symbols.length) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  const data = await getSnapshots(symbols);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=3" },
  });
}

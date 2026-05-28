import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/server/cafef";

export const runtime = "nodejs";
export const revalidate = 20;

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  if (!symbols.length) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  const data = await getSnapshots(symbols);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=10" },
  });
}

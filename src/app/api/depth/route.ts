import { NextRequest, NextResponse } from "next/server";
import { getDepth } from "@/lib/server/cafef";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 60);

  if (!symbols.length) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  const data = await getDepth(symbols);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
  });
}

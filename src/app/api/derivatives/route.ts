import { NextResponse } from "next/server";
import { getDerivativeQuotes } from "@/lib/server/dnse";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDerivativeQuotes();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=1" },
  });
}

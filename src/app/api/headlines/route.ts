import { NextResponse } from "next/server";
import { getHeadlines } from "@/lib/server/rss";

export const runtime = "nodejs";
export const revalidate = 3600; // hourly

// Domestic news now comes solely from the Cafef/Vietstock/Vietnambiz stock
// feeds (served by /api/news). This endpoint is kept for the panel's second
// bucket but no longer mixes in VnExpress/FireAnt.
export async function GET() {
  const data = await getHeadlines(60);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}

import { NextResponse } from "next/server";
import { getLiveFeed } from "@/lib/server/rss";

export const runtime = "nodejs";
export const revalidate = 3600; // hourly

export async function GET() {
  const data = await getLiveFeed(40);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}

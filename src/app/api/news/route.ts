import { NextResponse } from "next/server";
import { getLiveFeed } from "@/lib/server/rss";

export const runtime = "nodejs";
export const revalidate = 90;

export async function GET() {
  const data = await getLiveFeed(40);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=90, stale-while-revalidate=30" },
  });
}

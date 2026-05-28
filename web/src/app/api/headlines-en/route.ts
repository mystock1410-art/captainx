import { NextResponse } from "next/server";
import { getHeadlinesEn } from "@/lib/server/rss";
import { translateItems } from "@/lib/server/translate";

export const runtime = "nodejs";
export const revalidate = 180;

export async function GET() {
  const items = await getHeadlinesEn(40);
  const translated = await translateItems(items);
  return NextResponse.json(translated, {
    headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60" },
  });
}

import { NextResponse } from "next/server";
import { getHeadlines } from "@/lib/server/rss";
import { getPosts } from "@/lib/server/fireant";

export const runtime = "nodejs";
export const revalidate = 90;

export async function GET() {
  const [rssItems, faItems] = await Promise.all([
    getHeadlines(40),
    getPosts(30),
  ]);
  const merged = [...rssItems, ...faItems];
  merged.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  return NextResponse.json(merged.slice(0, 60), {
    headers: { "Cache-Control": "public, s-maxage=90, stale-while-revalidate=30" },
  });
}

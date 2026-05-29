import { NextRequest, NextResponse } from "next/server";
import { getSnapshot, getSnapshots } from "@/lib/server/cafef";
import { getLiveFeed, getLiveFeedEn } from "@/lib/server/rss";
import { translateItems } from "@/lib/server/translate";
import { generateMarketBrief } from "@/lib/server/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_WATCHLIST = ["HAG", "MWG", "OCB", "SSI", "VIC", "VHM", "KDH"];

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 15);
  const watchlist = symbols.length ? symbols : DEFAULT_WATCHLIST;

  const [vnindex, watchlistQuotes, vnNews, enNewsRaw] = await Promise.all([
    getSnapshot("VNINDEX"),
    getSnapshots(watchlist),
    getLiveFeed(24),
    getLiveFeedEn(15),
  ]);

  const enNews = await translateItems(enNewsRaw);
  const result = await generateMarketBrief(vnindex, watchlistQuotes, vnNews, enNews);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { buildMarketAnalyze } from "@/lib/server/market-analyze";
import { insertSnapshot, getPool } from "@/lib/server/db";
import { isMarketOpen } from "@/lib/market-hours";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * VPS-side collector. A system cron on the server calls this every few minutes
 * during the trading session to snapshot the market into MySQL, which powers
 * the "so cùng giờ phiên trước" comparison and historical data.
 *
 *   curl -H "x-cron-secret: $CRON_SECRET" https://captainx.vn/api/internal/collect
 *
 * Add `?force=1` to snapshot outside market hours (manual testing).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!getPool()) {
    return NextResponse.json({ ok: false, error: "db not configured" }, { status: 503 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!force && !isMarketOpen("vnindex")) {
    return NextResponse.json({ ok: true, skipped: "market closed" });
  }

  const data = await buildMarketAnalyze("HOSE");
  const saved = await insertSnapshot(data);
  return NextResponse.json({
    ok: saved,
    gtgd: data.gtgd,
    breadth: data.breadth,
    savedAt: new Date().toISOString(),
  });
}

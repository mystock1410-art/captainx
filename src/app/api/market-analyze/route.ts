import { NextResponse } from "next/server";
import { buildMarketAnalyze } from "@/lib/server/market-analyze";
import { getPrevSessionGtgd } from "@/lib/server/db";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await buildMarketAnalyze("HOSE");

  // "So cùng giờ phiên trước": compare current GTGD with the snapshot taken at
  // the same time-of-day in a previous session (null until the VPS collector
  // has accumulated at least one earlier session; DB-less deploys get null).
  const prevGtgd = await getPrevSessionGtgd("HOSE");
  const vsPrev =
    prevGtgd && prevGtgd > 0
      ? {
          prevGtgd,
          delta: Math.round((data.gtgd - prevGtgd) * 100) / 100,
          pct: Math.round(((data.gtgd - prevGtgd) / prevGtgd) * 10000) / 100,
        }
      : null;

  return NextResponse.json(
    { ...data, vsPrev },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}

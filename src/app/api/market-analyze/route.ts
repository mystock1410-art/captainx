import { NextResponse } from "next/server";
import { getMarketStats } from "@/lib/server/cafef";
import { getIndexVolumeSeries } from "@/lib/server/dnse";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, vol] = await Promise.all([
    getMarketStats("HOSE"),
    getIndexVolumeSeries("VNINDEX"),
  ]);

  // Cumulative turnover curve: the per-bar volume gives the intraday SHAPE;
  // we scale it so the final point equals the authoritative GTGD total, giving
  // a correctly-valued (tỷ đồng) liquidity curve for the latest session.
  let cum = 0;
  const cumArr: number[] = [];
  for (let i = 0; i < vol.t.length; i++) {
    cum += vol.v[i] || 0;
    cumArr.push(cum);
  }
  const totalCum = cumArr.length ? cumArr[cumArr.length - 1] : 0;
  const points = vol.t.map((t, i) => ({
    t,
    value: totalCum > 0 ? Math.round(stats.gtgd * (cumArr[i] / totalCum) * 100) / 100 : 0,
  }));

  return NextResponse.json(
    { ...stats, liquidity: { points } },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}

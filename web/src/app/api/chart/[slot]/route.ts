import { NextRequest, NextResponse } from "next/server";
import { getSnapshot, getSnapshots } from "@/lib/server/cafef";
import { getChart as ssiChart } from "@/lib/server/ssi";
import { getChart as yahooChart } from "@/lib/server/yahoo";

export const runtime = "nodejs";
export const revalidate = 30;

const CHART_TARGETS: Record<string, { provider: "ssi" | "yahoo"; symbol: string; name: string }> = {
  vnindex: { provider: "ssi", symbol: "VNINDEX", name: "VN-Index" },
  dji: { provider: "yahoo", symbol: "^DJI", name: "Dow Jones Industrial Average" },
  wti: { provider: "yahoo", symbol: "CL=F", name: "WTI Crude Oil Futures" },
  ym: { provider: "yahoo", symbol: "YM=F", name: "E-mini Dow Futures" },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  const { slot } = await params;
  const target = CHART_TARGETS[slot.toLowerCase()];
  if (!target) {
    return NextResponse.json({ error: `unknown slot '${slot}'` }, { status: 404 });
  }

  if (target.provider === "ssi") {
    const [chart, snap] = await Promise.all([
      ssiChart(target.symbol, "5", 604800),
      getSnapshot(target.symbol),
    ]);
    return NextResponse.json(
      {
        slot,
        name: target.name,
        symbol: target.symbol,
        price: snap?.price ?? null,
        change: snap?.change ?? null,
        changePct: snap?.changePct ?? null,
        t: chart.t,
        c: chart.c,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" } }
    );
  }

  const y = await yahooChart(target.symbol, "1d", "5m");
  return NextResponse.json(
    {
      slot,
      name: target.name,
      symbol: target.symbol,
      price: y.price,
      change: y.change,
      changePct: y.changePct,
      t: y.t,
      c: y.c,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" } }
  );
}

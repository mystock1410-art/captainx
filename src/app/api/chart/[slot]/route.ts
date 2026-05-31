import { NextRequest, NextResponse } from "next/server";
import { getSnapshot, getIndexChart } from "@/lib/server/cafef";
import { getChart as yahooChart } from "@/lib/server/yahoo";
import { getHyperliquidChart } from "@/lib/server/hyperliquid";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type Target =
  | { provider: "cafef-index"; symbol: string; name: string; cacheS: number }
  | { provider: "yahoo"; symbol: string; name: string; cacheS: number }
  | { provider: "hyperliquid"; coin: string; dex: string; displaySymbol: string; name: string; cacheS: number };

// cacheS = upper-bound CDN cache TTL aligned to each source's realistic update freq:
//   Cafef VNINDEX intraday → ~10s
//   Yahoo Finance intraday → ~15s
//   Hyperliquid xyz perp   → ~3s (mark price ticks <1s, but be kind to upstream)
const CHART_TARGETS: Record<string, Target> = {
  vnindex: { provider: "cafef-index", symbol: "VNINDEX", name: "VN-Index", cacheS: 10 },
  dji:     { provider: "yahoo", symbol: "^DJI", name: "Dow Jones Industrial Average", cacheS: 15 },
  wti:     { provider: "yahoo", symbol: "CL=F", name: "WTI Crude Oil Futures", cacheS: 15 },
  ym:      { provider: "yahoo", symbol: "YM=F", name: "E-mini Dow Futures", cacheS: 15 },
  wtioil: {
    provider: "hyperliquid",
    coin: "xyz:CL",
    dex: "xyz",
    displaySymbol: "WTIOIL/USDC",
    name: "WTIOIL Perp · Hyperliquid",
    cacheS: 3,
  },
  btc: {
    provider: "hyperliquid",
    coin: "BTC",
    dex: "",
    displaySymbol: "BTC/USDC",
    name: "Bitcoin Perp · Hyperliquid",
    cacheS: 3,
  },
};

function cacheHeader(s: number) {
  return { "Cache-Control": `public, s-maxage=${s}, stale-while-revalidate=${s}` };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  const { slot } = await params;
  const target = CHART_TARGETS[slot.toLowerCase()];
  if (!target) {
    return NextResponse.json({ error: `unknown slot '${slot}'` }, { status: 404 });
  }

  if (target.provider === "cafef-index") {
    const [chart, snap] = await Promise.all([
      getIndexChart(target.symbol),
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
      { headers: cacheHeader(target.cacheS) }
    );
  }

  if (target.provider === "hyperliquid") {
    const h = await getHyperliquidChart(target.coin, target.dex, "5m", 24 * 3600 * 1000);
    return NextResponse.json(
      {
        slot,
        name: target.name,
        symbol: target.displaySymbol,
        price: h.price,
        change: h.change,
        changePct: h.changePct,
        t: h.t,
        c: h.c,
      },
      { headers: cacheHeader(target.cacheS) }
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
    { headers: cacheHeader(target.cacheS) }
  );
}

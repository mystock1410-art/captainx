import { NextResponse } from "next/server";
import { getChart } from "@/lib/server/yahoo";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type WorldCategory = "asia" | "europe" | "crypto" | "rates" | "commodities" | "fx";

type WorldQuote = {
  symbol: string;
  label: string;
  category: WorldCategory;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

const SYMBOLS: { symbol: string; label: string; category: WorldCategory }[] = [
  // Asia
  { symbol: "^N225", label: "Nikkei 225", category: "asia" },
  { symbol: "^HSI", label: "Hang Seng", category: "asia" },
  { symbol: "^KS11", label: "KOSPI", category: "asia" },
  { symbol: "000001.SS", label: "SSE Composite", category: "asia" },
  // Europe
  { symbol: "^FTSE", label: "FTSE 100", category: "europe" },
  { symbol: "^FCHI", label: "CAC 40", category: "europe" },
  { symbol: "^GDAXI", label: "DAX", category: "europe" },
  { symbol: "^N100", label: "Euronext 100", category: "europe" },
  { symbol: "^STOXX50E", label: "EURO STOXX 50", category: "europe" },
  // Crypto
  { symbol: "BTC-USD", label: "Bitcoin", category: "crypto" },
  { symbol: "ETH-USD", label: "Ethereum", category: "crypto" },
  { symbol: "BNB-USD", label: "BNB", category: "crypto" },
  // Rates
  { symbol: "^TNX", label: "US 10-Yr Bond", category: "rates" },
  { symbol: "^FVX", label: "US 5-Yr Bond", category: "rates" },
  // Commodities
  { symbol: "CL=F", label: "Crude Oil", category: "commodities" },
  { symbol: "GC=F", label: "Gold", category: "commodities" },
  { symbol: "BZ=F", label: "Brent Crude", category: "commodities" },
  // FX
  { symbol: "EURUSD=X", label: "EUR/USD", category: "fx" },
  { symbol: "USDJPY=X", label: "USD/JPY", category: "fx" },
];

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, label, category }): Promise<WorldQuote> => {
      const c = await getChart(symbol, "1d", "5m");
      return {
        symbol,
        label,
        category,
        price: c.price,
        change: c.change,
        changePct: c.changePct,
      };
    }),
  );
  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
  });
}

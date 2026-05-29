import { NextResponse } from "next/server";
import { getChart } from "@/lib/server/yahoo";

export const runtime = "nodejs";
export const revalidate = 60;

type WorldQuote = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
};

const SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: "^N225", label: "Nikkei 225" },
  { symbol: "^HSI", label: "Hang Seng" },
  { symbol: "^KS11", label: "KOSPI" },
  { symbol: "000001.SS", label: "SSE Composite" },
  { symbol: "^FTSE", label: "FTSE 100" },
  { symbol: "^FCHI", label: "CAC 40" },
  { symbol: "^GDAXI", label: "DAX" },
  { symbol: "^N100", label: "Euronext 100" },
  { symbol: "^STOXX50E", label: "EURO STOXX 50" },
  { symbol: "BTC-USD", label: "Bitcoin USD" },
  { symbol: "^TNX", label: "10-Yr Bond" },
  { symbol: "^FVX", label: "5-Yr Bond" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "GCM26.CMX", label: "Gold Jun 26" },
  { symbol: "BZ=F", label: "Brent Crude" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "USDJPY=X", label: "USD/JPY" },
];

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, label }): Promise<WorldQuote> => {
      const c = await getChart(symbol, "1d", "5m");
      return {
        symbol,
        label,
        price: c.price,
        change: c.change,
        changePct: c.changePct,
      };
    }),
  );
  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}

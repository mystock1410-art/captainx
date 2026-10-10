import { NextResponse } from "next/server";
import { getChart } from "@/lib/server/yahoo";
import { getVcbUsdSell, getSbvCentralUsd } from "@/lib/server/forex-vn";

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
  unit?: string;
};

// KC=F (Coffee C, Arabica) is quoted in US cents per pound. Convert to VND/kg:
//   VND/kg = (cents/lb) × (VND_per_USD × LB_PER_KG / 100)
const LB_PER_KG = 2.2046226218;

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
  const [results, coffee, usdVnd, vcbSell] = await Promise.all([
    Promise.all(
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
    ),
    getChart("KC=F", "1d", "5m"), // Coffee C (Arabica) — US cents/lb
    getChart("USDVND=X", "1d", "5m"), // USD → VND rate (used only for conversion)
    getVcbUsdSell(), // Vietcombank USD sell rate (live)
  ]);

  // Append coffee converted to VND/kg (keep KC=F's own % move; price/change
  // are converted via the live USD/VND rate). Shows "—" if either feed is down.
  const rate = usdVnd.price;
  const canConvert = coffee.price != null && rate != null;
  const factor = canConvert ? (rate! / 100) * LB_PER_KG : 0;
  results.push({
    symbol: "KC=F",
    label: "Cà phê",
    category: "commodities",
    price: canConvert ? Math.round(coffee.price! * factor) : null,
    change: canConvert && coffee.change != null ? Math.round(coffee.change * factor) : null,
    changePct: canConvert ? coffee.changePct : null,
    unit: "VND/kg",
  });

  // USD/VND — tỷ giá trung tâm NHNN (manual/env) + Vietcombank bán ra (live).
  // Reference rates: shown as price-only (no intraday change).
  results.push({
    symbol: "USDVND-TT",
    label: "USD/VND TT",
    category: "fx",
    price: getSbvCentralUsd(),
    change: null,
    changePct: null,
    unit: "đ",
  });
  results.push({
    symbol: "USDVND-VCB",
    label: "USD/VND VCB",
    category: "fx",
    price: vcbSell,
    change: null,
    changePct: null,
    unit: "đ",
  });

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
  });
}

import type { Quote } from "@/lib/server/cafef";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// VNDirect public price endpoint — covers HOSE, HNX, UPCOM in one call.
// Returns latest trading session snapshot: close, basicPrice (ref), change, pctChange.
const URL = "https://api-finfo.vndirect.com.vn/v4/stock_prices";

type VndRow = {
  code: string;
  date: string;
  time: string;
  floor: string;
  basicPrice: number;
  ceilingPrice: number;
  floorPrice: number;
  close: number;
  change: number;
  pctChange: number;
};

export async function getSnapshots(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const tickers = symbols.map((s) => s.toUpperCase());
  // VND's q syntax: code:A,B,C  — &sort=date:desc keeps newest row per symbol first;
  // size = N tickers × ~2 to be safe in case of split/duplicate rows.
  const url = `${URL}?q=code:${tickers.join(",")}&size=${tickers.length * 2}&sort=date:desc`;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://dstock.vndirect.com.vn",
        Referer: "https://dstock.vndirect.com.vn/",
      },
      cache: "no-store",
    });
    if (!r.ok) return fallback(tickers, `VND HTTP ${r.status}`);
    const payload = await r.json();
    const rows: VndRow[] = payload?.data ?? [];
    if (!rows.length) return fallback(tickers, "VND empty");

    // Keep only the newest row per symbol (response is already date-desc).
    const latest = new Map<string, VndRow>();
    for (const row of rows) {
      const sym = row.code?.toUpperCase();
      if (!sym || latest.has(sym)) continue;
      latest.set(sym, row);
    }

    return tickers.map((sym) => {
      const row = latest.get(sym);
      if (!row || row.close == null) {
        return { symbol: sym, price: null, change: null, changePct: null, error: "no-data" };
      }
      const price = Math.round(row.close * 10000) / 10000;
      const change = row.change != null ? Math.round(row.change * 10000) / 10000 : null;
      const changePct = row.pctChange != null ? Math.round(row.pctChange * 10000) / 10000 : null;
      const ref = row.basicPrice ?? null;
      const ceiling = row.ceilingPrice ?? null;
      const floor = row.floorPrice ?? null;
      return { symbol: sym, price, change, changePct, ref, ceiling, floor };
    });
  } catch (e) {
    return fallback(tickers, String(e));
  }
}

function fallback(symbols: string[], error: string): Quote[] {
  return symbols.map((sym) => ({
    symbol: sym,
    price: null,
    change: null,
    changePct: null,
    error,
  }));
}

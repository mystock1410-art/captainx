const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  ref?: number | null;
  error?: string;
};

type TcbsRow = {
  t: string;          // ticker
  cp: number;         // current price (nghìn đồng)
  rf: number;         // reference price
  rcp: number;        // price change
  rpp: number;        // price change %
  ss: string;         // session status
};

// TCBS public quote API — returns intraday realtime prices for HOSE/HNX/UPCOM
// cp is in thousands VND (e.g. 15.5 = 15,500 VND), same unit as Cafef
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const tickers = symbols.map((s) => s.toUpperCase()).join(",");
  const url = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/quote?tickers=${tickers}`;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://tcinvest.tcbs.com.vn",
        Referer: "https://tcinvest.tcbs.com.vn/",
      },
      next: { revalidate: 20 },
    });
    if (!r.ok) return fallback(symbols, `TCBS HTTP ${r.status}`);
    const payload = await r.json();
    const rows: TcbsRow[] = payload?.data ?? [];
    if (!rows.length) return fallback(symbols, "TCBS empty");

    const map = new Map<string, TcbsRow>(rows.map((row) => [row.t.toUpperCase(), row]));

    return symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const row = map.get(upper);
      if (!row || row.cp == null) {
        return { symbol: upper, price: null, change: null, changePct: null, error: "no-data" };
      }
      const price = Math.round(row.cp * 10000) / 10000;
      const change = row.rcp != null ? Math.round(row.rcp * 10000) / 10000 : null;
      const changePct = row.rpp != null ? Math.round(row.rpp * 10000) / 10000 : null;
      return { symbol: upper, price, change, changePct, ref: row.rf ?? null };
    });
  } catch (e) {
    return fallback(symbols, String(e));
  }
}

function fallback(symbols: string[], error: string): Quote[] {
  return symbols.map((sym) => ({
    symbol: sym.toUpperCase(),
    price: null,
    change: null,
    changePct: null,
    error,
  }));
}

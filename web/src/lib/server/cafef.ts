const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const PRICE_HISTORY_URL =
  "https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx?Symbol={symbol}&StartDate=&EndDate=&PageIndex=1&PageSize=2";

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prev?: number;
  date?: string;
  error?: string;
};

export async function getSnapshot(symbol: string): Promise<Quote | null> {
  const url = PRICE_HISTORY_URL.replace("{symbol}", symbol.toUpperCase());
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 20 },
    });
    if (!r.ok) return null;
    const payload = await r.json();
    const rows: Record<string, unknown>[] = (payload?.Data?.Data) ?? [];
    if (!rows.length) return null;

    const price = parseFloat((rows[0].GiaDongCua as string) ?? "0");
    if (!price) return null;

    const prev = rows.length >= 2 ? parseFloat((rows[1].GiaDongCua as string) ?? "0") : price;
    const change = prev ? Math.round((price - prev) * 10000) / 10000 : 0;
    const changePct = prev ? Math.round((change / prev) * 100 * 10000) / 10000 : 0;

    return {
      symbol: symbol.toUpperCase(),
      price: Math.round(price * 10000) / 10000,
      change,
      changePct,
      prev: Math.round(prev * 10000) / 10000,
      date: rows[0].Ngay as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function getSnapshots(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map((s) => getSnapshot(s)));
  return results.map((r, i) => {
    if (r.status === "fulfilled" && r.value) return r.value;
    return {
      symbol: symbols[i].toUpperCase(),
      price: null,
      change: null,
      changePct: null,
      error: r.status === "rejected" ? String(r.reason) : "no-data",
    };
  });
}

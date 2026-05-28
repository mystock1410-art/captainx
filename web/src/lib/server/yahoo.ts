const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type YahooChart = {
  symbol: string;
  name: string;
  price: number | null;
  prev: number | null;
  change: number | null;
  changePct: number | null;
  t: number[];
  c: number[];
};

export async function getChart(
  symbol: string,
  range_ = "1d",
  interval = "5m"
): Promise<YahooChart> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range_}&interval=${interval}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!r.ok) return empty(symbol);
    const payload = await r.json();
    const results: Record<string, unknown>[] = payload?.chart?.result ?? [];
    if (!results.length) return empty(symbol);

    const res = results[0];
    const meta = (res.meta ?? {}) as Record<string, unknown>;
    const ts: number[] = (res.timestamp as number[]) ?? [];
    const quote = ((res.indicators as Record<string, unknown[]>)?.quote ?? [{}])[0] as Record<string, (number | null)[]>;

    const closes = quote.close ?? [];
    const price = meta.regularMarketPrice as number | null;
    const prevClose = (meta.chartPreviousClose ?? meta.previousClose) as number | null;
    const change = price != null && prevClose ? Math.round((price - prevClose) * 10000) / 10000 : null;
    const changePct = change != null && prevClose ? Math.round((change / prevClose) * 100 * 10000) / 10000 : null;

    const pairs = ts.map((t, i) => [t, closes[i]] as [number, number | null]).filter(([, c]) => c != null);

    return {
      symbol,
      name: (meta.shortName ?? meta.longName ?? symbol) as string,
      price: price != null ? Math.round(price * 10000) / 10000 : null,
      prev: prevClose != null ? Math.round(prevClose * 10000) / 10000 : null,
      change,
      changePct,
      t: pairs.map(([t]) => t),
      c: pairs.map(([, c]) => Math.round(c! * 10000) / 10000),
    };
  } catch {
    return empty(symbol);
  }
}

function empty(symbol: string): YahooChart {
  return { symbol, name: symbol, price: null, prev: null, change: null, changePct: null, t: [], c: [] };
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const CHART_URL = "https://iboard-api.ssi.com.vn/statistics/charts/history";

export type ChartData = {
  symbol: string;
  t: number[];
  c: number[];
};

export async function getChart(
  symbol: string,
  resolution = "5",
  lookbackSeconds = 259200
): Promise<ChartData> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackSeconds;
  const url = `${CHART_URL}?resolution=${resolution}&symbol=${symbol.toUpperCase()}&from=${from}&to=${now}`;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
        "Origin": "https://iboard.ssi.com.vn",
        "Referer": "https://iboard.ssi.com.vn/",
      },
      next: { revalidate: 30 },
    });
    if (!r.ok) return { symbol: symbol.toUpperCase(), t: [], c: [] };
    const payload = await r.json();
    const data = payload?.data ?? {};
    return {
      symbol: symbol.toUpperCase(),
      t: data.t ?? [],
      c: data.c ?? [],
    };
  } catch {
    return { symbol: symbol.toUpperCase(), t: [], c: [] };
  }
}

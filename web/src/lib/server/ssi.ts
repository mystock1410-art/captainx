const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const CHART_URL = "https://iboard-api.ssi.com.vn/statistics/charts/history";

export type ChartData = {
  symbol: string;
  t: number[];
  c: number[];
  debug?: { status: number; bodyPrefix: string; from: number; to: number };
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
      cache: "no-store",
    });
    const text = await r.text();
    const debug = { status: r.status, bodyPrefix: text.slice(0, 200), from, to: now };
    if (!r.ok) return { symbol: symbol.toUpperCase(), t: [], c: [], debug };
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(text); } catch {}
    const data = (payload?.data ?? {}) as Record<string, unknown>;
    return {
      symbol: symbol.toUpperCase(),
      t: (data.t as number[]) ?? [],
      c: (data.c as number[]) ?? [],
      debug,
    };
  } catch (e) {
    return { symbol: symbol.toUpperCase(), t: [], c: [], debug: { status: -1, bodyPrefix: String(e).slice(0, 200), from: 0, to: 0 } };
  }
}

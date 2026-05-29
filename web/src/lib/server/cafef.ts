const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// banggia.cafef.vn returns realtime prices for all HOSE/HNX/UPCOM tickers
// Fields: a=symbol, e=current price, w=reference price, k=change, Time=timestamp
const BANGGIA_URL = "https://banggia.cafef.vn/stockhandler.ashx?index={exchange}";
const EXCHANGES = ["HOSE", "HNX", "UPCOM"];

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  ref?: number | null;
  error?: string;
};

type BangGiaRow = {
  a: string;   // symbol
  e: number;   // current price (nghìn đồng)
  w: number;   // reference price
  k: number;   // change amount
};

let bangGiaCache: Map<string, BangGiaRow> | null = null;
let bangGiaCacheAt = 0;
const CACHE_TTL_MS = 15_000; // 15s cache to avoid hammering on burst requests

async function getBangGiaMap(): Promise<Map<string, BangGiaRow>> {
  const now = Date.now();
  if (bangGiaCache && now - bangGiaCacheAt < CACHE_TTL_MS) return bangGiaCache;

  const maps = await Promise.allSettled(
    EXCHANGES.map((ex) =>
      fetch(BANGGIA_URL.replace("{exchange}", ex), {
        headers: { "User-Agent": UA, Referer: "https://cafef.vn/" },
        next: { revalidate: 15 },
      }).then((r) => (r.ok ? r.json() as Promise<BangGiaRow[]> : []))
    )
  );

  const merged = new Map<string, BangGiaRow>();
  for (const result of maps) {
    const rows: BangGiaRow[] = result.status === "fulfilled" ? result.value : [];
    for (const row of rows) {
      if (row.a) merged.set(row.a.toUpperCase(), row);
    }
  }
  bangGiaCache = merged;
  bangGiaCacheAt = now;
  return merged;
}

export async function getSnapshots(symbols: string[]): Promise<Quote[]> {
  try {
    const map = await getBangGiaMap();
    return symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const row = map.get(upper);
      if (!row || !row.e) {
        return { symbol: upper, price: null, change: null, changePct: null, error: "no-data" };
      }
      const price = Math.round(row.e * 10000) / 10000;
      const ref = row.w ?? null;
      const change = row.k != null ? Math.round(row.k * 10000) / 10000 : null;
      const changePct = change != null && ref ? Math.round((change / ref) * 100 * 10000) / 10000 : null;
      return { symbol: upper, price, change, changePct, ref };
    });
  } catch {
    return symbols.map((sym) => ({ symbol: sym.toUpperCase(), price: null, change: null, changePct: null, error: "fetch-error" }));
  }
}

// getSnapshot for VNINDEX — still uses PriceHistory (index, not a stock)
const PRICE_HISTORY_URL =
  "https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx?Symbol={symbol}&StartDate=&EndDate=&PageIndex=1&PageSize=2";

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
      ref: Math.round(prev * 10000) / 10000,
    };
  } catch {
    return null;
  }
}

const INDEX_CHART_URL =
  "https://msh-datacenter.cafef.vn/price/api/v1/CompanyCompac/RealTimeChartHeader?index={index}";

const INDEX_MAP: Record<string, { id: number; key: string }> = {
  VNINDEX: { id: 1, key: "RealTimeChartIndexV1:1" },
  VN30: { id: 2, key: "RealTimeChartIndexV1:2" },
};

export type IndexChart = { t: number[]; c: number[] };

export async function getIndexChart(symbol: string): Promise<IndexChart> {
  const cfg = INDEX_MAP[symbol.toUpperCase()];
  if (!cfg) return { t: [], c: [] };
  const url = INDEX_CHART_URL.replace("{index}", String(cfg.id));
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://m.cafef.vn",
        Referer: "https://m.cafef.vn/",
      },
      next: { revalidate: 30 },
    });
    if (!r.ok) return { t: [], c: [] };
    const payload = await r.json();
    const rows: Record<string, unknown>[] = payload?.value?.[cfg.key] ?? [];
    const t: number[] = [];
    const c: number[] = [];
    for (const row of rows) {
      const iso = row.time as string;
      const price = row.data as number;
      if (!iso || price == null) continue;
      const sec = Math.floor(new Date(iso).getTime() / 1000);
      if (!Number.isFinite(sec)) continue;
      t.push(sec);
      c.push(Math.round(price * 100) / 100);
    }
    return { t, c };
  } catch {
    return { t: [], c: [] };
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

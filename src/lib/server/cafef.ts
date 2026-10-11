import { fetchWithTimeout } from "./http";

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
  ceiling?: number | null;
  floor?: number | null;
  error?: string;
};

type BangGiaRow = {
  a: string;            // symbol
  e: number;            // current price (nghìn đồng)
  w: number;            // session low / reference-ish
  k: number;            // change amount
  l?: number;           // last matched price (nghìn đồng)
  x?: number;           // foreign BUY volume (shares)
  y?: number;           // foreign SELL volume (shares)
  n?: number;           // total matched volume
  totalvolume?: number; // total matched volume
  Time?: string;        // "HH:MM dd/MM/yyyy"
};

async function fetchBangGiaRows(exchange: string): Promise<BangGiaRow[]> {
  try {
    const r = await fetchWithTimeout(BANGGIA_URL.replace("{exchange}", exchange), {
      headers: { "User-Agent": UA, Referer: "https://cafef.vn/" },
      cache: "no-store",
      timeoutMs: 7000,
    });
    return r.ok ? ((await r.json()) as BangGiaRow[]) : [];
  } catch {
    return [];
  }
}

let bangGiaCache: Map<string, BangGiaRow> | null = null;
let bangGiaCacheAt = 0;
const CACHE_TTL_MS = 15_000; // 15s cache to avoid hammering on burst requests

async function getBangGiaMap(): Promise<Map<string, BangGiaRow>> {
  const now = Date.now();
  if (bangGiaCache && now - bangGiaCacheAt < CACHE_TTL_MS) return bangGiaCache;

  const maps = await Promise.all(EXCHANGES.map((ex) => fetchBangGiaRows(ex)));
  const merged = new Map<string, BangGiaRow>();
  for (const rows of maps) {
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
    const r = await fetchWithTimeout(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      timeoutMs: 7000,
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
    const r = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://m.cafef.vn",
        Referer: "https://m.cafef.vn/",
      },
      cache: "no-store",
      timeoutMs: 7000,
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

/* ------------------------------------------------------------------ *
 * Daily market snapshot (foreign flows · liquidity total · breadth),
 * all derived from the realtime banggia feed for one exchange.
 * ------------------------------------------------------------------ */

export type ForeignFlow = { symbol: string; value: number }; // net value in tỷ đồng
export type MarketStats = {
  exchange: string;
  asOf: string | null;
  gtgd: number; // total matched turnover (tỷ đồng)
  breadth: { advance: number; decline: number; unchanged: number; notTraded: number };
  foreign: {
    buyTop20: number; // Σ foreign buy value of the 20 biggest buyers (tỷ)
    sellTop20: number;
    diff: number; // buyTop20 − sellTop20
    netBuy: ForeignFlow[]; // top 5 net foreign buy (positive)
    netSell: ForeignFlow[]; // top 5 net foreign sell (negative)
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getMarketStats(exchange = "HOSE"): Promise<MarketStats> {
  const rows = await fetchBangGiaRows(exchange);

  let advance = 0,
    decline = 0,
    unchanged = 0,
    notTraded = 0,
    gtgd = 0;
  let asOf: string | null = null;
  const flows: { symbol: string; net: number; buy: number; sell: number }[] = [];

  for (const r of rows) {
    if (!r.a) continue;
    if (r.Time) asOf = r.Time;
    const price = r.l || r.e || r.w || 0; // nghìn đồng
    const vol = r.totalvolume ?? r.n ?? 0;
    const k = r.k ?? 0;

    if (vol <= 0 || price <= 0) notTraded++;
    else if (k > 0) advance++;
    else if (k < 0) decline++;
    else unchanged++;

    if (vol > 0 && price > 0) gtgd += vol * price * 1000; // → VND

    const fb = r.x ?? 0;
    const fs = r.y ?? 0;
    const unit = (price * 1000) / 1e9; // shares → tỷ đồng
    flows.push({ symbol: r.a, net: (fb - fs) * unit, buy: fb * unit, sell: fs * unit });
  }

  const netBuy = [...flows]
    .sort((a, b) => b.net - a.net)
    .filter((x) => x.net > 0)
    .slice(0, 5)
    .map((x) => ({ symbol: x.symbol, value: round2(x.net) }));
  const netSell = [...flows]
    .sort((a, b) => a.net - b.net)
    .filter((x) => x.net < 0)
    .slice(0, 5)
    .map((x) => ({ symbol: x.symbol, value: round2(x.net) }));
  const buyTop20 = [...flows].sort((a, b) => b.buy - a.buy).slice(0, 20).reduce((s, x) => s + x.buy, 0);
  const sellTop20 = [...flows].sort((a, b) => b.sell - a.sell).slice(0, 20).reduce((s, x) => s + x.sell, 0);

  return {
    exchange,
    asOf,
    gtgd: round2(gtgd / 1e9),
    breadth: { advance, decline, unchanged, notTraded },
    foreign: {
      buyTop20: round2(buyTop20),
      sellTop20: round2(sellTop20),
      diff: round2(buyTop20 - sellTop20),
      netBuy,
      netSell,
    },
  };
}


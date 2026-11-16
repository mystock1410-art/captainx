const BASE = "";

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prev?: number;
  ref?: number | null;
  ceiling?: number | null;
  floor?: number | null;
  date?: string;
  error?: string;
};

export type DerivativeQuote = Quote & {
  t: number[];
  c: number[];
};

export type WorldCategory = "asia" | "europe" | "crypto" | "rates" | "commodities" | "fx";

export type WorldQuote = {
  symbol: string;
  label: string;
  category: WorldCategory;
  price: number | null;
  change: number | null;
  changePct: number | null;
  /** Unit suffix to show after the price (e.g. "VND/kg" for converted coffee). */
  unit?: string;
};

export type ChartPayload = {
  slot: string;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  t: number[];
  c: number[];
  /** Unit suffix shown after the price (e.g. "VND/kg" for converted coffee). */
  unit?: string;
};

export type IntradayCandle = { o: number; h: number; l: number; c: number };
export type IntradaySeries = { symbol: string; candles: IntradayCandle[] };

export type DepthLevel = { price: number; vol: number };
export type SymbolDepth = {
  symbol: string;
  ref: number | null;
  ceiling: number | null;
  floor: number | null;
  last: number | null;
  bids: DepthLevel[];
  asks: DepthLevel[];
};

export type ForeignFlow = { symbol: string; value: number };
export type MarketAnalyze = {
  exchange: string;
  asOf: string | null;
  gtgd: number;
  breadth: { advance: number; decline: number; unchanged: number; notTraded: number };
  foreign: {
    buyTop20: number;
    sellTop20: number;
    diff: number;
    netBuy: ForeignFlow[];
    netSell: ForeignFlow[];
  };
  liquidity: { points: { t: number; value: number }[] };
  /** Compare current GTGD vs the same time-of-day in the previous session. */
  vsPrev?: { prevGtgd: number; delta: number; pct: number } | null;
};

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  link: string;
  published: string | null;
  breaking?: boolean;
  important?: boolean;
  /** Vietnamese translation when source is English-language. */
  title_vi?: string;
  summary_vi?: string;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return (await r.json()) as T;
}

export const api = {
  quotes: (symbols: string[], signal?: AbortSignal) =>
    getJson<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, signal),
  chart: (slot: string, signal?: AbortSignal) =>
    getJson<ChartPayload>(`/api/chart/${slot}`, signal),
  intraday: (symbols: string[], signal?: AbortSignal) =>
    getJson<IntradaySeries[]>(`/api/intraday?symbols=${encodeURIComponent(symbols.join(","))}`, signal),
  depth: (symbols: string[], signal?: AbortSignal) =>
    getJson<SymbolDepth[]>(`/api/depth?symbols=${encodeURIComponent(symbols.join(","))}`, signal),
  marketAnalyze: (signal?: AbortSignal) =>
    getJson<MarketAnalyze>(`/api/market-analyze`, signal),
  news: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/news`, signal),
  headlines: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/headlines`, signal),
  newsEn: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/news-en`, signal),
  headlinesEn: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/headlines-en`, signal),
  worldQuotes: (signal?: AbortSignal) =>
    getJson<WorldQuote[]>(`/api/world-quotes`, signal),
  derivatives: (signal?: AbortSignal) =>
    getJson<DerivativeQuote[]>(`/api/derivatives`, signal),
  marketBrief: (symbols: string[], signal?: AbortSignal) =>
    getJson<MarketBrief>(
      `/api/market-brief${symbols.length ? `?symbols=${encodeURIComponent(symbols.join(","))}` : ""}`,
      signal,
    ),
};

export type Sentiment = "bullish" | "bearish" | "neutral";

export type MarketBriefSection = {
  sentiment: Sentiment;
  confidence: number;
  analysis: string;
};

export type MarketBrief = {
  vn: MarketBriefSection;
  global: MarketBriefSection;
  catalysts: { direction: "+" | "-" | "~"; label: string; detail: string; region?: "vn" | "global" }[];
  watchlist_notes: { symbol: string; sentiment: Sentiment; note: string }[];
  risks: string[];
  generated_at: number;
  model: string | null;
};

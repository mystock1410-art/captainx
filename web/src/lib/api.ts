const BASE = "";

export type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prev?: number;
  date?: string;
  error?: string;
};

export type WorldQuote = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
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
  news: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/news`, signal),
  headlines: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/headlines`, signal),
  newsEn: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/news-en`, signal),
  headlinesEn: (signal?: AbortSignal) => getJson<NewsItem[]>(`/api/headlines-en`, signal),
  worldQuotes: (signal?: AbortSignal) =>
    getJson<WorldQuote[]>(`/api/world-quotes`, signal),
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

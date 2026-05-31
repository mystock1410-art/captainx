import type { Quote } from "@/lib/api";

const BASE = "https://api.dnse.com.vn";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  Origin: "https://banggia.dnse.com.vn",
  Referer: "https://banggia.dnse.com.vn/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
} as const;

type Ohlc = {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  nextTime: number;
};

export const DERIVATIVES: { symbol: string; label: string }[] = [
  { symbol: "VN30F1M", label: "VN30 1M" },
  { symbol: "VN30F2M", label: "VN30 2M" },
  { symbol: "VN30F1Q", label: "VN30 1Q" },
];

export type DerivativeQuote = Quote & {
  t: number[];   // candle timestamps (seconds)
  c: number[];   // candle closes
};

const PREV_TTL_MS = 15 * 60 * 1000;
const prevCloseCache = new Map<string, { value: number; expires: number }>();

async function fetchOhlc(
  symbol: string,
  resolution: string,
  fromOffsetSec: number,
  signal?: AbortSignal,
): Promise<Ohlc | null> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - fromOffsetSec;
  const url = `${BASE}/chart-api/v2/ohlcs/derivative?from=${from}&to=${now}&symbol=${symbol}&resolution=${resolution}`;
  try {
    const r = await fetch(url, { headers: HEADERS, signal, cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Ohlc;
  } catch {
    return null;
  }
}

function vnDateOf(unixSec: number): string {
  return new Date((unixSec + 7 * 3600) * 1000).toISOString().slice(0, 10);
}

async function getPrevClose(symbol: string, signal?: AbortSignal): Promise<number | null> {
  const hit = prevCloseCache.get(symbol);
  if (hit && hit.expires > Date.now()) return hit.value;

  const daily = await fetchOhlc(symbol, "1D", 14 * 24 * 3600, signal);
  if (!daily || !daily.c?.length) return null;

  const todayVN = vnDateOf(Math.floor(Date.now() / 1000));
  let value: number | null = null;
  for (let i = daily.t.length - 1; i >= 0; i--) {
    if (vnDateOf(daily.t[i]) < todayVN) {
      value = daily.c[i];
      break;
    }
  }
  if (value === null) value = daily.c[daily.c.length - 1];

  prevCloseCache.set(symbol, { value, expires: Date.now() + PREV_TTL_MS });
  return value;
}

// Fetch enough history to always find the most recent trading session,
// even after a 3-day weekend or a public holiday. We then trim down to
// just that latest session so the payload + chart stay focused.
async function getMinuteCandles(symbol: string, signal?: AbortSignal): Promise<Ohlc | null> {
  const recent = await fetchOhlc(symbol, "1", 8 * 3600, signal);
  if (recent && recent.c?.length) return recent;
  return fetchOhlc(symbol, "1", 5 * 24 * 3600, signal);
}

function trimToLatestSession(t: number[], c: number[]): { t: number[]; c: number[] } {
  if (!t.length) return { t, c };
  const latestDate = vnDateOf(t[t.length - 1]);
  const startIdx = t.findIndex((ts) => vnDateOf(ts) === latestDate);
  if (startIdx <= 0) return { t, c };
  return { t: t.slice(startIdx), c: c.slice(startIdx) };
}

async function getOne(symbol: string, signal?: AbortSignal): Promise<DerivativeQuote> {
  const [minute, prev] = await Promise.all([
    getMinuteCandles(symbol, signal),
    getPrevClose(symbol, signal),
  ]);

  let t: number[] = [];
  let c: number[] = [];
  let last: number | null = null;

  if (minute && minute.c?.length) {
    const trimmed = trimToLatestSession(minute.t, minute.c);
    t = trimmed.t;
    c = trimmed.c;
    last = c[c.length - 1];
  } else {
    const daily = await fetchOhlc(symbol, "1D", 10 * 24 * 3600, signal);
    if (daily && daily.c?.length) last = daily.c[daily.c.length - 1];
  }

  if (last === null) {
    return { symbol, price: null, change: null, changePct: null, t, c };
  }
  if (prev === null || prev === 0) {
    return { symbol, price: last, change: null, changePct: null, t, c };
  }
  const change = last - prev;
  const changePct = (change / prev) * 100;
  return { symbol, price: last, change, changePct, prev, t, c };
}

export async function getDerivativeQuotes(signal?: AbortSignal): Promise<DerivativeQuote[]> {
  return Promise.all(DERIVATIVES.map(({ symbol }) => getOne(symbol, signal)));
}

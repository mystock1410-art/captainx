// Hyperliquid public info API — perpetual markets on builder-deployed DEXes.
// Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

const INFO_URL = "https://api.hyperliquid.xyz/info";

type Candle = {
  t: number;       // open time (ms)
  T: number;       // close time (ms)
  s: string;       // symbol
  i: string;       // interval
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

type AssetCtx = {
  markPx: string;
  midPx: string;
  prevDayPx: string;
  oraclePx: string;
  dayNtlVlm: string;
  openInterest: string;
};

type MetaUniverseItem = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
};

type MetaAndAssetCtxs = [{ universe: MetaUniverseItem[] }, AssetCtx[]];

async function post<T>(body: unknown): Promise<T | null> {
  try {
    const r = await fetch(INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type HyperliquidSnapshot = {
  price: number | null;
  change: number | null;
  changePct: number | null;
  t: number[];
  c: number[];
};

export async function getHyperliquidChart(
  coin: string,
  dex: string,
  interval: string,
  lookbackMs: number,
): Promise<HyperliquidSnapshot> {
  const now = Date.now();
  const from = now - lookbackMs;

  const [ctxResult, candles] = await Promise.all([
    post<MetaAndAssetCtxs>({ type: "metaAndAssetCtxs", dex }),
    post<Candle[]>({
      type: "candleSnapshot",
      req: { coin, interval, startTime: from, endTime: now },
    }),
  ]);

  // Mark price + 24h change from ctx
  let price: number | null = null;
  let change: number | null = null;
  let changePct: number | null = null;
  if (ctxResult) {
    const [meta, ctxs] = ctxResult;
    const idx = meta.universe.findIndex((u) => u.name === coin);
    if (idx >= 0 && ctxs[idx]) {
      const ctx = ctxs[idx];
      const mark = parseFloat(ctx.markPx);
      const prev = parseFloat(ctx.prevDayPx);
      if (Number.isFinite(mark)) price = mark;
      if (Number.isFinite(mark) && Number.isFinite(prev) && prev !== 0) {
        change = Math.round((mark - prev) * 10000) / 10000;
        changePct = Math.round(((mark - prev) / prev) * 100 * 10000) / 10000;
      }
    }
  }

  // Candles → t (seconds), c (close)
  const t: number[] = [];
  const c: number[] = [];
  if (candles) {
    for (const k of candles) {
      const sec = Math.floor(k.t / 1000);
      const close = parseFloat(k.c);
      if (Number.isFinite(sec) && Number.isFinite(close)) {
        t.push(sec);
        c.push(close);
      }
    }
  }

  return { price, change, changePct, t, c };
}

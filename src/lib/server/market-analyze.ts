import { getMarketStats, type MarketStats } from "./cafef";
import { getIndexVolumeSeries } from "./dnse";

export type MarketAnalyzeData = MarketStats & {
  liquidity: { points: { t: number; value: number }[] };
};

/**
 * Build the full market-analyze payload (foreign flows + breadth + GTGD +
 * intraday liquidity curve). Shared by the public `/api/market-analyze` route
 * and the VPS collector (`/api/internal/collect`) so there is a single source
 * of truth. The liquidity curve is the per-bar volume shape scaled so its final
 * point equals the authoritative GTGD total.
 */
export async function buildMarketAnalyze(exchange = "HOSE"): Promise<MarketAnalyzeData> {
  const [stats, vol] = await Promise.all([
    getMarketStats(exchange),
    getIndexVolumeSeries("VNINDEX"),
  ]);

  let cum = 0;
  const cumArr: number[] = [];
  for (let i = 0; i < vol.t.length; i++) {
    cum += vol.v[i] || 0;
    cumArr.push(cum);
  }
  const totalCum = cumArr.length ? cumArr[cumArr.length - 1] : 0;
  const points = vol.t.map((t, i) => ({
    t,
    value: totalCum > 0 ? Math.round(stats.gtgd * (cumArr[i] / totalCum) * 100) / 100 : 0,
  }));

  return { ...stats, liquidity: { points } };
}

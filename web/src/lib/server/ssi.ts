// SSI iboard API blocks Vercel serverless IPs (403 + bot challenge).
// Kept as a thin stub so historical imports don't break; charts now use Yahoo.

export type ChartData = {
  symbol: string;
  t: number[];
  c: number[];
};

export async function getChart(symbol: string): Promise<ChartData> {
  return { symbol: symbol.toUpperCase(), t: [], c: [] };
}

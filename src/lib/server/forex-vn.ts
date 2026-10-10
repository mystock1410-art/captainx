import { fetchWithTimeout } from "./http";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

type VcbRow = { currencyCode?: string; sell?: string };

/**
 * Vietcombank USD "bán ra" (sell) rate — live, from VCB's public exchange-rate
 * endpoint. Returns a rounded VND integer, or null if the feed fails.
 */
export async function getVcbUsdSell(): Promise<number | null> {
  try {
    const r = await fetchWithTimeout(
      "https://www.vietcombank.com.vn/api/exchangerates?date=now",
      {
        headers: { Accept: "application/json", "User-Agent": UA },
        cache: "no-store",
        timeoutMs: 7000,
      },
    );
    if (!r.ok) return null;
    const payload = (await r.json()) as { Data?: VcbRow[]; data?: VcbRow[] };
    const rows = payload?.Data ?? payload?.data ?? [];
    const usd = rows.find((x) => (x.currencyCode ?? "").toUpperCase() === "USD");
    if (!usd?.sell) return null;
    const sell = parseFloat(String(usd.sell).replace(/,/g, ""));
    return Number.isFinite(sell) ? Math.round(sell) : null;
  } catch {
    return null;
  }
}

/**
 * SBV central reference rate (tỷ giá trung tâm) for USD/VND.
 *
 * NOTE: the State Bank of Vietnam does not expose a free, clean public API for
 * the central rate (sources require login/subscription or are JS-rendered). So
 * this is a manually-maintained value: set the `SBV_CENTRAL_RATE` env var to
 * update it (Vercel → Settings → Environment Variables), otherwise the fallback
 * below (as of 2026-10) is used. The central rate moves slowly day-to-day.
 */
const SBV_CENTRAL_FALLBACK = 25638;

export function getSbvCentralUsd(): number {
  const raw = (process.env.SBV_CENTRAL_RATE ?? "").replace(/[,\s]/g, "");
  const env = parseFloat(raw);
  return Number.isFinite(env) && env > 0 ? Math.round(env) : SBV_CENTRAL_FALLBACK;
}

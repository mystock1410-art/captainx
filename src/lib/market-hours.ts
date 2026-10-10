// Market-session open/closed checks, centralised so the VN-futures and
// index/commodity hours live in one place instead of being copied across
// derivatives-grid.tsx (×2) and chart-card.tsx. All comparisons are in UTC.

function nowUtc(): { day: number; mins: number } {
  const d = new Date();
  return { day: d.getUTCDay(), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** VN30 futures: Mon–Fri 08:45–14:45 ICT (= 01:45–07:45 UTC). */
export function isVnFuturesMarketOpen(): boolean {
  const { day, mins } = nowUtc();
  if (day === 0 || day === 6) return false;
  return mins >= 105 && mins < 465;
}

/** Open/closed indicator for a ChartsGrid slot. */
export function isMarketOpen(slot: string): boolean {
  const { day, mins } = nowUtc();

  if (slot === "vnindex") {
    // HOSE: Mon–Fri 02:15–09:00 UTC (09:15–16:00 ICT/GMT+7)
    if (day === 0 || day === 6) return false;
    return mins >= 135 && mins < 540;
  }
  if (slot === "dji" || slot === "ym") {
    // NYSE/CME: Mon–Fri 13:30–20:00 UTC (pre/regular combined)
    if (day === 0 || day === 6) return false;
    return mins >= 810 && mins < 1200;
  }
  if (slot === "wti") {
    // WTI futures trade nearly 24h: Sun 23:00 – Fri 22:00 UTC
    if (day === 6) return false; // closed Saturday
    if (day === 0) return mins >= 1380; // Sun from 23:00
    return mins < 1320 || mins >= 1380; // weekdays: closed 22:00–23:00 UTC
  }
  if (slot === "coffee") {
    // ICE Coffee C (KC): Mon–Fri ~04:15–13:30 ET → ~08:15–18:30 UTC
    // (broadened to span both EST/EDT). Weekends closed.
    if (day === 0 || day === 6) return false;
    return mins >= 495 && mins < 1110;
  }
  if (slot === "wtioil" || slot === "btc") {
    // Hyperliquid perps — 24/7
    return true;
  }
  return false;
}

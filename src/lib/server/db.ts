import mysql from "mysql2/promise";
import type { MarketAnalyzeData } from "./market-analyze";

/**
 * MySQL access for the self-hosted VPS. The pool is created lazily and the
 * whole module degrades to a no-op when no DB is configured — so the app runs
 * fine without a database (local dev, or before the DB is provisioned).
 *
 * Configure via DATABASE_URL (mysql://user:pass@host:port/db) or the discrete
 * DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME env vars.
 */

let pool: mysql.Pool | null | undefined; // undefined = not initialised, null = not configured

function isConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.DB_HOST);
}

export function getPool(): mysql.Pool | null {
  if (pool !== undefined) return pool;
  if (!isConfigured()) {
    pool = null;
    return null;
  }
  try {
    pool = process.env.DATABASE_URL
      ? mysql.createPool(process.env.DATABASE_URL)
      : mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 5,
          maxIdle: 2,
          idleTimeout: 60_000,
          charset: "utf8mb4",
        });
  } catch (e) {
    console.warn("[DB] pool creation failed:", e);
    pool = null;
  }
  return pool;
}

export function dbEnabled(): boolean {
  return getPool() !== null;
}

/* -------------------------------- Leads -------------------------------- */

export type LeadRow = {
  email: string;
  phone: string;
  account: string;
  location: string;
  ip: string | null;
  userAgent: string | null;
};

/** Persist a lead. Never throws — returns false if DB is off or the write fails. */
export async function insertLead(lead: LeadRow): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.execute(
      "INSERT INTO leads (email, phone, account, location, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
      [lead.email, lead.phone, lead.account, lead.location, lead.ip, lead.userAgent],
    );
    return true;
  } catch (e) {
    console.warn("[DB] insertLead failed:", e);
    return false;
  }
}

/* ---------------------------- Market snapshots ---------------------------- */

/** Store one market snapshot (ts in UTC). Never throws. */
export async function insertSnapshot(m: MarketAnalyzeData): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.execute(
      `INSERT INTO market_snapshots
         (ts, exchange, gtgd, advance, decline, unchanged, not_traded,
          foreign_buy_top20, foreign_sell_top20, foreign_diff,
          net_buy, net_sell, liquidity_points)
       VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.exchange,
        m.gtgd,
        m.breadth.advance,
        m.breadth.decline,
        m.breadth.unchanged,
        m.breadth.notTraded,
        m.foreign.buyTop20,
        m.foreign.sellTop20,
        m.foreign.diff,
        JSON.stringify(m.foreign.netBuy),
        JSON.stringify(m.foreign.netSell),
        JSON.stringify(m.liquidity.points),
      ],
    );
    return true;
  } catch (e) {
    console.warn("[DB] insertSnapshot failed:", e);
    return false;
  }
}

/**
 * GTGD recorded at (or just before) the current time-of-day in a PREVIOUS
 * trading session — powers the "so cùng giờ phiên trước" comparison. Returns
 * null until at least one earlier session has been collected. Times compared in
 * ICT (+07:00); ts is stored in UTC.
 */
export async function getPrevSessionGtgd(exchange = "HOSE"): Promise<number | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const [rows] = await p.query(
      `SELECT gtgd FROM market_snapshots
        WHERE exchange = ?
          AND DATE(CONVERT_TZ(ts, '+00:00', '+07:00')) < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
          AND TIME(CONVERT_TZ(ts, '+00:00', '+07:00')) <= TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
        ORDER BY ts DESC
        LIMIT 1`,
      [exchange],
    );
    const row = (rows as Array<{ gtgd: number | string }>)[0];
    return row ? Number(row.gtgd) : null;
  } catch (e) {
    console.warn("[DB] getPrevSessionGtgd failed:", e);
    return null;
  }
}

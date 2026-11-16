-- Captain X — MySQL schema (run once on the VPS database `captainx`).
--   mysql -u captainx -p captainx < scripts/schema.sql
-- Works on MySQL 8+ and MariaDB 10.4+.

CREATE TABLE IF NOT EXISTS leads (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(64)  NOT NULL,
  account     VARCHAR(128) NOT NULL,
  location    VARCHAR(255) NOT NULL,
  ip          VARCHAR(64)  NULL,
  user_agent  VARCHAR(400) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leads_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS market_snapshots (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ts                  DATETIME       NOT NULL,              -- UTC (app inserts UTC_TIMESTAMP())
  exchange            VARCHAR(16)    NOT NULL DEFAULT 'HOSE',
  gtgd                DECIMAL(16,2)  NOT NULL,              -- tỷ đồng
  advance             INT            NOT NULL,
  decline             INT            NOT NULL,
  unchanged           INT            NOT NULL,
  not_traded          INT            NOT NULL,
  foreign_buy_top20   DECIMAL(16,2)  NOT NULL,
  foreign_sell_top20  DECIMAL(16,2)  NOT NULL,
  foreign_diff        DECIMAL(16,2)  NOT NULL,
  net_buy             JSON           NULL,                 -- [{symbol,value}]
  net_sell            JSON           NULL,
  liquidity_points    JSON           NULL,                 -- [{t,value}]
  INDEX idx_snap_ex_ts (exchange, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

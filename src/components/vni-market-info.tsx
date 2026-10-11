"use client";

import { useMemo } from "react";
import { usePolling } from "@/hooks/use-polling";
import { isMarketOpen } from "@/lib/market-hours";
import { api, type MarketAnalyze, type ForeignFlow } from "@/lib/api";
import { cn } from "@/lib/utils";

const PURPLE = "#8b5cf6";

function fmtTy(n: number, signed = false): string {
  const s = Math.abs(n).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (signed) return `${n < 0 ? "−" : n > 0 ? "+" : ""}${s}`;
  return s;
}

export function VniMarketInfo() {
  const open = isMarketOpen("vnindex");
  const { data, loading, error } = usePolling<MarketAnalyze>(
    (signal) => api.marketAnalyze(signal),
    open ? 20_000 : 300_000,
    [open],
  );

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-l-2 border-gold pl-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          VNI Daily Market Info
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          HOSE · Tỷ đồng{data?.asOf ? ` · ${data.asOf}` : ""}
        </span>
      </div>

      <div className="card-elevated space-y-4 rounded-sm p-3 sm:p-4">
        {error && !data ? (
          <p className="py-6 text-center text-sm text-down">Lỗi tải dữ liệu: {error}</p>
        ) : !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {loading ? "Đang tải dữ liệu thị trường…" : "Chưa có dữ liệu."}
          </p>
        ) : (
          <>
            <ForeignBlock data={data} />
            <LiquidityBlock data={data} />
            <BreadthBlock data={data} />
          </>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Foreign ------------------------------ */

function ForeignBlock({ data }: { data: MarketAnalyze }) {
  const { buyTop20, sellTop20, diff, netBuy, netSell } = data.foreign;
  const maxAbs = useMemo(() => {
    const all = [...netBuy, ...netSell].map((f) => Math.abs(f.value));
    return all.length ? Math.max(...all) : 1;
  }, [netBuy, netSell]);

  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
        Top 5 giao dịch khối ngoại
      </h4>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Mua Top 20" value={fmtTy(buyTop20)} tone="up" />
        <Tile label="Bán Top 20" value={fmtTy(sellTop20)} tone="down" />
        <Tile label="Chênh lệch" value={fmtTy(diff, true)} tone={diff >= 0 ? "up" : "down"} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-up">
            Mua ròng
          </div>
          <div className="space-y-1">
            {netBuy.length ? (
              netBuy.map((f) => <FlowRow key={f.symbol} flow={f} maxAbs={maxAbs} side="buy" />)
            ) : (
              <p className="text-[11px] text-muted-foreground">—</p>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-down sm:text-left">
            Bán ròng
          </div>
          <div className="space-y-1">
            {netSell.length ? (
              netSell.map((f) => <FlowRow key={f.symbol} flow={f} maxAbs={maxAbs} side="sell" />)
            ) : (
              <p className="text-[11px] text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: "up" | "down" }) {
  return (
    <div className="rounded-sm bg-muted/40 px-2 py-1.5">
      <div className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-mono text-sm font-bold tabular-nums sm:text-base",
          tone === "up" ? "text-up" : "text-down",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FlowRow({ flow, maxAbs, side }: { flow: ForeignFlow; maxAbs: number; side: "buy" | "sell" }) {
  const pct = `${Math.max(3, (Math.abs(flow.value) / maxAbs) * 100)}%`;
  const bar = side === "buy" ? "bg-up/70" : "bg-down/70";
  const txt = side === "buy" ? "text-up" : "text-down";
  const val = (
    <span className={cn("w-[4.5rem] shrink-0 font-mono text-[12px] tabular-nums", txt)}>
      {fmtTy(flow.value)}
    </span>
  );
  const sym = <span className="w-10 shrink-0 font-mono text-[13px] font-bold">{flow.symbol}</span>;
  const track = (
    <div className="relative h-2 min-w-0 flex-1 rounded-sm bg-muted">
      <div
        className={cn("absolute inset-y-0 rounded-sm", bar, side === "buy" ? "right-0" : "left-0")}
        style={{ width: pct }}
      />
    </div>
  );
  // Diverging layout: buys grow toward the centre (value | bar | symbol),
  // sells grow outward (symbol | bar | value).
  return side === "buy" ? (
    <div className="flex items-center gap-2">
      {val}
      {track}
      <span className="w-10 shrink-0 text-right font-mono text-[13px] font-bold">{flow.symbol}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {sym}
      {track}
      <span className={cn("w-[4.5rem] shrink-0 text-right font-mono text-[12px] tabular-nums", txt)}>
        {fmtTy(flow.value)}
      </span>
    </div>
  );
}

/* ---------------------------- Liquidity ----------------------------- */

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const step = mag / 2; // halves give 0 / mid / max gridlines
  return Math.ceil(n / step) * step;
}

function LiquidityBlock({ data }: { data: MarketAnalyze }) {
  const pts = data.liquidity.points;
  const niceMax = niceCeil(data.gtgd || (pts.length ? pts[pts.length - 1].value : 0));

  const { line, area, xTicks } = useMemo(() => {
    if (!pts.length) return { line: "", area: "", xTicks: [] as { frac: number; label: string }[] };
    const first = pts[0].t;
    const vnDayStart = Math.floor((first + 7 * 3600) / 86400) * 86400 - 7 * 3600;
    const openSec = vnDayStart + 9 * 3600;
    const closeSec = vnDayStart + 15 * 3600;
    const span = closeSec - openSec || 1;
    const xf = (t: number) => Math.min(1, Math.max(0, (t - openSec) / span)) * 100;
    const yf = (v: number) => 100 - Math.min(1, v / niceMax) * 100;
    const coords = pts.map((p) => [xf(p.t), yf(p.value)] as const);
    const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const area = `${line} L${coords[coords.length - 1][0].toFixed(2)} 100 L${coords[0][0].toFixed(2)} 100 Z`;
    const xTicks = [
      { frac: 0, label: "09:00" },
      { frac: 2.5 / 6, label: "11:30" },
      { frac: 4 / 6, label: "13:00" },
      { frac: 1, label: "15:00" },
    ];
    return { line, area, xTicks };
  }, [pts, niceMax]);

  return (
    <div className="border-t border-border pt-3">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
        Thanh khoản thị trường
      </h4>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            GTGD phiên gần nhất
          </div>
          <div className="font-mono text-2xl font-bold leading-tight tabular-nums sm:text-[28px]">
            {fmtTy(data.gtgd)}
            <span className="ml-1 text-base font-semibold text-muted-foreground">tỷ</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            So cùng giờ phiên trước
          </div>
          <div className="font-mono text-sm text-muted-foreground">—</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2 pb-5">
        <div className="flex w-12 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[9px] text-muted-foreground">
          <span>{fmtTy(niceMax)}</span>
          <span>{fmtTy(niceMax / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative h-28 min-w-0 flex-1">
          {pts.length ? (
            <>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                {/* lunch break band 11:30–13:00 */}
                <rect x={(2.5 / 6) * 100} y="0" width={(1.5 / 6) * 100} height="100" fill="currentColor" className="text-muted/40" />
                {[0, 50, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <path d={area} fill={PURPLE} fillOpacity={0.18} />
                <path
                  d={line}
                  fill="none"
                  stroke={PURPLE}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="pointer-events-none absolute inset-x-0 -bottom-5 h-4 font-mono text-[9px] text-muted-foreground">
                {xTicks.map((t) => (
                  <span
                    key={t.label}
                    className="absolute -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${t.frac * 100}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
              Chưa có dữ liệu thanh khoản
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: PURPLE }} />
        Phiên gần nhất{data.asOf ? ` · ${data.asOf}` : ""}
      </div>
    </div>
  );
}

/* ----------------------------- Breadth ------------------------------ */

function BreadthBlock({ data }: { data: MarketAnalyze }) {
  const { advance, decline, unchanged, notTraded } = data.breadth;
  const total = advance + decline + unchanged || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="border-t border-border pt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>CP · Chưa GD {notTraded}</span>
        {data.asOf && <span className="font-mono normal-case">{data.asOf}</span>}
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-down" style={{ width: pct(decline) }} />
        <div className="bg-ref" style={{ width: pct(unchanged) }} />
        <div className="bg-up" style={{ width: pct(advance) }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-sm font-bold tabular-nums">
        <span className="text-down">Giảm: {decline}</span>
        <span className="text-ref">Đứng giá: {unchanged}</span>
        <span className="text-up">Tăng: {advance}</span>
      </div>
    </div>
  );
}

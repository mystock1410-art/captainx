"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { formatPct, formatPrice, cn } from "@/lib/utils";

// Market session hours in UTC for open/closed indicator
// Returns true if the market is currently open
function isMarketOpen(slot: string): boolean {
  const now = new Date();
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const utcMins = utcH * 60 + utcM;
  const day = now.getUTCDay(); // 0=Sun, 6=Sat

  if (slot === "vnindex") {
    // HOSE: Mon-Fri 02:15–09:00 UTC (09:15–16:00 ICT/GMT+7)
    if (day === 0 || day === 6) return false;
    return utcMins >= 135 && utcMins < 540;
  }
  if (slot === "dji" || slot === "ym") {
    // NYSE/CME: Mon-Fri 13:30–20:00 UTC (pre/regular combined)
    if (day === 0 || day === 6) return false;
    return utcMins >= 810 && utcMins < 1200;
  }
  if (slot === "wti") {
    // WTI futures trade nearly 24h Sun 23:00 – Fri 22:00 UTC
    if (day === 6) return false; // closed Saturday
    if (day === 0) return utcMins >= 1380; // Sun from 23:00
    return utcMins < 1320 || utcMins >= 1380; // weekdays: closed 22:00-23:00 UTC
  }
  return false;
}

type Props = {
  slot: string;
  label: string;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  t: number[];
  c: number[];
  loading?: boolean;
  error?: string | null;
};

export function ChartCard({
  slot, label, name, symbol, price, change, changePct, t, c, loading, error,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const { resolvedTheme } = useTheme();
  const up = (changePct ?? 0) >= 0;
  const open = isMarketOpen(slot);

  // For VNINDEX, display times in GMT+7; others in exchange local via UTC offset
  const tzOffset = slot === "vnindex" ? 7 * 3600 : 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = resolvedTheme === "dark";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 93,
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
        fontSize: 9,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        ...(tzOffset !== 0 ? { tickMarkFormatter: (time: number) => {
          const d = new Date((time + tzOffset) * 1000);
          return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
        }} : {}),
      },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScale: false,
      handleScroll: false,
    });
    chartRef.current = chart;

    const upColor = isDark ? "#22c55e" : "#16a34a";
    const downColor = isDark ? "#ef4444" : "#dc2626";
    const color = up ? upColor : downColor;

    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color + "55",
      bottomColor: color + "00",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [resolvedTheme, up, tzOffset]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data = t
      .map((time, i) => ({ time: time as UTCTimestamp, value: c[i] }))
      .filter((p) => Number.isFinite(p.value));
    seriesRef.current.setData(data);
    if (data.length > 0) chartRef.current?.timeScale().fitContent();
  }, [t, c]);

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="mb-0.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              open ? "bg-green-500" : "bg-red-500"
            )}
            title={open ? "Đang giao dịch" : "Đóng cửa"}
          />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">{symbol}</span>
      </div>
      <div className="mb-1">
        <div className="text-[9px] text-muted-foreground leading-tight">{name}</div>
        <div className="flex items-baseline gap-1.5">
          {price !== null ? (
            <>
              <span className="font-mono text-sm font-bold tabular-nums">
                {formatPrice(price)}
              </span>
              {changePct !== null && change !== null && (
                <span
                  className={cn(
                    "font-mono text-[9px] font-medium tabular-nums",
                    up ? "text-up" : "text-down"
                  )}
                >
                  {formatPct(changePct)} ({change >= 0 ? "+" : ""}
                  {change.toFixed(2)})
                </span>
              )}
            </>
          ) : loading ? (
            <span className="text-[9px] text-muted-foreground">Đang tải…</span>
          ) : error ? (
            <span className="text-[9px] text-down">Lỗi</span>
          ) : (
            <span className="text-[9px] text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="h-[93px] w-full" />
    </div>
  );
}

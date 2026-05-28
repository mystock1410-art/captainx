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

type Props = {
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
  label, name, symbol, price, change, changePct, t, c, loading, error,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const { resolvedTheme } = useTheme();
  const up = (changePct ?? 0) >= 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = resolvedTheme === "dark";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 140,
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "#a1a1aa" : "#71717a",
        fontSize: 10,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
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
      lineWidth: 2,
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
  }, [resolvedTheme, up]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data = t
      .map((time, i) => ({ time: time as UTCTimestamp, value: c[i] }))
      .filter((p) => Number.isFinite(p.value));
    seriesRef.current.setData(data);
    if (data.length > 0) chartRef.current?.timeScale().fitContent();
  }, [t, c]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{symbol}</span>
      </div>
      <div className="mb-2">
        <div className="text-xs text-muted-foreground">{name}</div>
        <div className="flex items-baseline gap-2">
          {price !== null ? (
            <>
              <span className="font-mono text-xl font-bold tabular-nums">
                {formatPrice(price)}
              </span>
              {changePct !== null && change !== null && (
                <span
                  className={cn(
                    "font-mono text-xs font-medium tabular-nums",
                    up ? "text-up" : "text-down"
                  )}
                >
                  {formatPct(changePct)} ({change >= 0 ? "+" : ""}
                  {change.toFixed(2)})
                </span>
              )}
            </>
          ) : loading ? (
            <span className="text-xs text-muted-foreground">Đang tải…</span>
          ) : error ? (
            <span className="text-xs text-down">Lỗi</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="h-[140px] w-full" />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { usePolling } from "@/hooks/use-polling";
import { api, type DerivativeQuote } from "@/lib/api";
import { formatChange, formatPct, formatPrice, cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  VN30F1M: "VN30 · 1 THÁNG",
  VN30F2M: "VN30 · 2 THÁNG",
  VN30F1Q: "VN30 · QUÝ GẦN",
};

// VN derivatives market: Mon-Fri 08:45-14:45 ICT (= 01:45-07:45 UTC)
function isVnFuturesMarketOpen(): boolean {
  const d = new Date();
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 105 && mins < 465;
}

export function DerivativesGrid() {
  // Re-evaluate market state every minute so the polling cadence
  // tightens automatically when the bell rings.
  const [marketOpen, setMarketOpen] = useState<boolean>(() => isVnFuturesMarketOpen());
  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isVnFuturesMarketOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data } = usePolling<DerivativeQuote[]>(
    (signal) => api.derivatives(signal),
    marketOpen ? 1_000 : 60_000,
    [marketOpen],
  );

  const items = data ?? [];

  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2 border-l-2 border-gold pl-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          Phái Sinh · VN30 Futures
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <>
            <CardSkeleton symbol="VN30F1M" />
            <CardSkeleton symbol="VN30F2M" />
            <CardSkeleton symbol="VN30F1Q" />
          </>
        ) : (
          items.map((q) => <DerivativeCard key={q.symbol} quote={q} />)
        )}
      </div>
    </section>
  );
}

function CardSkeleton({ symbol }: { symbol: string }) {
  const label = LABELS[symbol] ?? symbol;
  return (
    <div className="card-elevated rounded-sm p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
        <span className="inline-flex h-[18px] shrink-0 items-center justify-center rounded-sm bg-gold/15 px-1 text-[9px] font-bold uppercase tracking-wider text-gold">
          F
        </span>
        <span className="font-mono text-[15px] font-bold tracking-[0.04em] text-foreground">
          {symbol}
        </span>
        <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mb-1.5 text-[11px] text-muted-foreground">Đang tải…</div>
      <div className="h-[80px] w-full" />
    </div>
  );
}

function DerivativeCard({ quote }: { quote: DerivativeQuote }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const { resolvedTheme } = useTheme();

  const hasData = quote.price != null && quote.changePct != null;
  const up = hasData && (quote.changePct ?? 0) >= 0;
  const flat = hasData && (quote.change ?? 0) === 0;
  const label = LABELS[quote.symbol] ?? quote.symbol;

  // VN tone: green up · red down · gold flat (giá tham chiếu)
  const toneTxt = !hasData ? "text-muted-foreground" : flat ? "text-gold" : up ? "text-up" : "text-down";

  // VN futures trade Mon-Fri 08:45–14:45 ICT (UTC+7) = 01:45–07:45 UTC
  const isOpen = (() => {
    const d = new Date();
    const day = d.getUTCDay();
    if (day === 0 || day === 6) return false;
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    return mins >= 105 && mins < 465;
  })();

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = resolvedTheme === "dark";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 80,
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
        tickMarkFormatter: (time: number) => {
          // VN time = UTC+7
          const dd = new Date((time + 7 * 3600) * 1000);
          return `${String(dd.getUTCHours()).padStart(2, "0")}:${String(dd.getUTCMinutes()).padStart(2, "0")}`;
        },
      },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScale: false,
      handleScroll: false,
    });
    chartRef.current = chart;

    const upColor = isDark ? "#22c55e" : "#16a34a";
    const downColor = isDark ? "#ef4444" : "#dc2626";
    const flatColor = "#E4A025";
    const color = flat ? flatColor : up ? upColor : downColor;

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
  }, [resolvedTheme, up, flat]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const t = quote.t ?? [];
    const c = quote.c ?? [];
    const data = t
      .map((time, i) => ({ time: time as UTCTimestamp, value: c[i] }))
      .filter((p) => Number.isFinite(p.value));
    seriesRef.current.setData(data);
    if (data.length > 0) chartRef.current?.timeScale().fitContent();
  }, [quote.t, quote.c]);

  return (
    <div className="card-elevated rounded-sm p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            isOpen ? "bg-up" : "bg-muted-foreground"
          )}
          title={isOpen ? "Đang giao dịch" : "Đóng cửa"}
        />
        <span className="inline-flex h-[18px] shrink-0 items-center justify-center rounded-sm bg-gold/15 px-1 text-[9px] font-bold uppercase tracking-wider text-gold">
          F
        </span>
        <span className="font-mono text-[15px] font-bold tracking-[0.04em] text-foreground">
          {quote.symbol}
        </span>
        <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="mb-1.5 flex items-baseline gap-2 whitespace-nowrap">
        {hasData ? (
          <>
            <span className={cn("font-mono text-base font-bold tabular-nums", toneTxt)}>
              {formatPrice(quote.price!)}
            </span>
            {quote.change != null && (
              <span className={cn("font-mono text-[11px] tabular-nums", toneTxt)}>
                {formatChange(quote.change)}
              </span>
            )}
            <span className={cn("font-mono text-[11px] font-semibold tabular-nums", toneTxt)}>
              {formatPct(quote.changePct!)}
            </span>
            {quote.prev != null && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Ref {formatPrice(quote.prev)}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">Đang tải…</span>
        )}
      </div>

      <div ref={containerRef} className="h-[80px] w-full" />
    </div>
  );
}

"use client";

import { usePolling } from "@/hooks/use-polling";
import { api, type WorldQuote } from "@/lib/api";
import { formatPct, formatPrice, cn } from "@/lib/utils";

export function WorldTicker() {
  const { data, loading, error } = usePolling<WorldQuote[]>(
    (signal) => api.worldQuotes(signal),
    60_000,
    [],
  );

  const quotes = data ?? [];

  if (error && quotes.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-down">
        Lỗi tải chỉ số thế giới: {error}
      </div>
    );
  }
  if (loading && quotes.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Đang tải chỉ số thế giới…
      </div>
    );
  }

  const doubled = [...quotes, ...quotes];

  return (
    <div className="marquee-pause overflow-hidden rounded-md border border-border bg-card">
      <div className="marquee-track py-2">
        {doubled.map((q, i) => (
          <WorldChip key={`${q.symbol}-${i}`} quote={q} />
        ))}
      </div>
    </div>
  );
}

function WorldChip({ quote }: { quote: WorldQuote }) {
  const hasData = quote.price !== null && quote.changePct !== null;
  const up = hasData && (quote.changePct ?? 0) >= 0;
  return (
    <div className="mx-2 inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          hasData ? (up ? "bg-up" : "bg-down") : "bg-muted-foreground",
        )}
      />
      <span className="font-medium text-foreground">{quote.label}</span>
      {hasData ? (
        <>
          <span className="font-mono tabular-nums">{formatPrice(quote.price!)}</span>
          <span
            className={cn(
              "font-mono tabular-nums font-medium",
              up ? "text-up" : "text-down",
            )}
          >
            {formatPct(quote.changePct!)}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}

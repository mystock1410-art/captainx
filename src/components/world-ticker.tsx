"use client";

import { usePolling } from "@/hooks/use-polling";
import { api, type WorldCategory, type WorldQuote } from "@/lib/api";
import { formatChange, formatPct, formatPrice, cn } from "@/lib/utils";

const CATEGORIES: { key: WorldCategory; label: string }[] = [
  { key: "asia", label: "Asia" },
  { key: "europe", label: "Europe" },
  { key: "crypto", label: "Crypto" },
  { key: "rates", label: "Rates" },
  { key: "commodities", label: "Commodities" },
  { key: "fx", label: "FX" },
];

export function WorldTicker() {
  const { data, loading, error } = usePolling<WorldQuote[]>(
    (signal) => api.worldQuotes(signal),
    30_000,
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

  const grouped: Record<WorldCategory, WorldQuote[]> = {
    asia: [],
    europe: [],
    crypto: [],
    rates: [],
    commodities: [],
    fx: [],
  };
  for (const q of quotes) grouped[q.category]?.push(q);

  return (
    <div className="card-elevated divide-y divide-border rounded-sm">
      <div className="flex items-center px-3 py-1.5">
        <div className="flex items-center border-l-2 border-gold pl-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Global Markets
          </h3>
        </div>
      </div>
      {CATEGORIES.map(({ key, label }) => {
        const items = grouped[key];
        if (!items || items.length === 0) return null;
        return (
          <div key={key} className="flex items-center gap-3 px-3 py-2">
            <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              {label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {items.map((q) => (
                <WorldChip key={q.symbol} quote={q} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorldChip({ quote }: { quote: WorldQuote }) {
  const hasData = quote.price !== null && quote.changePct !== null;
  const up = hasData && (quote.changePct ?? 0) >= 0;
  return (
    <div className="chip-elevated inline-flex items-baseline gap-2 rounded-sm px-2.5 py-1">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 self-center rounded-full",
          hasData ? (up ? "bg-up" : "bg-down") : "bg-muted-foreground",
        )}
      />
      <span className="text-[15px] font-bold tracking-[0.02em] text-foreground">
        {quote.label}
      </span>
      {hasData ? (
        <>
          <span className="font-mono text-base font-bold tabular-nums">
            {formatPrice(quote.price!)}
          </span>
          {quote.change != null && (
            <span
              className={cn(
                "font-mono text-[12px] font-semibold tabular-nums",
                up ? "text-up" : "text-down",
              )}
            >
              {formatChange(quote.change)}
            </span>
          )}
          <span
            className={cn(
              "font-mono text-[12px] font-semibold tabular-nums",
              up ? "text-up" : "text-down",
            )}
          >
            {formatPct(quote.changePct!)}
          </span>
        </>
      ) : (
        <span className="text-[12px] text-muted-foreground">—</span>
      )}
    </div>
  );
}

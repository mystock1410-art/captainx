"use client";

import { usePolling } from "@/hooks/use-polling";
import { api, type WorldCategory, type WorldQuote } from "@/lib/api";
import { formatChange, formatChangeInt, formatPct, formatPrice, formatPriceInt, cn } from "@/lib/utils";

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
          <div
            key={key}
            className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand sm:w-20 sm:text-[11px] md:w-24">
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
  const hasPrice = quote.price !== null;
  const hasChange = quote.changePct !== null;
  const up = hasChange && (quote.changePct ?? 0) >= 0;
  const unitValue = !!quote.unit; // large integer values (e.g. VND/kg, VND rates) render without decimals
  return (
    <div className="chip-elevated inline-flex items-baseline gap-1.5 rounded-sm px-2 py-1 sm:gap-2 sm:px-2.5">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 self-center rounded-full",
          !hasPrice ? "bg-muted-foreground" : !hasChange ? "bg-gold" : up ? "bg-up" : "bg-down",
        )}
      />
      <span className="text-[12px] font-bold tracking-[0.02em] text-foreground sm:text-[14px] md:text-[15px]">
        {quote.label}
      </span>
      {hasPrice ? (
        <>
          <span className="font-mono text-[13px] font-bold tabular-nums sm:text-[15px] md:text-base">
            {unitValue ? formatPriceInt(quote.price!) : formatPrice(quote.price!)}
          </span>
          {quote.unit && (
            <span className="font-mono text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              {quote.unit}
            </span>
          )}
          {quote.change != null && (
            <span
              className={cn(
                "font-mono text-[10px] font-semibold tabular-nums sm:text-[11px] md:text-[12px]",
                up ? "text-up" : "text-down",
              )}
            >
              {unitValue ? formatChangeInt(quote.change) : formatChange(quote.change)}
            </span>
          )}
          {hasChange && (
            <span
              className={cn(
                "font-mono text-[10px] font-semibold tabular-nums sm:text-[11px] md:text-[12px]",
                up ? "text-up" : "text-down",
              )}
            >
              {formatPct(quote.changePct!)}
            </span>
          )}
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground sm:text-[12px]">—</span>
      )}
    </div>
  );
}

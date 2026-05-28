"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePolling } from "@/hooks/use-polling";
import { api, type Quote } from "@/lib/api";
import { formatPct, formatPrice, cn } from "@/lib/utils";
import { WatchlistModal } from "./watchlist-modal";

export function TickerBar() {
  const { symbols, hydrated, add, remove, reorder, reset } = useWatchlist();
  const [open, setOpen] = useState(false);

  const key = useMemo(() => symbols.join(","), [symbols]);
  const { data, loading, error } = usePolling<Quote[]>(
    (signal) => api.quotes(symbols, signal),
    20_000,
    [key, hydrated],
  );

  const quotes = data ?? [];

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {hydrated && quotes.map((q) => <TickerChip key={q.symbol} quote={q} />)}
          {(!hydrated || (loading && quotes.length === 0)) && (
            <div className="text-xs text-muted-foreground">Đang tải watchlist…</div>
          )}
          {error && quotes.length === 0 && (
            <div className="text-xs text-down">Lỗi API: {error}</div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Sửa</span>
        </button>
      </div>

      <WatchlistModal
        open={open}
        onClose={() => setOpen(false)}
        symbols={symbols}
        onAdd={add}
        onRemove={remove}
        onReorder={reorder}
        onReset={reset}
      />
    </div>
  );
}

function TickerChip({ quote }: { quote: Quote }) {
  const hasData = quote.price !== null && quote.changePct !== null;
  const up = hasData && (quote.changePct ?? 0) >= 0;
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          hasData ? (up ? "bg-up" : "bg-down") : "bg-muted-foreground"
        )}
      />
      <span className="font-mono font-semibold">{quote.symbol}</span>
      {hasData ? (
        <>
          <span className="font-mono tabular-nums">{formatPrice(quote.price!)}</span>
          <span
            className={cn(
              "font-mono tabular-nums font-medium",
              up ? "text-up" : "text-down"
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

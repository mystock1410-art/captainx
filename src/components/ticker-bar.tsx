"use client";

import { useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePolling } from "@/hooks/use-polling";
import { api, type Quote } from "@/lib/api";
import { formatChange, formatPct, formatPrice, cn } from "@/lib/utils";
import { WatchlistModal } from "./watchlist-modal";

// VN price-board convention:
//   trần (ceiling) → tím · sàn (floor) → xanh lơ · tham chiếu → vàng
//   tăng → xanh lá · giảm → đỏ
type PriceTone = "ceiling" | "floor" | "ref" | "up" | "down" | "none";

function toneOf(q: Quote): PriceTone {
  if (q.price == null) return "none";
  if (q.ceiling != null && q.price >= q.ceiling) return "ceiling";
  if (q.floor != null && q.price <= q.floor) return "floor";
  if (q.ref != null && q.price === q.ref) return "ref";
  if (q.change != null && q.change > 0) return "up";
  if (q.change != null && q.change < 0) return "down";
  return "ref";
}

const TONE_TEXT: Record<PriceTone, string> = {
  ceiling: "text-ceiling",
  floor: "text-floor",
  ref: "text-ref",
  up: "text-up",
  down: "text-down",
  none: "text-muted-foreground",
};

const TONE_RING: Record<PriceTone, string> = {
  ceiling: "ring-ceiling/40",
  floor: "ring-floor/40",
  ref: "ring-ref/40",
  up: "ring-up/40",
  down: "ring-down/40",
  none: "ring-border",
};

export function TickerBar() {
  const { symbols, hydrated, add, remove, reset } = useWatchlist();
  const [open, setOpen] = useState(false);

  const key = useMemo(() => symbols.join(","), [symbols]);
  const { data, loading, error } = usePolling<Quote[]>(
    (signal) => api.quotes(symbols, signal),
    3_000,
    [key, hydrated],
  );

  const quotes = data ?? [];

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] items-start gap-3 px-4 py-2.5">
        <div className="mt-0.5 hidden shrink-0 self-stretch border-l-2 border-gold pl-2.5 lg:flex lg:items-center">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Watchlist
          </h3>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {hydrated && quotes.map((q) => <TickerChip key={q.symbol} quote={q} />)}
          {(!hydrated || (loading && quotes.length === 0)) && (
            <div className="col-span-full text-xs text-muted-foreground">Đang tải watchlist…</div>
          )}
          {error && quotes.length === 0 && (
            <div className="col-span-full text-xs text-down">Lỗi API: {error}</div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="cta-border inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
        >
          <span className="cta-dot inline-block h-1.5 w-1.5 rounded-full bg-gold" />
          <Settings2 className="cta-blink h-3 w-3" />
          <span className="cta-blink">Thêm / Xóa Mã</span>
        </button>
      </div>

      <WatchlistModal
        open={open}
        onClose={() => setOpen(false)}
        symbols={symbols}
        onAdd={add}
        onRemove={remove}
        onReset={reset}
      />
    </div>
  );
}

function TickerChip({ quote }: { quote: Quote }) {
  const hasData = quote.price !== null && quote.changePct !== null;
  const tone = toneOf(quote);
  const [stage, setStage] = useState<"local" | "cdn" | "fallback">("local");
  const ringCls = hasData ? TONE_RING[tone] : "ring-border";
  const toneTxt = hasData ? TONE_TEXT[tone] : "text-muted-foreground";
  return (
    <div className="chip-elevated inline-flex w-full items-center gap-2 overflow-hidden rounded-sm px-2.5 py-1.5">
      {stage !== "fallback" ? (
        <span
          className={cn(
            "flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-[1px] ring-1",
            ringCls
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              stage === "local"
                ? `/logos/${quote.symbol}.jpeg`
                : `https://cdn.simplize.vn/simplizevn/logo/${quote.symbol}.jpeg`
            }
            alt=""
            loading="lazy"
            onError={() => setStage(stage === "local" ? "cdn" : "fallback")}
            className="h-full w-full object-contain"
          />
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-1",
            ringCls
          )}
        >
          {quote.symbol.slice(0, 2)}
        </span>
      )}
      <span className="font-mono text-[15px] font-bold tracking-[0.04em] shrink-0">
        {quote.symbol}
      </span>
      {hasData ? (
        <div className="ml-auto flex items-baseline gap-1.5 whitespace-nowrap font-mono tabular-nums">
          <span className={cn("min-w-[5ch] text-right text-base font-bold", toneTxt)}>
            {formatPrice(quote.price!)}
          </span>
          <span className={cn("min-w-[5ch] text-right text-[12px]", toneTxt)}>
            {quote.change != null ? formatChange(quote.change) : ""}
          </span>
          <span className={cn("min-w-[6ch] text-right text-[12px] font-semibold", toneTxt)}>
            {formatPct(quote.changePct!)}
          </span>
        </div>
      ) : (
        <span className="ml-auto text-muted-foreground">—</span>
      )}
    </div>
  );
}


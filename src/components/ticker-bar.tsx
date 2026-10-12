"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePolling } from "@/hooks/use-polling";
import { isVnFuturesMarketOpen } from "@/lib/market-hours";
import { api, type IntradayCandle, type IntradaySeries, type Quote, type SymbolDepth } from "@/lib/api";
import { formatChange, formatPct, formatPrice, cn } from "@/lib/utils";
import { MiniCandles } from "./mini-candles";
import { DepthPopup } from "./depth-popup";
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

  // Live 5s refresh only during VN trading hours (Mon–Fri 08:45–14:45 ICT);
  // outside the session prices are static, so poll lazily (60s). Re-evaluate
  // the session each minute so the cadence flips at open/close automatically.
  const [marketOpen, setMarketOpen] = useState(() => isVnFuturesMarketOpen());
  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isVnFuturesMarketOpen()), 60_000);
    return () => clearInterval(id);
  }, []);
  const pollMs = marketOpen ? 5_000 : 60_000;

  const key = useMemo(() => symbols.join(","), [symbols]);
  const { data, loading, error } = usePolling<Quote[]>(
    (signal) => api.quotes(symbols, signal),
    pollMs,
    [key, hydrated, marketOpen],
  );

  // Intraday candlesticks refresh far less often than the live price (5-min
  // bars) — 60s during the session, lazily otherwise.
  const { data: candleData } = usePolling<IntradaySeries[]>(
    (signal) => (symbols.length ? api.intraday(symbols, signal) : Promise.resolve([] as IntradaySeries[])),
    marketOpen ? 60_000 : 1_800_000,
    [key, hydrated, marketOpen],
  );
  const candleMap = useMemo(() => {
    const m = new Map<string, IntradayCandle[]>();
    for (const s of candleData ?? []) m.set(s.symbol, s.candles);
    return m;
  }, [candleData]);

  // Order-book depth (3 bid + 3 ask), preloaded so the click-to-peek popup is
  // instant. Refreshes ~15s during the session (banggia is CDN-cached anyway).
  const { data: depthData } = usePolling<SymbolDepth[]>(
    (signal) => (symbols.length ? api.depth(symbols, signal) : Promise.resolve([] as SymbolDepth[])),
    marketOpen ? 15_000 : 60_000,
    [key, hydrated, marketOpen],
  );
  const depthMap = useMemo(() => {
    const m = new Map<string, SymbolDepth>();
    for (const d of depthData ?? []) m.set(d.symbol, d);
    return m;
  }, [depthData]);

  const [popup, setPopup] = useState<{ depth: SymbolDepth; rect: DOMRect } | null>(null);

  const quotes = data ?? [];

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-col items-stretch gap-2 px-4 py-2.5 lg:flex-row lg:items-start lg:gap-3">
        <div className="mt-0.5 hidden shrink-0 self-stretch border-l-2 border-gold pl-2.5 lg:flex lg:items-center">
          <h3 className="text-[16px] font-bold uppercase tracking-[0.18em] text-brand">
            Watchlist
          </h3>
        </div>
        <div className="order-2 grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] lg:order-none">
          {hydrated && quotes.map((q) => (
            <TickerChip
              key={q.symbol}
              quote={q}
              candles={candleMap.get(q.symbol) ?? []}
              onOpen={(rect) => {
                const d = depthMap.get(q.symbol);
                if (d) setPopup({ depth: d, rect });
              }}
            />
          ))}
          {(!hydrated || (loading && quotes.length === 0)) && (
            <div className="col-span-full text-xs text-muted-foreground">Đang tải watchlist…</div>
          )}
          {error && quotes.length === 0 && (
            <div className="col-span-full text-xs text-down">Lỗi API: {error}</div>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="cta-border order-1 inline-flex shrink-0 items-center gap-1.5 self-end rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider lg:order-none lg:self-auto"
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

      {popup && (
        <DepthPopup depth={popup.depth} rect={popup.rect} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}

function TickerChip({
  quote,
  candles,
  onOpen,
}: {
  quote: Quote;
  candles: IntradayCandle[];
  onOpen: (rect: DOMRect) => void;
}) {
  const hasData = quote.price !== null && quote.changePct !== null;
  const tone = toneOf(quote);
  const [stage, setStage] = useState<"local" | "cdn" | "fallback">("local");
  const ringCls = hasData ? TONE_RING[tone] : "ring-border";
  const toneTxt = hasData ? TONE_TEXT[tone] : "text-muted-foreground";
  return (
    <div
      className="chip-elevated inline-flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-sm px-2.5 py-1.5"
      role="button"
      tabIndex={0}
      title={`Xem bước giá ${quote.symbol}`}
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(e.currentTarget.getBoundingClientRect());
        }
      }}
    >
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
            "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-1",
            ringCls
          )}
        >
          {quote.symbol.slice(0, 2)}
        </span>
      )}
      <span className="font-mono text-[16px] font-bold tracking-[0.04em] shrink-0">
        {quote.symbol}
      </span>
      {/* Intraday candlestick of today's session, between the ticker and price */}
      <MiniCandles candles={candles} className="h-7 min-w-0 flex-1" />
      {hasData ? (
        <div className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap font-mono tabular-nums">
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
        <span className="shrink-0 text-muted-foreground">—</span>
      )}
    </div>
  );
}


"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { type SymbolDepth, type DepthLevel } from "@/lib/api";
import { cn } from "@/lib/utils";

const W = 248;

function fmtP(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtV(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

function toneOf(price: number, d: SymbolDepth): string {
  if (d.ceiling != null && price >= d.ceiling) return "text-ceiling";
  if (d.floor != null && price <= d.floor) return "text-floor";
  if (d.ref != null) {
    if (price > d.ref) return "text-up";
    if (price < d.ref) return "text-down";
    return "text-ref";
  }
  return "text-foreground";
}

export function DepthPopup({
  depth,
  rect,
  onClose,
}: {
  depth: SymbolDepth;
  rect: DOMRect;
  onClose: () => void;
}) {
  // Transient: any mouse move / press / scroll / key / resize dismisses it.
  // Listeners attach on the next tick so the opening click doesn't close it.
  useEffect(() => {
    let cleanup = () => {};
    const id = window.setTimeout(() => {
      const close = () => onClose();
      window.addEventListener("mousemove", close, { passive: true });
      window.addEventListener("mousedown", close, true);
      window.addEventListener("wheel", close, { passive: true });
      window.addEventListener("scroll", close, true);
      window.addEventListener("touchstart", close, { passive: true });
      window.addEventListener("keydown", close);
      window.addEventListener("resize", close);
      cleanup = () => {
        window.removeEventListener("mousemove", close);
        window.removeEventListener("mousedown", close, true);
        window.removeEventListener("wheel", close);
        window.removeEventListener("scroll", close, true);
        window.removeEventListener("touchstart", close);
        window.removeEventListener("keydown", close);
        window.removeEventListener("resize", close);
      };
    }, 0);
    return () => {
      window.clearTimeout(id);
      cleanup();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const EST_H = 150;
  let left = rect.left;
  if (left + W + 8 > vw) left = vw - W - 8;
  if (left < 8) left = 8;
  const top = vh - rect.bottom > EST_H + 8 ? rect.bottom + 4 : Math.max(8, rect.top - EST_H - 4);

  const Row = ({ lvl, side }: { lvl: DepthLevel | null; side: "bid" | "ask" }) => (
    <div className="flex items-center justify-between px-2 py-[3px] font-mono text-[12px] tabular-nums">
      <span className={cn(lvl ? toneOf(lvl.price, depth) : "text-muted-foreground")}>
        {lvl ? fmtP(lvl.price) : "—"}
      </span>
      <span className="text-muted-foreground">{lvl ? fmtV(lvl.vol) : ""}</span>
    </div>
  );

  const idx = [0, 1, 2];

  return createPortal(
    <div
      style={{ position: "fixed", left, top, width: W, zIndex: 60 }}
      className="overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl"
      role="dialog"
      aria-label={`Bước giá ${depth.symbol}`}
    >
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
        <span className="font-mono text-[14px] font-bold tracking-[0.03em]">{depth.symbol}</span>
        <span
          className={cn(
            "font-mono text-[12px] font-semibold tabular-nums",
            depth.last != null ? toneOf(depth.last, depth) : "text-muted-foreground",
          )}
        >
          {depth.last != null ? fmtP(depth.last) : "—"}
        </span>
      </div>
      {depth.bids.length === 0 && depth.asks.length === 0 ? (
        <p className="px-2.5 py-3 text-center text-[12px] text-muted-foreground">
          Chưa có dữ liệu bước giá
        </p>
      ) : (
        <div className="grid grid-cols-2">
          <div className="border-r border-border">
            <div className="border-b border-border bg-up/10 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-up">
              Mua
            </div>
            {idx.map((i) => (
              <Row key={i} lvl={depth.bids[i] ?? null} side="bid" />
            ))}
          </div>
          <div>
            <div className="border-b border-border bg-down/10 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-down">
              Bán
            </div>
            {idx.map((i) => (
              <Row key={i} lvl={depth.asks[i] ?? null} side="ask" />
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-border px-2.5 py-0.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        Giá · Khối lượng · 3 bước gần nhất
      </div>
    </div>,
    document.body,
  );
}

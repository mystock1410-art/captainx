"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating action button that re-fetches ALL live data on the page at once.
 * It dispatches a global `captainx:refresh` event which every usePolling
 * instance listens for and re-fetches immediately — no page reload.
 */
export function RefreshButton() {
  const [spinning, setSpinning] = useState(false);

  const onClick = useCallback(() => {
    setSpinning(true);
    window.dispatchEvent(new Event("captainx:refresh"));
    window.setTimeout(() => setSpinning(false), 900);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Làm mới toàn bộ dữ liệu"
      title="Làm mới dữ liệu toàn trang"
      className="cta-border fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border bg-card/90 text-brand shadow-2xl backdrop-blur transition-transform hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5"
    >
      <span className="cta-dot absolute -right-0.5 -top-0.5 inline-block h-2 w-2 rounded-full bg-gold" />
      <RefreshCw className={cn("h-5 w-5", spinning && "animate-spin")} />
    </button>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";

const KEY = "captainx.watchlist.v1";

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          setSymbols(parsed);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(symbols));
    } catch {}
  }, [symbols, hydrated]);

  const add = useCallback((sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const remove = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  const reorder = useCallback((next: string[]) => {
    setSymbols(next);
  }, []);

  const reset = useCallback(() => {
    setSymbols(DEFAULT_WATCHLIST);
  }, []);

  return { symbols, hydrated, add, remove, reorder, reset };
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";

const KEY = "captainx.watchlist.v1";

function sortSymbols(list: string[]): string[] {
  return [...new Set(list.map((s) => s.toUpperCase()))].sort((a, b) =>
    a.localeCompare(b, "en")
  );
}

export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => sortSymbols(DEFAULT_WATCHLIST));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          setSymbols(sortSymbols(parsed));
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
    setSymbols((prev) => (prev.includes(s) ? prev : sortSymbols([...prev, s])));
  }, []);

  const remove = useCallback((sym: string) => {
    setSymbols((prev) => sortSymbols(prev.filter((s) => s !== sym)));
  }, []);

  const reset = useCallback(() => {
    setSymbols(sortSymbols(DEFAULT_WATCHLIST));
  }, []);

  return { symbols, hydrated, add, remove, reset };
}

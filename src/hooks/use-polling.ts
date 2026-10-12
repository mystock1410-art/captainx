"use client";

import { useEffect, useState } from "react";

type State<T> = { data: T | null; loading: boolean; error: string | null };

export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ctrl = new AbortController();

    async function tick() {
      try {
        const data = await fetcher(ctrl.signal);
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      }
    }

    function schedule() {
      if (cancelled) return;
      // ±15% jitter so many widgets / clients don't all fire on the same beat.
      const delay = intervalMs * (0.85 + Math.random() * 0.3);
      timer = setTimeout(async () => {
        // Skip work while the tab is backgrounded — saves battery, network, and
        // upstream rate-limit budget. A visibilitychange handler catches up.
        if (typeof document === "undefined" || !document.hidden) await tick();
        schedule();
      }, delay);
    }

    function onVisible() {
      if (!cancelled && !document.hidden) tick();
    }

    // Manual full-page refresh: the floating refresh button dispatches this
    // event, and every mounted poller re-fetches immediately.
    function onRefresh() {
      if (!cancelled && (typeof document === "undefined" || !document.hidden)) tick();
    }

    tick();
    schedule();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("captainx:refresh", onRefresh);
    }

    return () => {
      cancelled = true;
      ctrl.abort();
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("captainx:refresh", onRefresh);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

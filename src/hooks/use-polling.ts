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

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      ctrl.abort();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

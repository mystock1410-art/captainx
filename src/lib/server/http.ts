// Shared fetch wrapper that enforces a timeout so a single hung upstream can't
// stall an entire Promise.all (world-quotes fans out to ~19 Yahoo calls, etc.).
// Composes with an optional caller-supplied AbortSignal.

export type FetchTimeoutInit = RequestInit & { timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  url: string,
  init: FetchTimeoutInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

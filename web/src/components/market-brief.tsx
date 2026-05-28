"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Sparkles, TrendingDown, TrendingUp, Minus, AlertTriangle, Globe, Flag } from "lucide-react";
import { api, type MarketBrief, type MarketBriefSection, type Sentiment } from "@/lib/api";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

function fmtAgo(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  return `${Math.floor(sec / 3600)} giờ trước`;
}

const SENT_LABEL: Record<Sentiment, string> = {
  bullish: "Tăng",
  bearish: "Giảm",
  neutral: "Trung lập",
};

function sentIcon(s: Sentiment) {
  return s === "bullish" ? TrendingUp : s === "bearish" ? TrendingDown : Minus;
}

function sentClasses(s: Sentiment) {
  return s === "bullish"
    ? "text-up bg-up/10 border-up/30"
    : s === "bearish"
      ? "text-down bg-down/10 border-down/30"
      : "text-muted-foreground bg-muted border-border";
}

function pillClasses(s: Sentiment) {
  return s === "bullish"
    ? "bg-up/15 text-up"
    : s === "bearish"
      ? "bg-down/15 text-down"
      : "bg-muted text-muted-foreground";
}

export function MarketBriefPanel() {
  const { symbols, hydrated } = useWatchlist();
  const [data, setData] = useState<MarketBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.marketBrief(symbols, signal);
      setData(res);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    if (!open || !hydrated || data || loading) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hydrated]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!hydrated) return null;

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4 text-foreground" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
          Phân tích AI · Thị trường VN & Quốc tế
        </h3>
        {data && (
          <>
            <SentPill label="VN" section={data.vn} />
            <SentPill label="QT" section={data.global} />
          </>
        )}
        {data?.model && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
            {data.model}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground" key={tick}>
          {loading ? "Đang phân tích…" : data ? `Cập nhật ${fmtAgo(data.generated_at)}` : "Click để phân tích"}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
            <button
              onClick={(e) => { e.stopPropagation(); load(); }}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Phân tích lại
            </button>
          </div>

          {error && (
            <div className="p-4 text-sm text-down">Lỗi: {error}</div>
          )}

          {!data && !error && loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">Đang gọi Gemini Flash…</div>
          )}

          {data && (
            <div className="space-y-4 p-4 pt-0">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <SectionCard
                  icon={<Flag className="h-4 w-4" />}
                  title="TTCK Việt Nam"
                  section={data.vn}
                />
                <SectionCard
                  icon={<Globe className="h-4 w-4" />}
                  title="TTCK Mỹ · Châu Âu · Châu Á"
                  section={data.global}
                />
              </div>

              {data.catalysts.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Catalysts chính
                  </h4>
                  <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    {data.catalysts.map((c, i) => (
                      <li key={i} className="flex items-baseline gap-2 leading-snug text-sm">
                        <span className={cn(
                          "font-mono text-sm font-bold w-4 text-center shrink-0",
                          c.direction === "+" ? "text-up" : c.direction === "-" ? "text-down" : "text-muted-foreground"
                        )}>
                          {c.direction}
                        </span>
                        <span>
                          <span className="font-semibold">{c.label}.</span>{" "}
                          <span className="text-muted-foreground">{c.detail}</span>
                          {c.region && (
                            <span className={cn(
                              "ml-1.5 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider",
                              c.region === "global" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-foreground/10 text-foreground/60"
                            )}>
                              {c.region === "global" ? "QT" : "VN"}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.watchlist_notes.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Ghi chú theo mã
                  </h4>
                  <ul className="flex flex-wrap gap-2">
                    {data.watchlist_notes.map((w, i) => (
                      <li
                        key={i}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs",
                          w.sentiment === "bullish" ? "border-up/40 bg-up/5 text-up"
                          : w.sentiment === "bearish" ? "border-down/40 bg-down/5 text-down"
                          : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="font-mono font-bold">{w.symbol}</span>
                        <span className="ml-1.5 text-foreground/80">{w.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.risks.length > 0 && (
                <div>
                  <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" /> Rủi ro theo dõi
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                    {data.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SentPill({ label, section }: { label: string; section: MarketBriefSection }) {
  const Icon = sentIcon(section.sentiment);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
      pillClasses(section.sentiment)
    )}>
      <span className="opacity-70">{label}</span>
      <Icon className="h-3 w-3" />
      {SENT_LABEL[section.sentiment]} · {section.confidence}%
    </span>
  );
}

function SectionCard({ icon, title, section }: { icon: React.ReactNode; title: string; section: MarketBriefSection }) {
  const Icon = sentIcon(section.sentiment);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{title}</h4>
      </div>
      <div className={cn("mb-2 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-semibold", sentClasses(section.sentiment))}>
        <Icon className="h-3.5 w-3.5" />
        {SENT_LABEL[section.sentiment]}
        <span className="ml-1 font-mono text-[10px] opacity-70">{section.confidence}%</span>
      </div>
      <div className="mb-2 h-1 w-full rounded-full bg-foreground/10">
        <div
          className={cn(
            "h-full rounded-full",
            section.sentiment === "bullish" ? "bg-up" : section.sentiment === "bearish" ? "bg-down" : "bg-muted-foreground"
          )}
          style={{ width: `${Math.max(0, Math.min(100, section.confidence))}%` }}
        />
      </div>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{section.analysis}</p>
    </div>
  );
}

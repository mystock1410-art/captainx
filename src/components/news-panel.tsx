"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Flame } from "lucide-react";
import { usePolling } from "@/hooks/use-polling";
import { api, type NewsItem } from "@/lib/api";
import { SourceBadge } from "./source-badge";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Sources fetched from the rich live-feed endpoint (with summaries). */
  liveSources: readonly string[];
  /** Sources fetched from the compact headlines endpoint. */
  headlineSources: readonly string[];
  variant?: "vi" | "en";
};

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function NewsPanel({ title, liveSources, headlineSources, variant = "vi" }: Props) {
  const allSources = useMemo(() => [...liveSources, ...headlineSources], [liveSources, headlineSources]);
  const [active, setActive] = useState<string[]>(allSources);
  const [breakingOnly, setBreakingOnly] = useState(false);
  const [importantOnly, setImportantOnly] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const liveFetcher = variant === "en" ? api.newsEn : api.news;
  const headlineFetcher = variant === "en" ? api.headlinesEn : api.headlines;
  const interval = variant === "en" ? 120_000 : 60_000;

  const { data: live, loading: loadingLive, error: errorLive } = usePolling<NewsItem[]>(
    (signal) => liveFetcher(signal),
    interval,
    [variant, "live"],
  );
  const { data: heads, loading: loadingHeads, error: errorHeads } = usePolling<NewsItem[]>(
    (signal) => headlineFetcher(signal),
    interval,
    [variant, "heads"],
  );

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const it of [...(live ?? []), ...(heads ?? [])]) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out.sort((a, b) => {
      const ta = a.published ? new Date(a.published).getTime() : 0;
      const tb = b.published ? new Date(b.published).getTime() : 0;
      return tb - ta;
    });
  }, [live, heads]);

  const items = useMemo(
    () =>
      merged
        .filter((i) => active.includes(i.source))
        .filter((i) => !breakingOnly || i.breaking)
        .filter((i) => !importantOnly || i.important),
    [merged, active, breakingOnly, importantOnly],
  );

  const hotItems = useMemo(
    () => merged.filter((i) => i.breaking && active.includes(i.source)).slice(0, 3),
    [merged, active],
  );

  function toggleSource(s: string) {
    setActive((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const loading = loadingLive || loadingHeads;
  const error = errorLive || errorHeads;
  const hasData = (live && live.length > 0) || (heads && heads.length > 0);

  return (
    <section className="flex flex-col gap-3 lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-3">
      <div className="flex flex-col gap-2.5 border-l-2 border-brand pl-2.5">
        <h3 className="text-[13px] font-semibold uppercase leading-none tracking-[0.18em] text-brand">
          {title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allSources.map((s) => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={cn(
                "rounded-sm transition-opacity",
                active.includes(s) ? "opacity-100" : "opacity-30 grayscale",
              )}
            >
              <SourceBadge source={s} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <input
              type="checkbox"
              checked={breakingOnly}
              onChange={(e) => setBreakingOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-gold"
            />
            Chỉ tin nóng
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-gold"
            />
            Quan trọng
          </label>
        </div>
      </div>

      <HotNewsCard items={hotItems} loading={loading && !hasData} variant={variant} />

      <article className="card-elevated rounded-sm">
        <header className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="inline-flex items-center rounded-sm border border-gold px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gold">
            Live
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
            Bản tin liên tục
          </span>
          <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
            {loading && !hasData ? "Đang tải…" : `${items.length} cập nhật`}
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-brand"
            aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </header>

        {!collapsed && (
          <div className="max-h-[520px] overflow-y-auto px-4 py-1">
            {error && !hasData && (
              <p className="py-8 text-center text-sm text-down">Lỗi: {error}</p>
            )}
            {hasData && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có tin phù hợp.
              </p>
            )}
            <ul className="divide-y divide-border/60">
              {items.map((item) => {
                const shown = item.title_vi || item.title;
                const summary = item.summary_vi || item.summary;
                const isOpen = !!expanded[item.id];
                return (
                  <li key={item.id} className="flex gap-3 py-2.5">
                    <span
                      className={cn(
                        "mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                        item.breaking ? "bg-down" : item.important ? "bg-gold" : "bg-brand/60",
                      )}
                    />
                    <div className="flex-1 leading-relaxed">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <SourceBadge source={item.source} />
                        {item.breaking && (
                          <span className="rounded bg-down/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-down">
                            Nóng
                          </span>
                        )}
                        {item.important && !item.breaking && (
                          <span className="rounded bg-gold/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-gold">
                            Quan trọng
                          </span>
                        )}
                        {variant === "en" && item.title_vi && (
                          <span className="rounded bg-muted px-1.5 py-px text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                            Đã dịch
                          </span>
                        )}
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {fmtTime(item.published)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm font-medium text-foreground hover:underline"
                        >
                          {shown}
                        </a>
                        {summary ? (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            aria-label={isOpen ? "Thu gọn" : "Xem tóm tắt"}
                            aria-expanded={isOpen}
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                      {summary && isOpen && (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {summary}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </article>
    </section>
  );
}

function HotNewsCard({
  items,
  loading,
  variant,
}: {
  items: NewsItem[];
  loading: boolean;
  variant: "vi" | "en";
}) {
  return (
    <div className="hot-news-card flex flex-col rounded-sm px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-down" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-down">
            Tin nóng mới nhất
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-down/70">
          {items.length}/3
        </span>
      </div>

      {loading && items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-1 text-center text-xs text-down/60">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-1 text-center text-xs text-down/60">
          Chưa có tin nóng trong các nguồn đang bật.
        </p>
      ) : (
        <ul className="flex-1 space-y-1">
          {items.map((item) => {
            const shown = item.title_vi || item.title;
            return (
              <li key={item.id} className="flex gap-2 text-[13px] leading-snug">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-down" />
                <div className="flex-1">
                  <span className="mr-1.5 font-mono text-[10px] tabular-nums text-down/80">
                    {fmtTime(item.published)}
                  </span>
                  <span className="mr-1.5 rounded bg-down/25 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-down">
                    {item.source}
                  </span>
                  {variant === "en" && item.title_vi && (
                    <span className="mr-1.5 rounded bg-down/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-down/80">
                      Đã dịch
                    </span>
                  )}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/95 hover:underline"
                  >
                    {shown}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

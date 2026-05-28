"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePolling } from "@/hooks/use-polling";
import { api, type NewsItem } from "@/lib/api";
import { SourceBadge } from "./source-badge";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  sources: readonly string[];
  variant?: "vi" | "en";
};

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function LiveFeed({ title, sources, variant = "vi" }: Props) {
  const [active, setActive] = useState<string[]>([...sources]);
  const [breakingOnly, setBreakingOnly] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetcher = variant === "en" ? api.newsEn : api.news;
  const interval = variant === "en" ? 120_000 : 60_000;

  const { data, loading, error } = usePolling<NewsItem[]>(
    (signal) => fetcher(signal),
    interval,
    [variant],
  );

  const items = useMemo(
    () =>
      (data ?? [])
        .filter((i) => active.includes(i.source))
        .filter((i) => !breakingOnly || i.breaking),
    [data, active, breakingOnly],
  );

  function toggleSource(s: string) {
    setActive((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <section className="flex flex-col">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <div className="flex gap-1">
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={cn(
                "rounded transition-opacity",
                active.includes(s) ? "opacity-100" : "opacity-30 grayscale"
              )}
            >
              <SourceBadge source={s} />
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={breakingOnly}
            onChange={(e) => setBreakingOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-foreground"
          />
          Chỉ tin nóng
        </label>
      </div>

      <article className="rounded-lg border border-down/30 bg-down/5">
        <header className="flex items-center gap-2 border-b border-down/20 px-4 py-2.5">
          <span className="inline-flex items-center rounded bg-down px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Tin mới
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Bản tin liên tục
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {loading && !data ? "Đang tải…" : `${items.length} cập nhật`}
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </header>

        {!collapsed && (
          <div className="max-h-[560px] overflow-y-auto px-4 py-3">
            {error && !data && (
              <p className="py-8 text-center text-sm text-down">Lỗi: {error}</p>
            )}
            {data && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có tin phù hợp.
              </p>
            )}
            <ul className="space-y-3">
              {items.map((item) => {
                const title = item.title_vi || item.title;
                const summary = item.summary_vi || item.summary;
                return (
                  <li key={item.id} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                        item.breaking ? "bg-down" : "bg-muted-foreground"
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
                        {variant === "en" && item.title_vi && (
                          <span className="rounded bg-muted px-1.5 py-px text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                            Đã dịch
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {fmtTime(item.published)}
                        </span>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {title}
                      </a>
                      {summary && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
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

"use client";

import { useMemo, useState } from "react";
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

export function Headlines({ title, sources, variant = "vi" }: Props) {
  const [active, setActive] = useState<string[]>([...sources]);
  const [importantOnly, setImportantOnly] = useState(false);

  const fetcher = variant === "en" ? api.headlinesEn : api.headlines;
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
        .filter((i) => !importantOnly || i.important),
    [data, active, importantOnly],
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
            checked={importantOnly}
            onChange={(e) => setImportantOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-foreground"
          />
          Quan trọng
        </label>
      </div>

      <ul className="max-h-[600px] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
        {error && !data && (
          <li className="py-8 text-center text-sm text-down">Lỗi: {error}</li>
        )}
        {data && items.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {loading ? "Đang tải…" : "Không có tin phù hợp."}
          </li>
        )}
        {items.map((item) => {
          const shown = item.title_vi || item.title;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2 transition-colors hover:bg-accent/40",
                item.important && "bg-foreground/[0.02]"
              )}
            >
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums pt-1 shrink-0">
                {fmtTime(item.published)}
              </span>
              <SourceBadge source={item.source} className="mt-1 shrink-0" />
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex-1 text-[13px] uppercase leading-snug tracking-tight hover:underline",
                  item.important ? "font-semibold text-foreground" : "font-normal text-foreground/90"
                )}
              >
                {shown}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

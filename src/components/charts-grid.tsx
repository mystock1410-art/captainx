"use client";

import { ChartCard } from "./chart-card";
import { CollapseButton } from "./collapse-button";
import { usePolling } from "@/hooks/use-polling";
import { useCollapsed } from "@/hooks/use-collapsed";
import { api, type ChartPayload } from "@/lib/api";

const SLOTS = [
  { slot: "vnindex", label: "VNINDEX", pollMs: 10_000 },
  { slot: "dji", label: "DOW JONES", pollMs: 15_000 },
  { slot: "wti", label: "WTI CRUDE", pollMs: 15_000 },
  { slot: "ym", label: "DJ FUTURES", pollMs: 15_000 },
  { slot: "wtioil", label: "WTIOIL(F)", pollMs: 3_000 },
  { slot: "btc", label: "BITCOIN", pollMs: 3_000 },
  { slot: "coffee", label: "CÀ PHÊ", pollMs: 1_800_000 }, // 30 min
] as const;

export function ChartsGrid() {
  const { collapsed, toggle } = useCollapsed("x-index");
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 border-l-2 border-gold pl-2.5">
        <h3 className="text-[16px] font-bold uppercase tracking-[0.18em] text-brand">
          X Index
        </h3>
        <CollapseButton collapsed={collapsed} onClick={toggle} label="X Index" />
      </div>
      {!collapsed && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {SLOTS.map((s) => (
            <ChartSlot key={s.slot} slot={s.slot} label={s.label} pollMs={s.pollMs} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChartSlot({ slot, label, pollMs }: { slot: string; label: string; pollMs: number }) {
  const { data, loading, error } = usePolling<ChartPayload>(
    (signal) => api.chart(slot, signal),
    pollMs,
    [slot],
  );
  return (
    <ChartCard
      slot={slot}
      label={label}
      name={data?.name ?? ""}
      symbol={data?.symbol ?? slot.toUpperCase()}
      price={data?.price ?? null}
      change={data?.change ?? null}
      changePct={data?.changePct ?? null}
      t={data?.t ?? []}
      c={data?.c ?? []}
      unit={data?.unit}
      loading={loading}
      error={error}
    />
  );
}

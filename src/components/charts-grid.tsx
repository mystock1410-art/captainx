"use client";

import { ChartCard } from "./chart-card";
import { usePolling } from "@/hooks/use-polling";
import { api, type ChartPayload } from "@/lib/api";

const SLOTS = [
  { slot: "vnindex", label: "VNINDEX", pollMs: 10_000 },
  { slot: "dji", label: "DOW JONES", pollMs: 15_000 },
  { slot: "wti", label: "WTI CRUDE", pollMs: 15_000 },
  { slot: "ym", label: "DJ FUTURES", pollMs: 15_000 },
  { slot: "wtioil", label: "WTIOIL(F)", pollMs: 3_000 },
  { slot: "btc", label: "BITCOIN", pollMs: 3_000 },
] as const;

export function ChartsGrid() {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2 border-l-2 border-gold pl-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          X Index
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SLOTS.map((s) => (
          <ChartSlot key={s.slot} slot={s.slot} label={s.label} pollMs={s.pollMs} />
        ))}
      </div>
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
      loading={loading}
      error={error}
    />
  );
}

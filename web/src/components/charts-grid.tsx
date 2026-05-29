"use client";

import { ChartCard } from "./chart-card";
import { usePolling } from "@/hooks/use-polling";
import { api, type ChartPayload } from "@/lib/api";

const SLOTS = [
  { slot: "vnindex", label: "VNINDEX" },
  { slot: "dji", label: "DOW JONES" },
  { slot: "wti", label: "WTI CRUDE" },
  { slot: "ym", label: "DJ FUTURES" },
] as const;

export function ChartsGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SLOTS.map((s) => (
        <ChartSlot key={s.slot} slot={s.slot} label={s.label} />
      ))}
    </div>
  );
}

function ChartSlot({ slot, label }: { slot: string; label: string }) {
  const { data, loading, error } = usePolling<ChartPayload>(
    (signal) => api.chart(slot, signal),
    30_000,
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

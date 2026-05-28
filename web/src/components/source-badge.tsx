import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  Cafef: "bg-[#e60000] text-white",
  Vietstock: "bg-[#0066cc] text-white",
  Vietnambiz: "bg-[#1a1a1a] text-white",
  "24h": "bg-[#ff6600] text-white",
  VnExpress: "bg-[#1a4f8b] text-white",
  FireAnt: "bg-[#f97316] text-white",
  AJ: "bg-[#f5a623] text-white",
  CNN: "bg-[#cc0000] text-white",
  WSJ: "bg-[#1a1a3a] text-white",
  MKT: "bg-[#0a66c2] text-white",
  INV: "bg-[#ff7a00] text-white",
  FJ: "bg-[#16a34a] text-white",
};

export function SourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none",
        STYLES[source] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {source}
    </span>
  );
}

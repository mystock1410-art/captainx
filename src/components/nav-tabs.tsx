"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Glow = "gold" | "brand";

const TABS: { href: string; label: string; glow?: Glow }[] = [
  { href: "/", label: "Home" },
  { href: "/stock-analysis", label: "Stock Analysis" },
  { href: "/valuation", label: "Valuation" },
  { href: "/asset-allocation", label: "Asset Allocation", glow: "gold" },
  { href: "/copytrade", label: "Copytrade Phái Sinh Mr X", glow: "gold" },
  { href: "/ocbs-products", label: "OCBS Products", glow: "brand" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        if (tab.glow && !active) {
          const isBrand = tab.glow === "brand";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[12px] font-semibold sm:px-3 sm:text-[13px]",
                isBrand ? "cta-border-brand" : "cta-border",
              )}
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isBrand ? "cta-dot-brand bg-brand" : "cta-dot bg-gold",
                )}
              />
              <span className={isBrand ? "cta-blink-brand" : "cta-blink"}>{tab.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors sm:px-3 sm:text-[13px]",
              active
                ? "bg-accent text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)]"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

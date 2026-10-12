import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

type Glow = "gold" | "brand";

/**
 * Shared "đang phát triển" placeholder. Replaces the five near-identical
 * Construction cards. The CTA links to the real OCBS account page instead of
 * the old "Bấm theo dõi F yyy" placeholder handle.
 */
export function ComingSoon({
  title,
  glow,
  cta = false,
  children,
}: {
  title: string;
  glow?: Glow;
  cta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center px-4 py-16">
      <div
        className={cn(
          "card-elevated max-w-2xl rounded-md p-10 text-center",
          glow === "brand" ? "cta-border-brand" : glow === "gold" ? "cta-border" : "",
        )}
      >
        <Construction
          className={cn("mx-auto mb-4 h-10 w-10", glow === "brand" ? "text-brand" : "text-gold")}
        />
        <h2 className="mb-3 text-[18px] font-bold uppercase tracking-[0.12em] text-brand">{title}</h2>
        <div className="text-[14px] font-medium leading-relaxed text-foreground/85">{children}</div>
        {cta && (
          <a
            href="https://taikhoan.ocbs.com.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-sm bg-brand px-4 py-2 text-[14px] font-semibold text-background transition-colors hover:bg-brand/90"
          >
            Mở tài khoản OCBS để được tư vấn
          </a>
        )}
      </div>
    </main>
  );
}

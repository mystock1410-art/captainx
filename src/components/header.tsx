import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { NavTabs } from "./nav-tabs";

export function Header() {
  return (
    <header className="bar-elevated sticky top-0 z-30 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-3 py-2 sm:px-4">
        {/* Row 1: navigation tabs (left, scrollable) + right cluster (CTA + theme) */}
        <div className="flex items-center gap-2">
          <NavTabs />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden flex-col items-center gap-1.5 md:flex">
              <span className="hidden font-serif text-[12px] italic leading-none tracking-wide text-muted-foreground xl:inline">
                Too <span className="text-brand">WEIRD</span> to LIVE, too <span className="text-gold">RARE</span> to DIE
              </span>
              <a
                href="https://taikhoan.ocbs.com.vn/"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-border inline-flex items-center gap-1.5 rounded-md border bg-gold/10 px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-brand transition-colors hover:bg-brand hover:text-background"
              >
                <span className="cta-dot inline-block h-1.5 w-1.5 rounded-full bg-gold" />
                Mở TK OCBS
              </a>
            </div>
            <a
              href="https://taikhoan.ocbs.com.vn/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mở tài khoản OCBS"
              className="cta-border inline-flex items-center gap-1 rounded-md border bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-brand md:hidden"
            >
              <span className="cta-dot inline-block h-1.5 w-1.5 rounded-full bg-gold" />
              OCBS
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: brand block centered */}
        <a
          href="https://ocbs.com.vn"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CAPTAIN X — OCBS"
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          <span className="ocbs-3d-wrap shrink-0">
            <Image
              src="/ocbs-logo.png"
              alt="OCBS"
              width={32}
              height={32}
              priority
            />
          </span>
          <h1 className="text-base font-bold tracking-[0.08em] text-brand sm:text-lg">
            CAPTAIN <span className="text-gold">X</span>
          </h1>
          <span className="hidden border-l-2 border-gold pl-3 text-[10px] uppercase tracking-[0.15em] font-semibold text-foreground sm:inline-block sm:text-[11px]">
            Ryl Nguyen
            <span className="ml-2 text-gold">· CEO OCBS</span>
          </span>
        </a>
      </div>
    </header>
  );
}

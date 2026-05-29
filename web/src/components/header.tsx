import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
        <a
          href="https://ocbs.com.vn"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Captain X — OCBS"
          className="group flex items-center gap-2.5"
        >
          <Image
            src="/ocbs-logo-dark.png"
            alt="OCBS"
            width={28}
            height={28}
            className="transition-transform group-hover:scale-105"
            priority
          />
          <h1 className="text-lg font-semibold tracking-tight">
            Captain <span className="text-[#E4A025]">X</span>
          </h1>
        </a>

        <nav className="flex items-center gap-1 text-sm">
          <span className="px-3 py-1.5 rounded-md bg-accent text-foreground font-medium">
            DashBoard - v1
          </span>
        </nav>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

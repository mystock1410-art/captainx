import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-sm">
            X
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Captain X</h1>
        </div>

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

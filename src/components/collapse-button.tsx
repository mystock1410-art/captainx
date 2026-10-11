import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent show/hide toggle used on every collapsible section header. */
export function CollapseButton({
  collapsed,
  onClick,
  label,
  className,
}: {
  collapsed: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  const text = collapsed ? "Mở rộng" : "Thu gọn";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={!collapsed}
      aria-label={label ? `${text} ${label}` : text}
      title={text}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold hover:text-gold",
        className,
      )}
    >
      {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}

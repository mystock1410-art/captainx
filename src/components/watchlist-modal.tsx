"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { WATCHLIST_MAX } from "@/hooks/use-watchlist";

type Props = {
  open: boolean;
  onClose: () => void;
  symbols: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
  onReset: () => void;
};

export function WatchlistModal({
  open, onClose, symbols, onAdd, onRemove, onReset,
}: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const full = symbols.length >= WATCHLIST_MAX;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || full) return;
    onAdd(input);
    setInput("");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-modal-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 id="watchlist-modal-title" className="text-base font-semibold">Quản lý Watchlist</h2>
            <p className="text-[10px] text-muted-foreground">
              Tự động sắp xếp theo A→Z ·{" "}
              <span className={full ? "font-semibold text-gold" : ""}>
                {symbols.length}/{WATCHLIST_MAX} mã
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-1.5 px-5 pt-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Thêm mã, ví dụ FPT..."
              maxLength={10}
              disabled={full}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={full}
              className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Thêm
            </button>
          </div>
          {full && (
            <p role="alert" className="text-[11px] text-gold">
              Đã đạt tối đa {WATCHLIST_MAX} mã. Xóa bớt để thêm mã mới.
            </p>
          )}
        </form>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          <ul className="space-y-1">
            {symbols.map((s) => (
              <li
                key={s}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5"
              >
                <span className="flex-1 font-mono text-sm font-medium">{s}</span>
                <button
                  onClick={() => onRemove(s)}
                  className="text-muted-foreground hover:text-down"
                  aria-label={`Xóa ${s}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {symbols.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-6">
                Chưa có mã nào. Thêm mã ở trên.
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            Xong
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

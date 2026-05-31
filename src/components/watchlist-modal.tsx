"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input);
    setInput("");
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-base font-semibold">Quản lý Watchlist</h2>
            <p className="text-[10px] text-muted-foreground">Tự động sắp xếp theo A→Z · Tối đa 50 mã</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex gap-2 px-5 pt-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Thêm mã, ví dụ FPT..."
            maxLength={10}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
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

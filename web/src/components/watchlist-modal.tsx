"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, RotateCcw, Trash2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  symbols: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
  onReorder: (next: string[]) => void;
  onReset: () => void;
};

export function WatchlistModal({
  open, onClose, symbols, onAdd, onRemove, onReorder, onReset,
}: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = symbols.indexOf(String(active.id));
    const to = symbols.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(symbols, from, to));
  }

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
          <h2 className="text-base font-semibold">Quản lý Watchlist</h2>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={symbols} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {symbols.map((s) => (
                  <SortableRow key={s} id={s} onRemove={() => onRemove(s)} />
                ))}
                {symbols.length === 0 && (
                  <li className="text-sm text-muted-foreground text-center py-6">
                    Chưa có mã nào. Thêm mã ở trên.
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
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

function SortableRow({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label="Kéo để sắp xếp"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 font-mono text-sm font-medium">{id}</span>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-down"
        aria-label={`Xóa ${id}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

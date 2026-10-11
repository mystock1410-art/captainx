"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-section collapse state, remembered in localStorage so a user's
 * show/hide choice survives reloads. Defaults to expanded on first render
 * (matches SSR) and hydrates the stored value after mount.
 */
export function useCollapsed(key: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const storageKey = `captainx.collapse.${key}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "1") setCollapsed(true);
      else if (raw === "0") setCollapsed(false);
    } catch {}
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, [storageKey]);

  return { collapsed, toggle };
}

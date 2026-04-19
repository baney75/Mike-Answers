import { useState, useEffect, useCallback, useMemo } from "react";
import type { HistoryItem } from "../types";

const STORAGE_KEY = "aqs_history";
const MAX_ITEMS = 20;

/**
 * Persists solution history in localStorage.
 * Returns the list and helpers to push new entries or clear all.
 */
export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  const persistItems = useCallback((next: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable or full */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed.slice(0, MAX_ITEMS));
      }
    } catch {
      /* corrupted data — start fresh */
    }
  }, []);

  const push = useCallback((item: HistoryItem) => {
    setItems((current) => {
      const next = [item, ...current].slice(0, MAX_ITEMS);
      persistItems(next);
      return next;
    });
  }, [persistItems]);

  const replace = useCallback((item: HistoryItem) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing && JSON.stringify(existing) === JSON.stringify(item)) {
        return current;
      }

      const next = current.some((entry) => entry.id === item.id)
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...current].slice(0, MAX_ITEMS);
      persistItems(next);
      return next;
    });
  }, [persistItems]);

  const replaceAll = useCallback((nextItems: HistoryItem[]) => {
    const deduped = nextItems
      .reduce<HistoryItem[]>((acc, item) => {
        if (acc.some((entry) => entry.id === item.id)) {
          return acc;
        }

        acc.push(item);
        return acc;
      }, [])
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_ITEMS);

    setItems(deduped);
    persistItems(deduped);
  }, [persistItems]);

  const clear = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  return useMemo(
    () => ({ items, push, replace, replaceAll, clear, label: "Browser local" }),
    [items, push, replace, replaceAll, clear],
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import type { HistoryItem } from "../types";
import { normalizeHistoryItemOriginalContext } from "../utils/followUpContext";

const STORAGE_KEY = "aqs_history";
const MAX_ITEMS = 20;

function normalizeHistoryItem(item: HistoryItem): HistoryItem {
  const originalContext = normalizeHistoryItemOriginalContext(item);

  return {
    ...item,
    requestText: originalContext?.text ?? item.requestText,
    originalContext,
  };
}

/**
 * Persists solution history in localStorage.
 * Returns the list and helpers to push new entries or clear all.
 */
export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  const STORAGE_WARN_THRESHOLD_BYTES = 4_000_000; // 80% of ~5MB localStorage limit

  function checkStorageQuota(serialized: string) {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return;
    }

    const approxBytes = new TextEncoder().encode(serialized).length + serialized.length; // rough overhead
    if (approxBytes > STORAGE_WARN_THRESHOLD_BYTES) {
      console.warn(
        `History storage is nearing the browser localStorage limit (≈${Math.round(approxBytes / 1_000_000)}MB). ` +
          "Consider clearing old history items to avoid data loss. Images in solved questions increase storage use significantly.",
      );
    }
  }

  const persistItems = useCallback((next: HistoryItem[]) => {
    try {
      const serialized = JSON.stringify(next);
      checkStorageQuota(serialized);
      localStorage.setItem(STORAGE_KEY, serialized);
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
        setItems(parsed.slice(0, MAX_ITEMS).map(normalizeHistoryItem));
      }
    } catch {
      /* corrupted data — start fresh */
    }
  }, []);

  const push = useCallback((item: HistoryItem) => {
    setItems((current) => {
      const next = [normalizeHistoryItem(item), ...current].slice(0, MAX_ITEMS);
      persistItems(next);
      return next;
    });
  }, [persistItems]);

  const replace = useCallback((item: HistoryItem) => {
    setItems((current) => {
      const normalizedItem = normalizeHistoryItem(item);
      const existing = current.find((entry) => entry.id === normalizedItem.id);
      if (existing && JSON.stringify(existing) === JSON.stringify(normalizedItem)) {
        return current;
      }

      const next = current.some((entry) => entry.id === normalizedItem.id)
        ? current.map((entry) => (entry.id === normalizedItem.id ? normalizedItem : entry))
        : [normalizedItem, ...current].slice(0, MAX_ITEMS);
      persistItems(next);
      return next;
    });
  }, [persistItems]);

  const replaceAll = useCallback((nextItems: HistoryItem[]) => {
    const deduped = nextItems
      .reduce<HistoryItem[]>((acc, item) => {
        const normalizedItem = normalizeHistoryItem(item);
        if (acc.some((entry) => entry.id === normalizedItem.id)) {
          return acc;
        }

        acc.push(normalizedItem);
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

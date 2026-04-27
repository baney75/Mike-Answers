import { useEffect, useCallback } from "react";
import type { AppState } from "../types";

/**
 * Custom hook for managing keyboard interactions
 * Handles all keyboard shortcuts for the application
 */
export function useKeyboard({
  appState,
  onEnter,
  onEscape,
  onClear,
  onDeepMode,
}: {
  appState: AppState;
  onEnter: (mode: "fast" | "deep") => void;
  onEscape: () => void;
  onClear: () => void;
  onDeepMode?: () => void;
}) {
  const isEditableTarget = useCallback((target: EventTarget | null): boolean => {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT")
    );
  }, []);

  const isInteractiveTarget = useCallback((target: EventTarget | null): boolean => {
    return (
      target instanceof HTMLElement &&
      (isEditableTarget(target) ||
        Boolean(target.closest("button, a, label, summary, [role='button'], select")))
    );
  }, [isEditableTarget]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keys when user is typing in an input
      if (isInteractiveTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case "Enter":
          if (event.shiftKey) {
            // Shift+Enter = insert newline (handled by textarea)
            return;
          }
          // Enter = submit with fast mode
          event.preventDefault();
          onEnter("fast");
          break;

        case "Escape":
          event.preventDefault();
          onEscape();
          break;

        case "Backspace":
        case "Delete":
          // Clear on backspace/delete when in IDLE state
          if (appState === "IDLE") {
            event.preventDefault();
            onClear();
          }
          break;

        case "d":
        case "D":
          // D key = deep mode (when not in input)
          if (onDeepMode) {
            event.preventDefault();
            onDeepMode();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appState, onEnter, onEscape, onClear, onDeepMode, isInteractiveTarget]);

  return {
    isEditableTarget,
    isInteractiveTarget,
  };
}

export default useKeyboard;

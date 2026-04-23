import {
  BookText,
  PencilLine,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type { SolveMode } from "../types";

const BTN =
  "studio-card flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-black text-(--aqs-ink) outline-none transition-all focus-visible:ring-4 focus-visible:ring-[rgba(139,30,63,0.12)] dark:text-white md:px-5 md:py-3 md:text-sm";

interface ActionBarProps {
  lastMode: Exclude<SolveMode, "research">;
  canRetryEdit: boolean;
  canRetrySolve: boolean;
  onCiteAi: () => void;
  onSolveAgain: (mode: Exclude<SolveMode, "research">, detailed?: boolean) => void;
  onRetry: () => void;
  onEditRequest: () => void;
  onClear: () => void;
}

export function ActionBar({
  lastMode,
  canRetryEdit,
  canRetrySolve,
  onCiteAi,
  onSolveAgain,
  onRetry,
  onEditRequest,
  onClear,
}: ActionBarProps) {
  return (
    <div className="no-print studio-panel flex shrink-0 flex-col gap-3 bg-white/72 p-4 backdrop-blur-sm dark:bg-slate-900/48 md:px-5 md:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClear}
            className="neo-border flex items-center justify-center gap-3 rounded-[1.15rem] bg-(--aqs-accent) px-6 py-3 text-sm font-black text-white outline-none transition-all hover:bg-(--aqs-accent-strong) focus-visible:ring-4 focus-visible:ring-[rgba(139,30,63,0.12)] active:translate-y-px"
          >
            <X className="h-4 w-4" />
            New Solve
          </button>

          <div className="scroll-studio flex items-center gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => onSolveAgain(lastMode, true)} className={BTN}>
              <RefreshCw className="h-4 w-4 text-(--aqs-accent)" />
              Deepen Answer
            </button>
            <button type="button" onClick={onEditRequest} disabled={!canRetryEdit} className={`${BTN} disabled:opacity-40`}>
              <PencilLine className="h-4 w-4 text-(--aqs-accent)" />
              Edit Request
            </button>
            <button type="button" onClick={onRetry} disabled={!canRetrySolve} className={`${BTN} disabled:opacity-40`}>
              <RotateCcw className="h-4 w-4 text-(--aqs-accent)" />
              Restart
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end xl:self-auto">
          <button type="button" onClick={onCiteAi} className={BTN}>
            <BookText className="h-4 w-4 text-(--aqs-accent)" />
            Cite AI
          </button>
          <button
            type="button"
            onClick={() => {
              const activeElement = document.activeElement;
              if (activeElement instanceof HTMLElement) {
                activeElement.blur();
              }
              window.print();
            }}
            className={BTN}
          >
            <Printer className="h-4 w-4 text-(--aqs-accent)" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

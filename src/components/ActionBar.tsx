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
  "studio-card flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-3 py-2.5 text-xs font-black text-(--aqs-ink) outline-none transition-all focus-visible:ring-4 focus-visible:ring-[rgba(139,30,63,0.12)] dark:text-white md:px-5 md:py-3 md:text-sm";

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
  const handlePrint = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  return (
    <div className="no-print studio-panel flex shrink-0 flex-col gap-3 bg-white/72 p-3 backdrop-blur-sm dark:bg-slate-900/48 md:px-5 md:py-4">
      <div className="grid grid-cols-3 gap-2 xl:flex xl:items-center xl:justify-between">
        <div className="contents xl:flex xl:flex-row xl:items-center xl:gap-3">
          <button
            type="button"
            onClick={onClear}
            className="neo-border col-span-3 flex min-h-11 items-center justify-center gap-3 rounded-[1.05rem] bg-(--aqs-accent) px-4 py-2.5 text-sm font-black text-white outline-none transition-all hover:bg-(--aqs-accent-strong) focus-visible:ring-4 focus-visible:ring-[rgba(139,30,63,0.12)] active:translate-y-px sm:col-span-1 xl:px-6 xl:py-3"
          >
            <X className="h-4 w-4" />
            New Solve
          </button>

          <div className="contents xl:flex xl:items-center xl:gap-2">
            <button type="button" onClick={() => onSolveAgain(lastMode, true)} className={BTN}>
              <RefreshCw className="h-4 w-4 text-(--aqs-accent)" />
              Deepen
            </button>
            <button type="button" onClick={onEditRequest} disabled={!canRetryEdit} className={`${BTN} disabled:opacity-40`}>
              <PencilLine className="h-4 w-4 text-(--aqs-accent)" />
              Edit
            </button>
            <button type="button" onClick={onRetry} disabled={!canRetrySolve} className={`${BTN} disabled:opacity-40`}>
              <RotateCcw className="h-4 w-4 text-(--aqs-accent)" />
              Restart
            </button>
          </div>
        </div>

        <div className="contents xl:flex xl:items-center xl:gap-2 xl:self-auto">
          <button type="button" onClick={onCiteAi} className={BTN}>
            <BookText className="h-4 w-4 text-(--aqs-accent)" />
            Cite AI
          </button>
          <button
            type="button"
            onClick={handlePrint}
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

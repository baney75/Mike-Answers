import { useState } from "react";
import {
  Check,
  Copy,
  PencilLine,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import type { SolveMode } from "../types";
import { getCopyableSolution } from "../utils/solution";

const COPY_FEEDBACK_MS = 2000;

const BTN =
  "studio-card flex items-center justify-center gap-2 px-5 py-3 text-sm font-black text-[var(--aqs-ink)] transition-all dark:text-white";

interface ActionBarProps {
  solution: string;
  lastMode: Exclude<SolveMode, "research">;
  canRetryEdit: boolean;
  onSolveAgain: (mode: Exclude<SolveMode, "research">, detailed?: boolean) => void;
  onRetry: () => void;
  onEditRequest: () => void;
  onClear: () => void;
}

export function ActionBar({
  solution,
  lastMode,
  canRetryEdit,
  onSolveAgain,
  onRetry,
  onEditRequest,
  onClear,
}: ActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getCopyableSolution(solution));
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <div className="no-print studio-panel flex flex-col items-center justify-between gap-6 bg-white/60 p-6 backdrop-blur-sm dark:bg-slate-900/40 md:flex-row lg:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={handleCopy} className={BTN}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-[var(--aqs-accent)]" />
          )}
          {copied ? "Copied" : "Markdown Copy"}
        </button>

        <button type="button" onClick={() => window.print()} className={BTN}>
          <Printer className="h-4 w-4 text-[var(--aqs-accent)]" />
          PDF Report
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={onRetry} disabled={!canRetryEdit} className={`${BTN} disabled:opacity-40`}>
          <RotateCcw className="h-4 w-4 text-[var(--aqs-accent)]" />
          Restart
        </button>
        <button type="button" onClick={onEditRequest} disabled={!canRetryEdit} className={`${BTN} disabled:opacity-40`}>
          <PencilLine className="h-4 w-4 text-[var(--aqs-accent)]" />
          Edit Request
        </button>
        <button type="button" onClick={() => onSolveAgain(lastMode, true)} className={BTN}>
          <RefreshCw className="h-4 w-4 text-[var(--aqs-accent)]" />
          Deepen Answer
        </button>
        <button
          type="button"
          onClick={onClear}
          className="neo-border neo-shadow flex items-center justify-center gap-3 rounded-[1.25rem] bg-[var(--aqs-accent)] px-8 py-3 text-sm font-black text-white transition-all hover:-translate-y-1 active:translate-y-px"
        >
          <X className="h-4 w-4" />
          New Solve
        </button>
      </div>
    </div>
  );
}


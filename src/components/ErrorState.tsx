import { RefreshCw, X } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onClear: () => void;
}

export function ErrorState({ message, onRetry, onClear }: ErrorStateProps) {
  return (
    <div className="paper-panel border-[var(--aqs-accent)] bg-red-50/30 p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 no-print dark:bg-red-950/10">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-[var(--aqs-accent)] dark:bg-red-900/30">
        <X className="h-8 w-8" />
      </div>
      
      <h3 className="text-2xl font-black tracking-tight text-[var(--aqs-ink)] dark:text-white">Something went wrong</h3>
      <p className="mx-auto mt-3 max-w-md text-[16px] font-medium leading-relaxed text-red-800 dark:text-red-300">
        {message}
      </p>

      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="neo-border neo-shadow flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3 text-base font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-1 active:translate-y-px active:shadow-none dark:bg-slate-900 dark:text-white"
        >
          <RefreshCw className="h-5 w-5 text-[var(--aqs-accent)]" />
          Retry Request
        </button>
        <button
          type="button"
          onClick={onClear}
          className="neo-border-thin neo-shadow-sm flex items-center justify-center gap-2 rounded-2xl bg-[var(--aqs-paper-strong)] px-8 py-3 text-base font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-800 dark:text-white"
        >
          <X className="h-5 w-5 text-slate-500" />
          Start Over
        </button>
      </div>
    </div>
  );
}

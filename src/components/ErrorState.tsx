import { RefreshCw, X } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onClear: () => void;
}

export function ErrorState({ message, onRetry, onClear }: ErrorStateProps) {
  return (
    <div role="alert" className="paper-panel flex h-full min-h-0 flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,241,244,0.92))] p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 no-print dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(62,15,28,0.82))]">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--aqs-accent-soft) text-(--aqs-accent) dark:bg-red-900/30">
        <X className="h-6 w-6" />
      </div>
      
      <h3 className="text-lg font-black tracking-tight text-(--aqs-ink) dark:text-white">Something went wrong</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
        {message}
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-5 py-2.5 text-sm font-black text-(--aqs-ink) transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4 text-(--aqs-accent)" />
          Retry
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-(--aqs-paper-strong) px-5 py-2.5 text-sm font-black text-(--aqs-ink) transition hover:bg-white dark:border-white/10 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4 text-slate-500" />
          Start Over
        </button>
      </div>
    </div>
  );
}

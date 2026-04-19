import { RefreshCw, WifiOff, X } from "lucide-react";

interface PwaNoticeProps {
  isOffline: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  onRefresh: () => void;
  onDismissOfflineReady: () => void;
  onDismissRefresh: () => void;
}

export function PwaNotice({
  isOffline,
  needRefresh,
  offlineReady,
  onRefresh,
  onDismissOfflineReady,
  onDismissRefresh,
}: PwaNoticeProps) {
  if (!isOffline && !needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-3 no-print md:bottom-5">
      {isOffline ? (
        <div className="rounded-[1.1rem] border border-amber-300/50 bg-amber-50/94 px-4 py-3 text-sm text-amber-900 shadow-[0_14px_30px_rgba(39,29,20,0.12)] dark:border-amber-400/30 dark:bg-amber-950/90 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Offline right now</div>
              <div className="mt-1 leading-6">Your saved workspace still works locally. Online provider calls will resume when the connection returns.</div>
            </div>
          </div>
        </div>
      ) : null}

      {needRefresh ? (
        <div className="rounded-[1.1rem] border border-(--aqs-accent)/18 bg-white/95 px-4 py-3 text-sm shadow-[0_14px_30px_rgba(20,17,21,0.12)] dark:border-(--aqs-accent-dark)/25 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-(--aqs-ink) dark:text-white">Update ready</div>
              <div className="mt-1 leading-6 text-slate-600 dark:text-slate-300">A newer version of Mike Answers is ready. Reload to update the installed app shell and offline cache.</div>
            </div>
            <button type="button" onClick={onDismissRefresh} className="rounded-full p-1 text-slate-500 dark:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-full bg-(--aqs-accent) px-4 py-2 text-sm font-semibold text-white">
              <RefreshCw className="h-4 w-4" /> Reload now
            </button>
          </div>
        </div>
      ) : null}

      {offlineReady && !needRefresh ? (
        <div className="rounded-[1.1rem] border border-emerald-400/22 bg-emerald-50/95 px-4 py-3 text-sm shadow-[0_14px_30px_rgba(20,29,24,0.12)] dark:border-emerald-400/25 dark:bg-emerald-950/85">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-emerald-900 dark:text-emerald-100">Offline cache ready</div>
              <div className="mt-1 leading-6 text-emerald-800 dark:text-emerald-200">This app shell is cached, so the workspace opens faster and keeps local data available offline.</div>
            </div>
            <button type="button" onClick={onDismissOfflineReady} className="rounded-full p-1 text-emerald-800 dark:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

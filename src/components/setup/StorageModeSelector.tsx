export function StorageModeSelector({
  remember,
  onChange,
}: {
  remember: boolean;
  onChange: (remember: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Key storage
      </div>
      <div className="grid gap-3 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!remember}
        className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
          !remember
            ? "border-(--aqs-accent) bg-(--aqs-accent-soft) dark:bg-[rgba(122,31,52,0.22)]"
            : "border-(--aqs-ink)/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
        }`}
        >
          <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Session only</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Safest on shared or school devices. Clears when this browser session ends.
          </p>
        </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={remember}
        className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
          remember
            ? "border-(--aqs-accent) bg-(--aqs-accent-soft) dark:bg-[rgba(122,31,52,0.22)]"
            : "border-(--aqs-ink)/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
        }`}
        >
          <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Remember on this device</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Convenient for a personal laptop. Encrypted locally and kept only in this browser.
          </p>
        </button>
      </div>
    </div>
  );
}

export function StorageModeSelector({
  remember,
  onChange,
}: {
  remember: boolean;
  onChange: (remember: boolean) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
          !remember
            ? "border-(--aqs-accent) bg-(--aqs-accent-soft) dark:bg-[color:rgba(122,31,52,0.22)]"
            : "border-(--aqs-ink)/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
        }`}
        >
          <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Session only</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Highest privacy. Clears when this session ends.
          </p>
        </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
          remember
            ? "border-(--aqs-accent) bg-(--aqs-accent-soft) dark:bg-[color:rgba(122,31,52,0.22)]"
            : "border-(--aqs-ink)/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
        }`}
        >
          <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Remember on this device</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Default. Encrypted locally and stays only in this browser, so use it only on a device you trust.
          </p>
        </button>
    </div>
  );
}

import type { ReactNode } from "react";
import { Download, HandCoins, History, Moon, Settings2, Sun, Monitor } from "lucide-react";
import type { ThemeMode } from "../hooks/useDarkMode";

interface HeaderProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onOpenHistory: () => void;
  onToggleSetup: () => void;
  setupOpen: boolean;
  emblemSrc: string;
  onInstallApp?: () => void;
  canInstallApp?: boolean;
  providerName: string;
  providerStatus: string;
  freeModeEnabled?: boolean;
  historyCount: number;
  hideDonateButton?: boolean;
}

function IconButton({
  title,
  onClick,
  children,
  disabled = false,
  badge,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={onClick}
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--aqs-ink)/10 bg-white/88 text-(--aqs-ink) outline-none transition hover:border-(--aqs-accent)/30 hover:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(139,30,63,0.12)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-950/72 dark:text-white dark:hover:bg-slate-800 md:h-10 md:w-10"
      >
        {children}
      </button>
      {badge && badge > 0 ? (
        <span
          className="pointer-events-none absolute right-0 top-0 inline-flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-(--aqs-accent) px-1 text-[8px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-950"
          aria-hidden="true"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </div>
  );
}

export function Header({
  theme,
  setTheme,
  onOpenHistory,
  onToggleSetup,
  setupOpen,
  emblemSrc,
  onInstallApp,
  canInstallApp,
  providerName,
  providerStatus,
  freeModeEnabled = false,
  historyCount,
  hideDonateButton = false,
}: HeaderProps) {
  const providerNeedsSetup = providerStatus === "key needed" || providerStatus.startsWith("Add ");
  const compactProviderStatus = providerNeedsSetup
    ? "Setup"
    : providerStatus === "ready"
      ? "Ready"
      : providerStatus;
  const themeIcon =
    theme === "light" ? (
      <Sun className="h-4.5 w-4.5 text-(--aqs-gold)" />
    ) : theme === "system" ? (
      <Monitor className="h-4.5 w-4.5 text-(--aqs-accent)" />
    ) : (
      <Moon className="h-4.5 w-4.5 text-(--aqs-accent)" />
    );

  return (
    <header className="no-print studio-panel mb-3 overflow-visible bg-white/88 px-2.5 py-2 backdrop-blur-xl dark:bg-slate-950/84 md:mb-4 md:px-4 md:py-3">
      <div className="flex items-center justify-between gap-2.5 md:gap-3">
        <div className="min-w-0 flex items-center gap-2.5 md:gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-(--aqs-accent)/8 to-(--aqs-gold)/12 ring-1 ring-(--aqs-accent)/10 md:h-12 md:w-12 md:rounded-[1.1rem]">
            <img
              src={emblemSrc}
              alt="Mike Answers mascot"
              className="h-[108%] w-[108%] object-contain object-center"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-(--aqs-accent-strong) dark:text-(--aqs-gold)">
                Mike Answers
              </div>
              <div className="hidden h-px w-5 bg-(--aqs-accent)/25 sm:block" />
              <div className="hidden text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:block">
                Browser-first study desk
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-(--aqs-ink)/10 bg-white/92 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white sm:gap-2 sm:text-[9px] md:px-3 md:text-[10px]">
                <div className={`h-1.5 w-1.5 rounded-full ${providerNeedsSetup ? "bg-rose-500" : "bg-emerald-500"}`} />
                <span className="truncate">{providerName}</span>
                <span className="opacity-30">•</span>
                <span className="truncate sm:hidden">{compactProviderStatus}</span>
                <span className="hidden truncate sm:inline">{providerStatus}</span>
                {freeModeEnabled ? (
                  <>
                    <span className="opacity-30">•</span>
                    <span className="truncate text-amber-700 dark:text-amber-300">free</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {canInstallApp && onInstallApp ? (
            <IconButton title="Install app" onClick={onInstallApp}>
              <Download className="h-4.5 w-4.5 text-(--aqs-accent)" />
            </IconButton>
          ) : null}
          <IconButton title={setupOpen ? "Hide settings" : "Open settings"} onClick={onToggleSetup}>
            <Settings2 className={`h-4.5 w-4.5 transition-transform ${setupOpen ? "rotate-90" : ""} text-(--aqs-accent)`} />
          </IconButton>
          <IconButton
            title={historyCount > 0 ? "Open history" : "History is empty"}
            onClick={onOpenHistory}
            disabled={historyCount === 0}
            badge={historyCount > 0 ? historyCount : undefined}
          >
            <History className="h-4.5 w-4.5 text-(--aqs-accent)" />
          </IconButton>
          <IconButton
            title={`Theme: ${theme}`}
            onClick={() => setTheme(theme === "light" ? "system" : theme === "system" ? "dark" : "light")}
          >
            {themeIcon}
          </IconButton>
          {!hideDonateButton ? (
            <a
              href="https://buymeacoffee.com/baneydonovan"
              target="_blank"
              rel="noreferrer"
              aria-label="Support Mike Answers"
              title="Support Mike Answers"
              className="inline-flex h-9 items-center justify-center rounded-full border border-transparent px-2.5 text-slate-500 transition hover:border-(--aqs-accent)/20 hover:bg-white/80 hover:text-(--aqs-accent-strong) dark:text-slate-300 dark:hover:bg-slate-800 md:h-10 md:px-3"
            >
              <HandCoins className="h-4.5 w-4.5 text-(--aqs-gold)" />
              <span className="hidden xl:ml-2 xl:inline text-xs font-semibold">Support</span>
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

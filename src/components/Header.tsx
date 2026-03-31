import type { ReactNode } from "react";
import { Download, HandCoins, History, Moon, Settings2, Sun } from "lucide-react";

interface HeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenHistory: () => void;
  onToggleSetup: () => void;
  setupOpen: boolean;
  accountControls?: ReactNode;
  emblemSrc: string;
  onInstallApp?: () => void;
  canInstallApp?: boolean;
  providerName: string;
  providerStatus: string;
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aqs-ink)]/10 bg-white/88 text-[var(--aqs-ink)] transition hover:border-[var(--aqs-accent)]/30 hover:bg-white dark:border-white/10 dark:bg-slate-950/72 dark:text-white"
    >
      {children}
    </button>
  );
}

export function Header({
  darkMode,
  onToggleDark,
  onOpenHistory,
  onToggleSetup,
  setupOpen,
  accountControls,
  emblemSrc,
  onInstallApp,
  canInstallApp,
  providerName,
  providerStatus,
}: HeaderProps) {
  const providerNeedsSetup = providerStatus === "key needed" || providerStatus.startsWith("Add ");

  return (
    <header className="no-print studio-panel mb-10 overflow-hidden bg-white/80 px-5 py-6 backdrop-blur-xl dark:bg-slate-950/80 md:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex items-center gap-6">
          <div className="neo-border neo-shadow-sm group relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.8rem] bg-white transition-all hover:rotate-3 dark:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--aqs-accent)]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <img
              src={emblemSrc}
              alt="Mike Answers emblem"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-[2px] w-8 rounded-full bg-[var(--aqs-accent)]" />
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                The Mike Answers Studio
              </div>
            </div>
            <h1 className="mt-2 text-[1.8rem] font-black leading-tight tracking-tight text-[var(--aqs-ink)] dark:text-white sm:text-[2.2rem]">
              Serious answers. <span className="text-[var(--aqs-accent)]">Direct evidence.</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="patch flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${providerNeedsSetup ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                {providerName} <span className="opacity-30">|</span> {providerStatus}
              </div>
              <div className="neo-border-thin hidden rounded-full bg-white/50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900/50 sm:block">
                Secure On-Device Logic
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="mr-2 hidden xl:block">
            {accountControls}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {canInstallApp && onInstallApp ? (
              <button
                type="button"
                onClick={onInstallApp}
                className="neo-border neo-shadow-sm flex h-11 items-center gap-2 rounded-2xl bg-[var(--aqs-accent)] px-5 text-sm font-black text-white transition-all hover:-translate-y-0.5 active:translate-y-px"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
            ) : null}
            <IconButton title={setupOpen ? "Hide settings" : "Open settings"} onClick={onToggleSetup}>
              <Settings2 className={`h-5 w-5 transition-transform ${setupOpen ? "rotate-90" : ""} text-[var(--aqs-accent)]`} />
            </IconButton>
            <IconButton title="Open history" onClick={onOpenHistory}>
              <History className="h-5 w-5 text-[var(--aqs-accent)]" />
            </IconButton>
            <IconButton
              title={darkMode ? "Enable light mode" : "Enable dark mode"}
              onClick={onToggleDark}
            >
              {darkMode ? <Sun className="h-5 w-5 text-[var(--aqs-gold)]" /> : <Moon className="h-5 w-5 text-[var(--aqs-accent)]" />}
            </IconButton>
            <a
              href="https://buymeacoffee.com/baneydonovan"
              target="_blank"
              rel="noreferrer"
              className="studio-card flex h-11 items-center gap-2 px-5 text-sm font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:text-white"
            >
              <HandCoins className="h-5 w-5 text-[var(--aqs-gold)]" />
              <span className="hidden sm:inline">Support</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

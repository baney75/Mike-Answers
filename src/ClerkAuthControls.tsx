import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";

export function ClerkAuthControls() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-medium text-slate-600 dark:text-slate-300 md:inline">
          Mike can keep your setup with this account
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-full border border-[var(--aqs-ink)]/10 bg-white/92 px-4 py-2 text-sm font-semibold text-[var(--aqs-ink)] transition hover:border-[var(--aqs-accent)]/35 hover:bg-white dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        >
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button
          type="button"
          className="rounded-full border border-[#2f2927] bg-[#2f2927] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#181312]"
        >
          Create free site account
        </button>
      </SignUpButton>
    </div>
  );
}

import type { ReactNode } from "react";

interface DeskWorkspaceShellProps {
  children: ReactNode;
}

export function DeskWorkspaceShell({ children }: DeskWorkspaceShellProps) {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden animate-in fade-in duration-500">
      {children}
    </div>
  );
}

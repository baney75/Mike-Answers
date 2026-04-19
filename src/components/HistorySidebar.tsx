import { useState, useEffect, useRef } from "react";
import { History, X, Search } from "lucide-react";
import type { HistoryItem } from "../types";
import { stripSolutionClientArtifacts } from "../utils/solution";

interface HistorySidebarProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClose: () => void;
}

export function HistorySidebar({ items, onSelect, onClose }: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const summarizeSolution = (solution: string) =>
    stripSolutionClientArtifacts(solution)
      .replace(/\[WEATHER:[^\]]*\]/g, "")
      .replace(/\[MAP:[^\]]*\]/g, "")
      .replace(/```(?:chart|table|figure|demo|stats)[\s\S]*?```/g, "")
      .replace(/[*#_`>\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredItems = searchQuery.trim()
    ? items.filter((item) => {
        const cleanSolution = summarizeSolution(item.solution).toLowerCase();
        const query = searchQuery.toLowerCase();
        return cleanSolution.includes(query);
      })
    : items;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end animate-in fade-in duration-200 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="History sidebar"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="scroll-studio h-full w-full max-w-md overflow-y-auto border-l border-(--aqs-ink)/10 bg-white/96 p-5 shadow-[0_20px_44px_rgba(20,17,21,0.16)] animate-in slide-in-from-right duration-300 dark:border-white/10 dark:bg-slate-950/96 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="display-face text-[1.75rem] font-black dark:text-white flex items-center gap-2 tracking-tight">
            <History className="w-6 h-6" /> Recent Solutions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="p-2 rounded-full border border-transparent hover:border-(--aqs-ink)/10 hover:bg-gray-100 dark:hover:border-white/10 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-(--aqs-ink)/10 bg-white dark:border-white/10 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:border-(--aqs-accent) focus:ring-4 focus:ring-[color:rgba(122,31,52,0.18)]"
          />
        </div>

        {filteredItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center mt-10 text-sm font-medium">
            {searchQuery ? "No matching results." : "No history yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const cleanSolution = summarizeSolution(item.solution);

              return (
              <button
                type="button"
                key={item.id}
                className="w-full rounded-[1.2rem] border border-(--aqs-ink)/10 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-gray-800 dark:hover:bg-gray-800"
                onClick={() => onSelect(item)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="rounded-full border border-(--aqs-accent) bg-(--aqs-accent-soft) px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-(--aqs-accent-strong) dark:border-(--aqs-accent-dark) dark:bg-[color:rgba(122,31,52,0.2)] dark:text-(--aqs-accent-dark)">
                    {item.type === "grade" ? "WORK CHECK" : "ANSWER"}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 text-sm font-medium leading-relaxed dark:text-gray-200 line-clamp-3">
                  {cleanSolution.replace(/[*#_`]/g, "")}
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

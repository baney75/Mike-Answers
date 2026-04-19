import { useMemo, useState } from "react";
import { ClipboardCopy, X } from "lucide-react";

import { buildAiCitations, type AiCitationInput } from "../services/aiCitation";

interface AiCitationModalProps {
  open: boolean;
  citationInput: AiCitationInput | null;
  onClose: () => void;
}

export function AiCitationModal({ open, citationInput, onClose }: AiCitationModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const citations = useMemo(() => (citationInput ? buildAiCitations(citationInput) : null), [citationInput]);

  if (!open || !citations) {
    return null;
  }

  async function copy(style: keyof typeof citations) {
    await navigator.clipboard.writeText(citations[style]);
    setCopied(style);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print" role="dialog" aria-modal="true" aria-label="AI citation helper">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-(--aqs-ink)/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,236,0.96))] shadow-[0_32px_100px_rgba(31,23,28,0.3)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(29,18,26,0.94))]">
        <div className="flex items-start justify-between gap-4 border-b border-(--aqs-ink)/10 px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">Cite AI</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-(--aqs-ink) dark:text-white">Student-ready AI citations</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">These citations follow current style guidance for generative AI. Always confirm your course policy on whether AI belongs in a bibliography, notes, appendix, or disclosure section.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {([
            ["APA", citations.apa],
            ["MLA", citations.mla],
            ["Chicago", citations.chicago],
          ] as const).map(([label, value]) => (
            <section key={label} className="rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white/84 p-5 dark:border-white/10 dark:bg-slate-950/55">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-black text-(--aqs-ink) dark:text-white">{label}</h3>
                <button type="button" onClick={() => void copy(label.toLowerCase() as keyof typeof citations)} className="inline-flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-900 dark:text-white">
                  <ClipboardCopy className="h-4 w-4" /> {copied === label.toLowerCase() ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">{value}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

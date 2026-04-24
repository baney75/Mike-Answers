import { ChevronDown } from "lucide-react";

import { SUBJECT_OPTIONS } from "../../constants/subjects";
import { Dropzone } from "../Dropzone";

interface HomeComposerCardProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  providerName: string;
  providerReady: boolean;
  onOpenSetup: () => void;
  onImageSelected: (file: File) => void;
  onTextPasted: (text: string) => void;
  onQuickSubmit: (text: string) => void;
  onDeepSubmit: (text: string) => void;
  onError: (msg: string) => void;
  onVoiceInput?: (text: string) => void;
  onAudioTranscribe?: (audioBlob: Blob) => Promise<string>;
}

function SubjectSelect({
  subject,
  onSubjectChange,
}: {
  subject: string;
  onSubjectChange: (subject: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="home-subject-select"
        className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400"
      >
        Subject
      </label>
      <div className="relative">
        <select
          id="home-subject-select"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          className="select-themed appearance-none rounded-full border border-(--aqs-ink)/10 bg-white/96 py-1.5 pl-3 pr-8 text-sm font-semibold text-(--aqs-ink) outline-none transition focus-visible:border-(--aqs-accent) focus-visible:ring-4 focus-visible:ring-[rgba(122,31,52,0.14)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
        >
          {SUBJECT_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)" />
      </div>
    </div>
  );
}

export function HomeComposerCard({
  subject,
  onSubjectChange,
  providerName,
  providerReady,
  onOpenSetup,
  onImageSelected,
  onTextPasted,
  onQuickSubmit,
  onDeepSubmit,
  onError,
  onVoiceInput,
  onAudioTranscribe,
}: HomeComposerCardProps) {
  return (
    <section className="studio-panel flex flex-col gap-2 bg-white/84 p-2.5 dark:bg-slate-950/80 md:gap-3 md:p-3">
      {!providerReady ? (
        <button
          type="button"
          onClick={onOpenSetup}
          className="flex items-center gap-2 rounded-[1rem] border border-(--aqs-accent)/14 bg-(--aqs-accent-soft) px-3 py-2 text-left transition hover:bg-(--aqs-accent-soft-strong) dark:border-(--aqs-accent-dark)/20 dark:bg-[#1a0b12] dark:hover:bg-[#250f18]"
        >
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
          <p className="flex-1 text-xs font-semibold text-(--aqs-ink) dark:text-white">
            Add your <span className="font-black">{providerName}</span> key to start solving
          </p>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
            Setup →
          </span>
        </button>
      ) : null}

      <Dropzone
        subjectControl={<SubjectSelect subject={subject} onSubjectChange={onSubjectChange} />}
        onImageSelected={onImageSelected}
        onTextPasted={onTextPasted}
        onQuickSubmit={onQuickSubmit}
        onDeepSubmit={onDeepSubmit}
        onError={onError}
        onVoiceInput={onVoiceInput}
        onAudioTranscribe={onAudioTranscribe}
      />
    </section>
  );
}

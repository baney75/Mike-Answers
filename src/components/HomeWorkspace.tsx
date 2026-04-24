import { HomeComposerCard } from "./home/HomeComposerCard";
import { HomeIdentityBlock } from "./home/HomeIdentityBlock";
import { HomeUtilityRail } from "./home/HomeUtilityRail";

interface HomeWorkspaceProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  heroSrc: string;
  providerName: string;
  providerReady: boolean;
  starterPrompts: string[];
  onPrefillPrompt: (text: string) => void;
  onOpenSetup: () => void;
  onOpenDailyDesk: () => void;
  onImageSelected: (file: File) => void;
  onTextPasted: (text: string) => void;
  onQuickSubmit: (text: string) => void;
  onDeepSubmit: (text: string) => void;
  onError: (msg: string) => void;
  onVoiceInput?: (text: string) => void;
  onAudioTranscribe?: (audioBlob: Blob) => Promise<string>;
}

export function HomeWorkspace({
  subject,
  onSubjectChange,
  heroSrc,
  providerName,
  providerReady,
  starterPrompts,
  onPrefillPrompt,
  onOpenSetup,
  onOpenDailyDesk,
  onImageSelected,
  onTextPasted,
  onQuickSubmit,
  onDeepSubmit,
  onError,
  onVoiceInput,
  onAudioTranscribe,
}: HomeWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 xl:grid xl:grid-cols-12 xl:gap-3">
        <section className="flex min-h-0 flex-col gap-2.5 xl:col-span-8 xl:flex-1 xl:gap-3">
          <HomeIdentityBlock heroSrc={heroSrc} />
          <HomeComposerCard
            subject={subject}
            onSubjectChange={onSubjectChange}
            providerName={providerName}
            providerReady={providerReady}
            onOpenSetup={onOpenSetup}
            onImageSelected={onImageSelected}
            onTextPasted={onTextPasted}
            onQuickSubmit={onQuickSubmit}
            onDeepSubmit={onDeepSubmit}
            onError={onError}
            onVoiceInput={onVoiceInput}
            onAudioTranscribe={onAudioTranscribe}
          />
        </section>

        <aside className="shrink-0 xl:col-span-4">
          <HomeUtilityRail
            starterPrompts={starterPrompts}
            onPrefillPrompt={onPrefillPrompt}
            onOpenDailyDesk={onOpenDailyDesk}
          />
        </aside>
      </div>
    </div>
  );
}

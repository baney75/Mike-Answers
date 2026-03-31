import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, GraduationCap } from "lucide-react";

import { RichResponse } from "./RichResponse";
import { embedSourcesInSolution, extractEmbeddedSources } from "../utils/solution";

interface SolutionDisplayProps {
  solution: string;
  hideAnswerByDefault?: boolean;
}

function splitAnswerSection(text: string) {
  const match = text.match(/(^|\n)\*\*Answer:\*\*([\s\S]*)$/i);
  if (!match || match.index === undefined) {
    return { teachingBody: text.trim(), answerSection: "" };
  }

  const prefixLength = match[1]?.length ?? 0;
  const teachingBody = text.slice(0, match.index + prefixLength).trim();
  const answerSection = `**Answer:**${match[2]}`.trim();
  return { teachingBody, answerSection };
}

export function SolutionDisplay({ solution, hideAnswerByDefault = false }: SolutionDisplayProps) {
  const [answerVisible, setAnswerVisible] = useState(!hideAnswerByDefault);
  const { body, sources } = useMemo(() => extractEmbeddedSources(solution), [solution]);
  const { teachingBody, answerSection } = useMemo(() => splitAnswerSection(body), [body]);
  const teachingWithSources = useMemo(
    () => embedSourcesInSolution(teachingBody, sources),
    [teachingBody, sources],
  );
  const canHideAnswer = hideAnswerByDefault && Boolean(answerSection);

  useEffect(() => {
    setAnswerVisible(!hideAnswerByDefault);
  }, [hideAnswerByDefault, solution]);

  return (
    <div className="print-solution-shell studio-panel p-6 md:p-10">
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <RichResponse text={canHideAnswer ? teachingWithSources : solution} />
      </div>

      {canHideAnswer ? (
        <section className="print-answer-callout neo-border mt-10 rounded-[2rem] bg-[var(--aqs-accent-soft)] p-6 dark:bg-[color:rgba(139,30,63,0.12)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="neo-border-thin neo-shadow-sm flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--aqs-accent-strong)] dark:bg-slate-900 dark:text-[var(--aqs-accent-dark)]">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-[var(--aqs-ink)] dark:text-white">Method First Solve</h3>
                <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  This looks like a coursework request. Mike is configured to show the reasoning first so you can learn the steps before checking the final result.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAnswerVisible((value) => !value)}
              className="neo-border neo-shadow inline-flex shrink-0 items-center justify-center gap-3 rounded-[1.25rem] bg-white px-8 py-4 text-base font-black text-[var(--aqs-ink)] transition-all hover:-translate-y-1 active:translate-y-px dark:bg-slate-900 dark:text-white"
            >
              {answerVisible ? <EyeOff className="h-5 w-5 text-[var(--aqs-accent)]" /> : <Eye className="h-5 w-5 text-[var(--aqs-accent)]" />}
              {answerVisible ? "Hide Answer" : "Reveal Answer"}
            </button>
          </div>

          {answerVisible ? (
            <div className="neo-border-thin mt-8 rounded-[1.5rem] bg-white p-6 shadow-inner dark:bg-slate-950">
              <div className="prose prose-slate max-w-none dark:prose-invert">
                <RichResponse text={answerSection} compact />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}


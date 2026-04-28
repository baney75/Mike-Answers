import { useEffect, useMemo, useRef, useState } from "react";
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
  const hideRef = useRef(hideAnswerByDefault);
  const { body, sources } = useMemo(() => extractEmbeddedSources(solution), [solution]);
  const { teachingBody, answerSection } = useMemo(() => splitAnswerSection(body), [body]);
  const teachingWithSources = useMemo(
    () => embedSourcesInSolution(teachingBody, sources),
    [teachingBody, sources],
  );
  const canHideAnswer = hideAnswerByDefault && Boolean(answerSection);

  useEffect(() => {
    if (hideRef.current !== hideAnswerByDefault) {
      hideRef.current = hideAnswerByDefault;
      setAnswerVisible(!hideAnswerByDefault);
    }
  }, [hideAnswerByDefault]);

  return (
    <div className="print-solution-shell studio-panel bg-white/86 p-5 md:p-7 dark:bg-slate-950/78">
      <div className="mx-auto max-w-3xl">
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <RichResponse text={canHideAnswer ? teachingWithSources : solution} />
        </div>
      </div>

      {canHideAnswer ? (
        <section className="mt-8 rounded-3xl border border-(--aqs-accent)/14 bg-(--aqs-accent-soft) p-5 dark:border-(--aqs-accent-dark)/20 dark:bg-[#1a0b12]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="neo-border-thin flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-(--aqs-accent-strong) dark:bg-slate-900 dark:text-(--aqs-accent-dark)">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="display-face text-[1.5rem] font-black tracking-tight text-(--aqs-ink) dark:text-white">
                  Method first
                </h3>
                <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  This is treated like course work, so the reasoning stays visible before the final answer.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAnswerVisible((value) => !value)}
              className="neo-border-thin inline-flex shrink-0 items-center justify-center gap-3 rounded-[1.1rem] bg-white px-6 py-3 text-sm font-black text-(--aqs-ink) transition hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              {answerVisible ? <EyeOff className="h-4.5 w-4.5 text-(--aqs-accent)" /> : <Eye className="h-4.5 w-4.5 text-(--aqs-accent)" />}
              {answerVisible ? "Hide Answer" : "Reveal Answer"}
            </button>
          </div>

          {answerVisible ? (
            <div className="mt-6 rounded-[1.3rem] border border-(--aqs-ink)/8 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
              <div className="mx-auto max-w-3xl">
                <div className="prose prose-slate max-w-none dark:prose-invert">
                  <RichResponse text={answerSection} compact />
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

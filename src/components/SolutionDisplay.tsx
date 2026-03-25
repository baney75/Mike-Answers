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
    <div className="print-solution-shell rounded-xl border-2 border-gray-900 bg-white p-6 neo-shadow dark:border-gray-100 dark:bg-gray-900 md:p-8">
      <RichResponse text={canHideAnswer ? teachingWithSources : solution} />

      {canHideAnswer ? (
        <section className="print-answer-callout mt-6 rounded-[1.4rem] border-2 border-gray-900 bg-[var(--aqs-accent-soft)]/70 p-5 dark:border-gray-100 dark:bg-[color:rgba(122,31,52,0.18)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border-2 border-gray-900 bg-white p-2 text-[var(--aqs-accent-strong)] dark:border-gray-100 dark:bg-gray-950 dark:text-[var(--aqs-accent-dark)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Method First</h3>
                <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">
                  This looks like coursework, so the final answer starts hidden. Read the reasoning first, then reveal the answer only when you want to check your work.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAnswerVisible((value) => !value)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-3 font-bold text-gray-900 transition hover:-translate-y-0.5 dark:border-gray-100 dark:bg-gray-950 dark:text-gray-100"
            >
              {answerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {answerVisible ? "Hide Answer" : "Reveal Answer"}
            </button>
          </div>

          {answerVisible ? (
            <div className="mt-5 rounded-[1.2rem] border-2 border-gray-900 bg-white p-4 dark:border-gray-100 dark:bg-gray-950">
              <RichResponse text={answerSection} compact />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

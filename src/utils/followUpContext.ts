import type { HistoryItem, OriginalQuestionContext } from "../types";
import { stripSolutionClientArtifacts } from "./solution";

export interface FollowUpContextPayload {
  originalQuestionText?: string;
  originalImageBase64?: string;
  baseSolutionText: string;
}

const DEFAULT_BASE_SOLUTION_MAX_CHARS = 2500;

function truncateAtSentenceBoundary(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  const clipped = text.slice(0, maxChars);
  const boundary = Math.max(
    clipped.lastIndexOf("\n\n"),
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("? "),
    clipped.lastIndexOf("! "),
  );

  if (boundary >= Math.floor(maxChars * 0.6)) {
    return `${clipped.slice(0, boundary).trim()}…`;
  }

  return `${clipped.trim()}…`;
}

export function buildCompactBaseSolutionText(solution: string, maxChars = DEFAULT_BASE_SOLUTION_MAX_CHARS) {
  const normalized = stripSolutionClientArtifacts(solution)
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return truncateAtSentenceBoundary(normalized, maxChars);
}

export function normalizeOriginalQuestionContext(
  originalContext?: OriginalQuestionContext | null,
  legacyRequestText?: string | null,
) {
  const text = originalContext?.text?.trim() || legacyRequestText?.trim() || undefined;
  const imageBase64 = originalContext?.imageBase64?.trim() || undefined;

  if (!text && !imageBase64) {
    return undefined;
  }

  return {
    ...(text ? { text } : {}),
    ...(imageBase64 ? { imageBase64 } : {}),
  } satisfies OriginalQuestionContext;
}

export function normalizeHistoryItemOriginalContext(
  item: Pick<HistoryItem, "originalContext" | "requestText">,
) {
  return normalizeOriginalQuestionContext(item.originalContext, item.requestText);
}

export function buildFollowUpContextPayload(options: {
  solution: string;
  originalContext?: OriginalQuestionContext | null;
  requestText?: string | null;
  maxChars?: number;
}) {
  const normalizedContext = normalizeOriginalQuestionContext(options.originalContext, options.requestText);

  return {
    originalQuestionText: normalizedContext?.text,
    originalImageBase64: normalizedContext?.imageBase64,
    baseSolutionText: buildCompactBaseSolutionText(
      options.solution,
      options.maxChars ?? DEFAULT_BASE_SOLUTION_MAX_CHARS,
    ),
  } satisfies FollowUpContextPayload;
}

export function buildFollowUpContextText(payload: FollowUpContextPayload) {
  const sections: string[] = [];

  if (payload.originalQuestionText) {
    sections.push(`Original question:\n${payload.originalQuestionText}`);
  } else if (payload.originalImageBase64) {
    sections.push("Original question: provided as an image. Use that image as part of the tutoring context.");
  }

  if (payload.baseSolutionText) {
    sections.push(`Base solution from the earlier solve:\n${payload.baseSolutionText}`);
  }

  return sections.join("\n\n").trim();
}

const EXPLICIT_HOMEWORK_HINTS =
  /\b(homework|worksheet|assignment|quiz|exam|test|lab report|discussion post|problem set|show your work|professor|teacher|class|course|student)\b/i;
const ACADEMIC_TASK_VERBS =
  /\b(solve|evaluate|simplify|factor|graph|differentiate|derivative|integrate|integral|limit|prove|show that|determine|find|compute|calculate|balance|analyze|derive)\b/i;
const STRUCTURED_PROBLEM_HINTS =
  /(?:^\s*\d+[\).\s])|(?:\([a-d]\))|(?:\b[fgy]\([^)]+\))|(?:=\s*[-+*/\dA-Za-z(])/m;
const DEEP_RESEARCH_VAGUE_HINTS =
  /\b(research this|look into this|tell me about this|explain this topic|help with this essay|write about this|what about this)\b/i;

export function isLikelyHomeworkRequest(
  text: string | null | undefined,
  options?: { hasImage?: boolean; subject?: string },
) {
  const trimmed = text?.trim() ?? "";
  const hasImage = options?.hasImage ?? false;
  const subject = options?.subject ?? "Auto-detect";
  const academicSubject = subject !== "Auto-detect" && subject !== "History" && subject !== "Literature";

  if (!trimmed) {
    return hasImage && academicSubject;
  }

  if (EXPLICIT_HOMEWORK_HINTS.test(trimmed)) {
    return true;
  }

  if (STRUCTURED_PROBLEM_HINTS.test(trimmed) && (ACADEMIC_TASK_VERBS.test(trimmed) || academicSubject)) {
    return true;
  }

  if (academicSubject && /\b(question|problem|exercise|part a|part b|show work)\b/i.test(trimmed)) {
    return true;
  }

  return false;
}

export function shouldAskClarifyingQuestions(text: string | null | undefined) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return false;
  }

  if (trimmed.length <= 14 && !/[=()0-9]/.test(trimmed)) {
    return true;
  }

  return DEEP_RESEARCH_VAGUE_HINTS.test(trimmed);
}

import type { ProviderId } from "../types";

export interface AiCitationInput {
  providerId: ProviderId;
  providerLabel: string;
  model?: string;
  prompt?: string;
  generatedAt: string;
  appName?: string;
  appUrl?: string;
}

function compactPrompt(prompt?: string) {
  const value = prompt?.replace(/\s+/g, " ").trim() ?? "";
  if (!value) {
    return "Prompt not saved";
  }

  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildAiCitations(input: AiCitationInput) {
  const model = input.model?.trim() || "model not disclosed";
  const prompt = compactPrompt(input.prompt);
  const appName = input.appName ?? "Mike Answers";
  const appUrl = input.appUrl ?? "https://mike-net.top";

  return {
    apa: `${input.providerLabel}. (${formatDate(input.generatedAt)}). ${model} [Large language model]. ${appName}. ${appUrl}. Prompt: "${prompt}"`,
    mla: `"${prompt}" prompt. ${input.providerLabel}, ${model}, ${formatDate(input.generatedAt)}, ${appName}, ${appUrl}.`,
    chicago: `${input.providerLabel}. ${model}. Response to "${prompt}." ${appName}. Generated ${formatDateTime(input.generatedAt)}. ${appUrl}.`,
  };
}

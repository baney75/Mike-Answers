import type { LegacyProviderId } from "../types";

export interface AiCitationInput {
  providerId: LegacyProviderId;
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

  return value.length > 180 ? `${value.slice(0, 177)}...` : value.replace(/[.?!]\s*$/, "");
}

function getProviderCitationMeta(input: AiCitationInput) {
  if (input.providerId === "gemini") {
    return { company: "Google", tool: "Gemini", url: "https://gemini.google.com/" };
  }
  if (input.providerId === "openrouter") {
    return { company: "OpenRouter", tool: "OpenRouter", url: "https://openrouter.ai/" };
  }
  if (input.providerId === "puter") {
    return { company: "Puter", tool: "Puter", url: "https://puter.com/" };
  }
  if (input.providerId === "minimax") {
    return { company: "MiniMax", tool: "MiniMax", url: "https://www.minimax.io/" };
  }

  return {
    company: input.providerLabel,
    tool: input.providerLabel,
    url: input.appUrl ?? "Custom OpenAI-compatible endpoint",
  };
}

function formatApaDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMlaDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const { company, tool, url } = getProviderCitationMeta(input);
  const model = input.model?.trim() || tool;
  const prompt = compactPrompt(input.prompt);
  const appName = input.appName ?? "Mike Answers";
  const generatedYear = new Date(input.generatedAt).getFullYear();
  const generatedDate = formatApaDate(input.generatedAt);
  const generatedMlaDate = formatMlaDate(input.generatedAt);
  const disclosure = `Generated in ${appName} on ${generatedDate} from prompt: "${prompt}."`;

  return {
    apa: `${company}. (${generatedYear}). ${model} [Large language model]. ${url} ${disclosure}`,
    mla: `"${prompt}" prompt. ${tool}, model ${model}, ${company}, ${generatedMlaDate}, ${url}. Generated via ${appName}.`,
    chicago: `${tool}, response to "${prompt}," ${company}, ${formatDateTime(input.generatedAt)}, ${url}. Generated via ${appName}.`,
  };
}

import type { ProviderId, SolveMode } from "../types";
import {
  buildRequestPlan,
  buildTutorSystemInstruction,
  buildUniversalSystemInstruction,
} from "./gemini";
import { isLikelyHomeworkRequest, shouldAskClarifyingQuestions } from "../utils/request";
import { normalizeProviderBaseUrl } from "../utils/urlSafety";
import { fetchJson } from "../utils/fetch";
import {
  buildFollowUpContextText,
  type FollowUpContextPayload,
} from "../utils/followUpContext";

type OpenAICompatibleMessage =
  | {
      role: "system" | "user" | "assistant";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    };

interface OpenAICompatibleChatResponse {
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

interface OpenAICompatibleRequestOptions {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl: string;
  model: string;
  providerLabel?: string;
}

function normalizeContent(value: OpenAICompatibleChatResponse["choices"]) {
  const content = value?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

function buildHeaders(options: OpenAICompatibleRequestOptions) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey?.trim()) {
    headers.Authorization = `Bearer ${options.apiKey.trim()}`;
  }

  if (options.providerId === "openrouter") {
    const referer = typeof window !== "undefined" ? window.location.origin : "";
    if (referer) {
      headers["HTTP-Referer"] = referer;
    }
    headers["X-Title"] = "Mike Answers";
  }

  return headers;
}

/** Visible for tests: Venice adds built-in web search via `venice_parameters` (see https://docs.venice.ai/). */
export function mergeOpenAICompatibleRequestBody(baseUrl: string, body: Record<string, unknown>): Record<string, unknown> {
  let normalized: string;
  try {
    normalized = normalizeProviderBaseUrl(baseUrl).toLowerCase();
  } catch {
    return body;
  }

  if (!normalized.includes("api.venice.ai")) {
    return body;
  }

  const existing = body.venice_parameters;
  const merged =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...body,
    venice_parameters: {
      enable_web_search: "auto",
      enable_web_citations: true,
      ...merged,
    },
  };
}

async function postChatCompletion(
  options: OpenAICompatibleRequestOptions,
  body: Record<string, unknown>,
) {
  const requestBody = mergeOpenAICompatibleRequestBody(options.baseUrl, body);

  let responsePayload: OpenAICompatibleChatResponse;
  try {
    responsePayload = await fetchJson<OpenAICompatibleChatResponse>(
      `${normalizeProviderBaseUrl(options.baseUrl)}/chat/completions`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: buildHeaders(options),
      },
    );
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : "";
    if (message.includes("401") || message.includes("403")) {
      throw new Error(`Check your ${options.providerLabel ?? options.providerId} API key.`);
    }
    throw new Error(`${options.providerLabel ?? options.providerId} request failed. ${message}`);
  }

  const text = normalizeContent(responsePayload.choices);
  if (!text) {
    throw new Error(`${options.providerLabel ?? options.providerId} returned an empty response.`);
  }

  return text;
}

export function buildOpenAICompatibleTutorConversation(
  history: { role: string; text: string }[],
  message: string,
  followUpContext?: FollowUpContextPayload,
  followUpImageBase64?: string,
) {
  const messages: OpenAICompatibleMessage[] = [];

  if (followUpContext) {
    const content: OpenAICompatibleMessage["content"] = [];
    if (followUpContext.originalImageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${followUpContext.originalImageBase64}`,
        },
      });
    }
    const contextText = buildFollowUpContextText(followUpContext);
    if (contextText) {
      content.push({
        type: "text",
        text: contextText,
      });
    }
    if (content.length > 0) {
      messages.push({ role: "user", content });
      messages.push({
        role: "assistant",
        content: "Understood. I will use the original question, image, and earlier solution in this follow-up reply.",
      });
    }
  }

  for (const item of history) {
    const content: OpenAICompatibleMessage["content"] = [];
    if ("imageBase64" in item && (item as { imageBase64?: string }).imageBase64) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${(item as { imageBase64: string }).imageBase64}`,
        },
      });
    }
    content.push({ type: "text", text: item.text });
    messages.push({
      role: item.role === "user" ? "user" : "assistant",
      content,
    });
  }

  const currentContent: OpenAICompatibleMessage["content"] = [];
  if (followUpImageBase64) {
    currentContent.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${followUpImageBase64}`,
      },
    });
  }
  if (message) {
    currentContent.push({ type: "text", text: message });
  }
  if (currentContent.length === 0) {
    currentContent.push({ type: "text", text: "(user attached an image)" });
  }

  messages.push({
    role: "user",
    content: currentContent,
  });

  return messages;
}

export async function solveTextQuestionWithOpenAICompatible(options: {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl: string;
  model: string;
  providerLabel?: string;
  text: string;
  mode: Exclude<SolveMode, "research">;
  subject?: string;
  detailed?: boolean;
  preferredLocation?: string;
  localDateTime?: string;
  timeZone?: string;
}) {
  const {
    providerId,
    apiKey,
    baseUrl,
    model,
    providerLabel,
    text,
    mode,
    subject = "Auto-detect",
    detailed = false,
    preferredLocation,
    localDateTime,
    timeZone,
  } = options;
  const requestPlan = buildRequestPlan(mode, text, detailed);
  const looksLikeHomework = isLikelyHomeworkRequest(text, { subject });
  const shouldClarify = shouldAskClarifyingQuestions(text);
  const systemInstruction = buildUniversalSystemInstruction({
    subject,
    detailed,
    requestText: text,
    providerSupportsGrounding: false,
    includeGroundingWarning: requestPlan.useGrounding,
    currentModel: model,
    providerLabel: providerLabel ?? (providerId === "openrouter" ? "OpenRouter" : providerId === "custom_openai" ? "Custom OpenAI-Compatible" : "OpenAI-Compatible"),
    mode,
    preferredLocation,
    localDateTime,
    timeZone,
    routeLabel: "browser-local",
    hasImageInput: false,
  });

  return postChatCompletion(
    { providerId, apiKey, baseUrl, model, providerLabel },
    {
      model,
      temperature: mode === "deep" ? 0.2 : 0.45,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `User request:\n\n${text}\n\nIf the user pasted their own attempt, notes, or answer, proactively check that work first and then continue tutoring. If it is just a question, solve it directly.\n\n${looksLikeHomework ? "This looks like student coursework. Teach the underlying method first and keep the final answer confined to the **Answer:** section only." : ""}\n${shouldClarify ? "This may be too vague for a correct answer. If key details are missing, ask up to 3 concise clarification questions and stop there." : ""}`,
        },
      ] satisfies OpenAICompatibleMessage[],
    },
  );
}

export async function solveImageQuestionWithOpenAICompatible(options: {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl: string;
  model: string;
  providerLabel?: string;
  base64Image: string;
  mode: Exclude<SolveMode, "research">;
  subject?: string;
  detailed?: boolean;
  preferredLocation?: string;
  localDateTime?: string;
  timeZone?: string;
}) {
  const {
    providerId,
    apiKey,
    baseUrl,
    model,
    providerLabel,
    base64Image,
    mode,
    subject = "Auto-detect",
    detailed = false,
    preferredLocation,
    localDateTime,
    timeZone,
  } = options;
  const systemInstruction = buildUniversalSystemInstruction({
    subject,
    detailed,
    requestText: subject === "Auto-detect" ? "" : `Subject: ${subject}`,
    providerSupportsGrounding: false,
    includeGroundingWarning: false,
    currentModel: model,
    providerLabel: providerLabel ?? (providerId === "openrouter" ? "OpenRouter" : providerId === "custom_openai" ? "Custom OpenAI-Compatible" : "OpenAI-Compatible"),
    mode,
    preferredLocation,
    localDateTime,
    timeZone,
    routeLabel: "browser-local",
    hasImageInput: true,
  });

  return postChatCompletion(
    { providerId, apiKey, baseUrl, model, providerLabel },
    {
      model,
      temperature: mode === "deep" ? 0.2 : 0.45,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: `Analyze the uploaded image carefully. It may contain a question, a partial attempt, completed student work, or both.\n\nIf the image includes the user's work, proactively check it before giving the final answer:\n- say what is correct,\n- identify the first mistake or missing step,\n- continue from the last correct idea,\n- and then provide the corrected solution.\n\nIf the image is only the question prompt, solve it directly. Assume this may be coursework. Teach the method first and keep any final numeric/result statement isolated in the **Answer:** section only.\n\nIf the image is too ambiguous to answer correctly, ask concise clarification questions instead of guessing.`,
            },
          ],
        },
      ] satisfies OpenAICompatibleMessage[],
    },
  );
}

export async function chatWithOpenAICompatible(options: {
  providerId: ProviderId;
  apiKey?: string;
  baseUrl: string;
  model: string;
  providerLabel?: string;
  history: { role: string; text: string }[];
  message: string;
  followUpContext?: FollowUpContextPayload;
  followUpImageBase64?: string;
  preferredLocation?: string;
  subject?: string;
  localDateTime?: string;
  timeZone?: string;
}) {
  const {
    providerId,
    apiKey,
    baseUrl,
    model,
    providerLabel,
    history,
    message,
    followUpContext,
    followUpImageBase64,
    preferredLocation,
    subject,
    localDateTime,
    timeZone,
  } = options;

  const hasImage = Boolean(followUpContext?.originalImageBase64) || Boolean(followUpImageBase64);

  const messages: OpenAICompatibleMessage[] = [
    {
      role: "system",
      content: buildTutorSystemInstruction(false, {
        currentModel: model,
        providerLabel: providerLabel ?? (providerId === "openrouter" ? "OpenRouter" : providerId === "custom_openai" ? "Custom OpenAI-Compatible" : "OpenAI-Compatible"),
        preferredLocation,
        localDateTime,
        timeZone,
        routeLabel: "browser-local",
        hasImageInput: hasImage,
        subject,
      }),
    },
  ];

  messages.push(...buildOpenAICompatibleTutorConversation(history, message, followUpContext, followUpImageBase64));

  return postChatCompletion(
    { providerId, apiKey, baseUrl, model, providerLabel },
    {
      model,
      temperature: 0.35,
      messages,
    },
  );
}

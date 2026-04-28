import type { PromptRuntimeContext, SolveMode } from "../types";
import type { FollowUpContextPayload } from "../utils/followUpContext";
import { buildFollowUpContextText } from "../utils/followUpContext";
import { isLikelyHomeworkRequest, shouldAskClarifyingQuestions } from "../utils/request";
import {
  buildRequestPlan,
  buildTutorSystemInstruction,
  buildUniversalSystemInstruction,
} from "./gemini";

const PUTER_SCRIPT_URL = "https://js.puter.com/v2/";
const PUTER_LOAD_TIMEOUT_MS = 12_000;

type PuterMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

type PuterChatResponse =
  | string
  | {
      message?: {
        content?: string;
      };
      text?: string;
      toString?: () => string;
    };

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat?: (
          promptOrMessages: string | PuterMessage[],
          testModeOrOptions?: boolean | Record<string, unknown>,
          options?: Record<string, unknown>,
        ) => Promise<PuterChatResponse>;
      };
    };
  }
}

let puterScriptPromise: Promise<void> | null = null;

function loadPuterScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Puter is only available in the browser."));
  }
  if (window.puter?.ai?.chat) {
    return Promise.resolve();
  }
  if (puterScriptPromise) {
    return puterScriptPromise;
  }

  puterScriptPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      puterScriptPromise = null;
      reject(new Error("Puter.js took too long to load. Check your connection, then retry or choose a BYOK provider."));
    }, PUTER_LOAD_TIMEOUT_MS);
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const fail = () => {
      window.clearTimeout(timeout);
      puterScriptPromise = null;
      reject(new Error("Puter.js failed to load. Check your network, content blockers, or choose a BYOK provider."));
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PUTER_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PUTER_SCRIPT_URL;
    script.async = true;
    script.onload = finish;
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return puterScriptPromise;
}

async function getPuterChat() {
  await loadPuterScript();
  const chat = window.puter?.ai?.chat;
  if (!chat) {
    throw new Error("Puter.js loaded, but puter.ai.chat is unavailable.");
  }
  return chat;
}

function normalizePuterResponse(response: PuterChatResponse) {
  if (typeof response === "string") {
    return response.trim();
  }
  const text = response.message?.content ?? response.text ?? response.toString?.();
  if (!text?.trim()) {
    throw new Error("Puter returned an empty response.");
  }
  return text.trim();
}

function buildPuterTutorConversation(
  history: { role: string; text: string }[],
  message: string,
  followUpContext?: FollowUpContextPayload,
) {
  const messages: PuterMessage[] = [];
  if (followUpContext) {
    const contextText = buildFollowUpContextText({
      ...followUpContext,
      originalImageBase64: undefined,
    });
    if (contextText) {
      const imageNotice = followUpContext.originalImageBase64
        ? "\n\nNote: this Puter route is text-first in Mike Answers. The original image is not reattached on this follow-up, so use the saved text and earlier solution unless the user describes the image again."
        : "";
      messages.push({ role: "user", content: `${contextText}${imageNotice}` });
      messages.push({
        role: "assistant",
        content: "Understood. I will use the original question and earlier solution in this follow-up reply.",
      });
    }
  }

  for (const item of history) {
    messages.push({
      role: item.role === "user" ? "user" : "assistant",
      content: item.text,
    });
  }
  messages.push({ role: "user", content: message });
  return messages;
}

export async function solveTextQuestionWithPuter(options: {
  text: string;
  model: string;
  mode: Exclude<SolveMode, "research">;
  subject?: string;
  detailed?: boolean;
  preferredLocation?: string;
  promptContext?: PromptRuntimeContext;
}) {
  const {
    text,
    model,
    mode,
    subject = "Auto-detect",
    detailed = false,
    preferredLocation,
    promptContext,
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
    providerLabel: "Puter",
    mode,
    preferredLocation,
    localDateTime: promptContext?.localDateTime,
    timeZone: promptContext?.timeZone,
    routeLabel: "puter-user-pays",
    hasImageInput: false,
  });
  const chat = await getPuterChat();
  const response = await chat(
    [
      { role: "system", content: systemInstruction },
      {
        role: "user",
        content: `User request:\n\n${text}\n\nIf the user pasted their own attempt, notes, or answer, proactively check that work first and then continue tutoring. If it is just a question, solve it directly.\n\n${looksLikeHomework ? "This looks like student coursework. Teach the underlying method first and keep the final answer confined to the **Answer:** section only." : ""}\n${shouldClarify ? "This may be too vague for a correct answer. If key details are missing, ask up to 3 concise clarification questions and stop there." : ""}`,
      },
    ],
    false,
    { model, temperature: mode === "deep" ? 0.2 : 0.45 },
  );

  return normalizePuterResponse(response);
}

export async function chatWithPuterTutor(options: {
  history: { role: string; text: string }[];
  message: string;
  followUpContext?: FollowUpContextPayload;
  model: string;
  preferredLocation?: string;
  subject?: string;
  promptContext?: PromptRuntimeContext;
}) {
  const {
    history,
    message,
    followUpContext,
    model,
    preferredLocation,
    subject,
    promptContext,
  } = options;
  if (!message.trim()) {
    throw new Error("Message must not be empty.");
  }

  const chat = await getPuterChat();
  const response = await chat(
    [
      {
        role: "system",
        content: buildTutorSystemInstruction(false, {
          currentModel: model,
          providerLabel: "Puter",
          preferredLocation,
          localDateTime: promptContext?.localDateTime,
          timeZone: promptContext?.timeZone,
          routeLabel: "puter-user-pays",
          hasImageInput: false,
          subject,
        }),
      },
      ...buildPuterTutorConversation(history, message, followUpContext),
    ],
    false,
    { model, temperature: 0.35 },
  );

  return normalizePuterResponse(response);
}

"use node";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type GroundingMetadata,
} from "@google/genai";
import { actionGeneric, makeFunctionReference } from "convex/server";
import { v } from "convex/values";

import type { ProviderId, SolutionSource, SolveMode, UserPreferencesSnapshot } from "../src/types";
import { embedSourcesInSolution } from "../src/utils/solution";
import { isLikelyHomeworkRequest, shouldAskClarifyingQuestions } from "../src/utils/request";
import { requireClerkIdentity } from "./lib";
import {
  getProviderDescriptor,
  providerDescriptors,
} from "../src/services/providers/registry";
import {
  MINIMAX_ADVANCED_BRIDGE_ENV,
  MINIMAX_ADVANCED_BRIDGE_TOKEN_ENV,
} from "../src/services/minimax";

const providerValidator = v.union(
  v.literal("gemini"),
  v.literal("openrouter"),
  v.literal("minimax"),
  v.literal("custom_openai"),
);
const runtimeSettingsValidator = v.any();

const keyMaterialRef = makeFunctionReference<
  "query",
  { provider: ProviderId },
  | {
      encryptedKey: string;
      iv: string;
      algorithm: string;
      keyVersion: string;
    }
  | null
>("providerKeys:getMyProviderKeyMaterial");
const storeKeyRef = makeFunctionReference<
  "mutation",
  {
    provider: ProviderId;
    encryptedKey: string;
    iv: string;
    algorithm: string;
    keyVersion: string;
  }
>("providerKeys:storeEncryptedProviderKey");
const deleteKeyRef = makeFunctionReference<
  "mutation",
  { provider: ProviderId }
>("providerKeys:deleteMyProviderKey");

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_CANDIDATES = {
  fast: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
  grounded: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  pro: ["gemini-2.5-pro", "gemini-2.5-flash"],
} as const;
const OPENROUTER_RECOMMENDATIONS = {
  fast: [
    "qwen/qwen3.6-plus-preview:free",
    "google/gemma-3-27b-it:free",
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
  ],
  deep: [
    "qwen/qwen3.6-plus-preview:free",
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "google/gemma-3-27b-it:free",
  ],
} as const;
const MAX_RATE_LIMIT_ATTEMPTS_PER_MODEL = 2;
const RATE_LIMIT_BACKOFF_MS = 1200;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_VERSION = "v1";

const PRO_COMPLEXITY_HINTS =
  /\b(prove|proof|derive|derivation|rigorous|formal|analy[sz]e|compare|synthesize|optimi[sz]e|walkthrough|theorem|graduate|dissertation|essay|case law|mechanism|multistep|step-by-step)\b/i;
const GROUNDED_QUESTION_HINTS =
  /\b(source|sources|cite|citation|reference|references|latest|recent|current|today|news|study|studies|paper|papers|journal|journals|guideline|guidelines|evidence|historical|history|law|legal|medical|medicine|statistic|statistics|real world|real-world|president|vice president|prime minister|governor|mayor|ceo|chief executive officer|secretary of state|speaker of the house|pope|king|queen)\b/i;
const SCHOLARLY_HINTS =
  /\b(scholarly|academic|peer-reviewed|peer reviewed|journal|journals|paper|papers|study|studies|meta-analysis|systematic review|doi|research article|literature review)\b/i;
const NEWS_HINTS =
  /\b(news|headline|headlines|breaking|reported|reporting|latest|recent|today|yesterday|this week|current events|election|conflict|war|market|markets|earnings|announced)\b/i;
const CURRENT_FACT_HINTS =
  /\b(current|currently|right now|today|as of|latest|most recent|incumbent|who is|who's|whos)\b/i;
const CALCULUS_HINTS =
  /\b(calculus|differentiat|derivativ|integral|integrat|limit|series|taylor|maclaurin|critical point|optimization|maxim|minim|concavity|inflection|related rates|differential equation)\b/i;
const GRAPHING_HINTS =
  /\b(graph|plot|sketch|curve|function shape|intercept|asymptote|turning point|critical point|domain|range|slope field|phase portrait)\b/i;
const LOW_TRUST_HOSTS = [
  "reddit.com",
  "quora.com",
  "brainly.com",
  "coursehero.com",
  "chegg.com",
  "wikihow.com",
  "forums",
  "stackexchange.com",
];
const PROXY_HOSTS = ["vertexaisearch.cloud.google.com", "vertexaisearch.cloud.googleusercontent.com"];
const TERTIARY_REFERENCE_HOSTS = ["wikipedia.org", "britannica.com"];
const ADVOCACY_OR_IDEOLOGY_HOSTS = [
  "amnesty.org",
  "hrw.org",
  "greenpeace.org",
  "heritage.org",
  "brookings.edu",
  "cato.org",
  "realinstitutoelcano.org",
  "rand.org",
];
const HIGH_TRUST_NEWS_HOSTS = ["reuters.com", "apnews.com", "bbc.com", "pbs.org", "npr.org"];
const CURATED_NEWS_HOSTS = ["san.com", "readtangle.com", "wsj.com", "newsnationnow.com", "thecentersquare.com"];
const SCHOLARLY_HOST_HINTS = [
  "pubmed",
  "nature.com",
  "science.org",
  "sciencedirect.com",
  "springer.com",
  "jstor.org",
  "wiley.com",
  "nejm.org",
  "thelancet.com",
  "cell.com",
  "ieee.org",
  "acm.org",
  "arxiv.org",
];
const OFFICIAL_ORG_HOSTS = [
  "who.int",
  "cdc.gov",
  "fda.gov",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "worldbank.org",
  "imf.org",
  "oecd.org",
  "un.org",
  "europa.eu",
  "parliament.uk",
];

const MEDIA_MARKER_PROMPT = `IMAGE SEARCH:
When visual content would help understanding, include an image search marker:
[IMAGE_SEARCH: "descriptive search query"]

Use for:
- Geographic locations, physical objects, anatomy, diagrams, architecture, historical places, and anything the user explicitly wants to see.

VIDEO SEARCH:
When the best answer includes a real video, lecture, interview, tutorial, documentary, performance, or official clip, include:
[VIDEO_SEARCH: "descriptive YouTube search query"]

Use for:
- Music videos, speeches, lectures, walkthroughs, tutorials, demonstrations, documentaries, and user requests to "show me the video" or "find this on YouTube."

WEB SEARCH:
When the user explicitly wants further reading, official pages, primary documents, or a short list of links, include:
[WEB_SEARCH: "descriptive web search query"]`;

const SYSTEM_PROMPT = `You are an elite academic tutor and research assistant. You solve questions with rigorous accuracy across EVERY domain: mathematics, physics, chemistry, biology, computer science, engineering, history, literature, philosophy, economics, law, medicine, linguistics, and more.

YOUR CORE PRINCIPLES:
1. ACCURACY IS PARAMOUNT. Double-check every calculation. Verify every fact.
2. Show clear, step-by-step reasoning so students genuinely learn.
3. Cite well-known theorems, laws, or principles by name when applicable.
4. If a question is ambiguous, state your interpretation and proceed.
5. Be proactive. If the user provides partial or completed work, inspect that work first and continue tutoring from it.
6. For mathematics, prefer exact symbolic answers first, then give decimal approximations only when useful.
7. For time-sensitive facts, verify them with live search grounding and state the exact date or time context when it matters.
8. Match reasoning depth to the task. Be fast and direct for simple questions; reason deeply only when the problem is genuinely multi-step, ambiguous, or high-stakes.

FORMATTING RULES:
- Use LaTeX with single dollar signs ($) for inline math and double ($$) for display math.
- NEVER use \\( \\) or \\[ \\]. NEVER write math as plain text.
- For chemistry: use LaTeX subscripts for formulas (e.g., $\\text{H}_2\\text{O}$, $\\text{NaOH}$).
- For 2D molecular structures, output SMILES inside a \`\`\`smiles code block.
- For organic reactions, write balanced equations using LaTeX with \\rightarrow.

CODE & COMPUTATION:
- When a problem benefits from computation, include runnable Python code in a \`\`\`python block.
- For physics simulations, statistical analysis, or numerical methods, always include Python.

DATA VISUALIZATION:
- When data or a function plot would help understanding, output a chart in a \`\`\`chart block.

${MEDIA_MARKER_PROMPT}

FEATURE INVOCATION:
To show Word of the Day use [ACTION: show_wotd]
To show Latest News use [ACTION: show_news]

WORK-CHECKING BEHAVIOR:
- Decide whether the user needs a fresh solution, a work check, or both.
- If the user shares their own attempt, notes, or final answer, do NOT ask them to choose a separate mode.
- Start by identifying what is already correct.
- Pinpoint the first meaningful mistake, missing assumption, or unfinished step.
- Continue with the corrected reasoning and tell the user what to do next if they want to keep working independently.
- If the request is clearly homework or coursework, teach the method first. Keep any final answer in the dedicated **Answer:** section only so the UI can hide it by default.

RESPONSE FORMAT:
**Subject:** [subject/domain]
**Question:** [restate the question precisely]
**Work Check:** [only include this when the user shared work to verify]
**Solution:**
[rigorous step-by-step solution with explanations]
**Answer:** [final answer, clearly stated]`;

type SourceIntent = "general" | "scholarly" | "news";

function getEncryptionKey() {
  const secret = process.env.USER_KEY_ENCRYPTION_SECRET?.trim();
  if (!secret) {
    throw new Error("USER_KEY_ENCRYPTION_SECRET is not configured on Convex.");
  }

  return createHash("sha256").update(secret).digest();
}

function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: Buffer.concat([encrypted, authTag]).toString("base64url"),
    iv: iv.toString("base64url"),
    algorithm: ENCRYPTION_ALGORITHM,
    keyVersion: ENCRYPTION_KEY_VERSION,
  };
}

function decryptApiKey(record: {
  encryptedKey: string;
  iv: string;
  algorithm: string;
}) {
  const payload = Buffer.from(record.encryptedKey, "base64url");
  const iv = Buffer.from(record.iv, "base64url");
  const encrypted = payload.subarray(0, payload.length - 16);
  const authTag = payload.subarray(payload.length - 16);
  const decipher = createDecipheriv(record.algorithm, getEncryptionKey(), iv) as ReturnType<
    typeof createDecipheriv
  > & {
    setAuthTag: (buffer: Buffer) => void;
  };
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function getRequestText(input: string | null | undefined) {
  return input?.trim() ?? "";
}

function shouldAutoUsePro(text: string, mode: SolveMode, detailed: boolean) {
  if (mode === "deep" || detailed) {
    return true;
  }

  return text.length > 650 || PRO_COMPLEXITY_HINTS.test(text);
}

function shouldAutoUseGrounding(text: string, mode: SolveMode) {
  if (mode === "research") {
    return true;
  }

  return (
    GROUNDED_QUESTION_HINTS.test(text) ||
    (CURRENT_FACT_HINTS.test(text) &&
      /\b(president|vice president|prime minister|governor|mayor|ceo|chief executive officer|secretary|speaker|pope|king|queen)\b/i.test(
        text,
      ))
  );
}

function buildRequestPlan(mode: SolveMode, text: string, detailed: boolean) {
  const useGrounding = shouldAutoUseGrounding(text, mode);
  const usePro = shouldAutoUsePro(text, mode, detailed) || (useGrounding && text.length > 180);

  return {
    useGrounding,
    modelCandidates: usePro
      ? MODEL_CANDIDATES.pro
      : useGrounding
        ? MODEL_CANDIDATES.grounded
        : MODEL_CANDIDATES.fast,
  };
}

function buildUniversalSystemInstruction(options: {
  subject: string;
  detailed: boolean;
  requestText: string;
  providerSupportsGrounding: boolean;
  includeGroundingWarning: boolean;
}) {
  const { subject, detailed, requestText, providerSupportsGrounding, includeGroundingWarning } = options;
  let prompt = SYSTEM_PROMPT;

  if (subject !== "Auto-detect") {
    prompt += `\n\nThe user has specified the subject is: ${subject}. Tailor your response to this domain's conventions and notation.`;
  }
  if (detailed) {
    prompt += `\n\nProvide an EXTREMELY detailed, step-by-step explanation. Break down every concept and include worked examples when useful.`;
  }
  if (CALCULUS_HINTS.test(requestText)) {
    prompt += `\n\nFor calculus and higher math, verify derivatives, integrals, limits, and extrema carefully before stating the answer.`;
  }
  if (GRAPHING_HINTS.test(requestText)) {
    prompt += `\n\nFor graphing requests, include a chart block when the graph is central to the answer and identify key intercepts, extrema, asymptotes, domain, and range.`;
  }
  if (CURRENT_FACT_HINTS.test(requestText)) {
    prompt += `\n\nFor time-sensitive factual questions, verify the answer using live grounding and include the exact date context.`;
  }
  if (!providerSupportsGrounding && includeGroundingWarning) {
    prompt += `\n\nThis provider does not have live Google grounding in this app.\n- Do not pretend you have live browsing.\n- If the request needs up-to-date headlines or verified current reporting, prefer [ACTION: show_news].\n- If you answer from general knowledge, explicitly state that the answer may be outdated.`;
  }

  return prompt;
}

function buildTutorSystemInstruction(providerSupportsGrounding: boolean) {
  return `You are a helpful tutor answering follow-up questions. Be concise, readable, and directly useful inside a narrow chat panel. If the user asks whether their work is right, verify it directly before expanding. Use LaTeX for math.

IMPORTANT: Always keep the original question in mind when answering follow-ups. Reference specific aspects of the original question and any original image when relevant.

Formatting rules for follow-up replies:
- Start with the direct answer or next step.
- Prefer short paragraphs and flat bullet lists.
- Keep most replies to 3-6 tight bullets or short paragraphs.
- If the follow-up is too vague to answer correctly, ask concise clarification questions instead of guessing.

${MEDIA_MARKER_PROMPT}

${providerSupportsGrounding ? "" : "You do not have live browsing in this mode. If the user asks for current headlines or freshest reporting, use [ACTION: show_news] instead."}`;
}

function getSourceIntent(text: string): SourceIntent {
  if (SCHOLARLY_HINTS.test(text)) {
    return "scholarly";
  }
  if (NEWS_HINTS.test(text)) {
    return "news";
  }
  return "general";
}

function extractDomainFromText(text: string) {
  const match = text.toLowerCase().match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/);
  return match?.[1] ?? "";
}

function isProxyHost(host: string) {
  return PROXY_HOSTS.some((entry) => host.includes(entry));
}

function isHighTrustNewsHost(host: string) {
  return HIGH_TRUST_NEWS_HOSTS.some((entry) => host.includes(entry));
}

function isCuratedNewsHost(host: string) {
  return CURATED_NEWS_HOSTS.some((entry) => host.includes(entry));
}

function isScholarlyHost(host: string) {
  return host.endsWith(".edu") || host.includes(".ac.") || SCHOLARLY_HOST_HINTS.some((entry) => host.includes(entry));
}

function isOfficialHost(host: string) {
  return host.endsWith(".gov") || host.includes(".gov.") || OFFICIAL_ORG_HOSTS.some((entry) => host.includes(entry));
}

function isAdvocacyOrIdeologyHost(host: string) {
  return ADVOCACY_OR_IDEOLOGY_HOSTS.some((entry) => host.includes(entry));
}

function isTertiaryReferenceHost(host: string) {
  return TERTIARY_REFERENCE_HOSTS.some((entry) => host.includes(entry));
}

function normalizeGroundingSource(chunk: NonNullable<GroundingMetadata["groundingChunks"]>[number]) {
  const rawUrl = chunk.web?.uri?.trim() ?? "";
  const rawTitle = chunk.web?.title?.trim() ?? "";

  let host = "";
  try {
    host = rawUrl ? new URL(rawUrl).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }

  const titleDomain = rawTitle ? extractDomainFromText(rawTitle) : "";
  const displayHost = isProxyHost(host) && titleDomain ? titleDomain.replace(/^www\./, "") : host;
  const displayTitle =
    rawTitle && rawTitle.toLowerCase() !== displayHost ? rawTitle : displayHost || rawTitle || rawUrl;

  return { url: rawUrl, title: displayTitle, host: displayHost };
}

function getSourceCategory(host: string) {
  if (isOfficialHost(host)) return "Government / Official";
  if (host.endsWith(".edu") || host.includes(".ac.")) return "University";
  if (SCHOLARLY_HOST_HINTS.some((entry) => host.includes(entry))) return "Journal / Research";
  if (isHighTrustNewsHost(host)) return "Major Newsroom";
  if (isCuratedNewsHost(host)) return "Curated Newsroom";
  if (isTertiaryReferenceHost(host)) return "Reference";
  if (host.includes("org")) return "Reference / Organization";
  return "Reliable Web Source";
}

function getHostScore(host: string, intent: SourceIntent) {
  if (!host || isProxyHost(host)) return 0;
  if (LOW_TRUST_HOSTS.some((entry) => host.includes(entry))) return 0;
  if (isAdvocacyOrIdeologyHost(host)) return intent === "general" ? 1 : 0;
  if (isTertiaryReferenceHost(host)) return intent === "general" ? 2 : 0;
  if (intent === "news" && isHighTrustNewsHost(host)) return 6;
  if (intent === "news" && isCuratedNewsHost(host)) return 5;
  if (intent === "scholarly" && (isScholarlyHost(host) || isOfficialHost(host))) return 6;
  if (isOfficialHost(host)) return 6;
  if (host.endsWith(".edu") || host.includes(".ac.")) return 5;
  if (SCHOLARLY_HOST_HINTS.some((entry) => host.includes(entry))) return 5;
  if (host.includes("org")) return 4;
  if (isHighTrustNewsHost(host) || isCuratedNewsHost(host)) return 3;
  return 2;
}

function extractReliableSources(groundingMetadata?: GroundingMetadata, requestText = ""): SolutionSource[] {
  const intent = getSourceIntent(requestText);
  const chunks = groundingMetadata?.groundingChunks ?? [];
  const deduped = new Map<string, SolutionSource & { score: number }>();

  for (const chunk of chunks) {
    const normalized = normalizeGroundingSource(chunk);
    if (!normalized.url || !normalized.title || !normalized.host) {
      continue;
    }

    const score = getHostScore(normalized.host, intent);
    const existing = deduped.get(normalized.url);
    if (existing && existing.score >= score) {
      continue;
    }

    deduped.set(normalized.url, {
      index: 0,
      title: normalized.title,
      url: normalized.url,
      host: normalized.host,
      category: getSourceCategory(normalized.host),
      score,
    });
  }

  let ranked = [...deduped.values()].sort((left, right) => right.score - left.score);
  if (intent === "scholarly") {
    const scholarlyOnly = ranked.filter((source) => source.score >= 5);
    if (scholarlyOnly.length > 0) ranked = scholarlyOnly;
  }
  if (intent === "news") {
    const newsOnly = ranked.filter(
      (source) => isHighTrustNewsHost(source.host) || source.category === "Government / Official",
    );
    if (newsOnly.length > 0) ranked = newsOnly;
  }
  const reliableOnly = ranked.filter((source) => source.score >= 4);
  if (reliableOnly.length > 0) ranked = reliableOnly;

  return ranked.slice(0, 4).map((source, index) => ({
    index: index + 1,
    title: source.title,
    url: source.url,
    host: source.host,
    category: source.category,
  }));
}

function stripTrailingSourcesSection(text: string) {
  return text
    .replace(/\n{0,2}(?:#{1,6}\s*)?Sources\s*:?\s*(?:\n(?:[-*]|\d+\.)[^\n]+)+\s*$/i, "")
    .replace(/\n{0,2}(?:#{1,6}\s*)?Sources\s*:?\s*(?:\nhttps?:\/\/[^\n]+)+\s*$/i, "")
    .trim();
}

function finalizeGeminiResponse(response: GenerateContentResponse, requestText: string) {
  const body = stripTrailingSourcesSection(response.text ?? "");
  const sources = extractReliableSources(response.candidates?.[0]?.groundingMetadata, requestText);
  return embedSourcesInSolution(body, sources);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isModelAvailabilityIssue(message: string) {
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("Unknown model") ||
    message.includes("not available")
  );
}

function isRateLimitIssue(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("too many requests")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateGeminiWithFallback(
  apiKey: string,
  modelCandidates: Array<string | undefined>,
  params: Omit<GenerateContentParameters, "model">,
) {
  const tried = new Set<string>();
  let lastError: unknown;

  for (const candidate of modelCandidates) {
    if (!candidate || tried.has(candidate)) {
      continue;
    }

    tried.add(candidate);
    for (let attempt = 0; attempt < MAX_RATE_LIMIT_ATTEMPTS_PER_MODEL; attempt += 1) {
      try {
        const client = new GoogleGenAI({ apiKey });
        return await client.models.generateContent({ ...params, model: candidate });
      } catch (error) {
        lastError = error;
        const message = getErrorMessage(error);

        if (isModelAvailabilityIssue(message)) {
          break;
        }
        if (isRateLimitIssue(message)) {
          if (attempt < MAX_RATE_LIMIT_ATTEMPTS_PER_MODEL - 1) {
            await wait(RATE_LIMIT_BACKOFF_MS * (attempt + 1));
            continue;
          }
          break;
        }
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No usable Gemini model was available.");
}

function getGeminiCandidates(
  settings: UserPreferencesSnapshot,
  mode: SolveMode,
  useGrounding: boolean,
  detailed: boolean,
  text: string,
) {
  const models = settings.providers?.gemini?.models ?? {};
  const usePro = shouldAutoUsePro(text, mode, detailed) || (useGrounding && text.length > 180);
  if (usePro) {
    return [models.deepModel, ...MODEL_CANDIDATES.pro];
  }
  if (useGrounding) {
    return [models.groundedModel, ...MODEL_CANDIDATES.grounded];
  }
  return [models.fastModel, ...MODEL_CANDIDATES.fast];
}

function buildGeminiConfig(mode: SolveMode, subject: string, detailed: boolean, requestText: string) {
  const config: Record<string, unknown> = {
    systemInstruction: buildUniversalSystemInstruction({
      subject,
      detailed,
      requestText,
      providerSupportsGrounding: true,
      includeGroundingWarning: false,
    }),
  };

  if (mode === "deep") {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  return config;
}

interface OpenRouterModelSummary {
  id: string;
  supportsImages: boolean;
  free: boolean;
}

interface OpenRouterModelResponse {
  data?: Array<{
    id?: string;
    architecture?: {
      input_modalities?: string[];
    };
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

function isFreeModelId(modelId: string) {
  return modelId.endsWith(":free");
}

async function fetchOpenRouterModels() {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Unable to load OpenRouter models (${response.status}).`);
  }

  const payload = (await response.json()) as OpenRouterModelResponse;
  return (payload.data ?? [])
    .map((model): OpenRouterModelSummary | null => {
      if (!model.id) {
        return null;
      }

      const inputModalities = model.architecture?.input_modalities ?? ["text"];
      return {
        id: model.id,
        supportsImages: inputModalities.includes("image"),
        free:
          isFreeModelId(model.id) ||
          (model.pricing?.prompt === "0" && model.pricing?.completion === "0"),
      };
    })
    .filter((model): model is OpenRouterModelSummary => Boolean(model));
}

function chooseOpenRouterModel(
  models: OpenRouterModelSummary[],
  preferredModel: string | undefined,
  mode: "fast" | "deep",
) {
  if (preferredModel && models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }

  for (const candidate of OPENROUTER_RECOMMENDATIONS[mode]) {
    if (models.some((model) => model.id === candidate)) {
      return candidate;
    }
  }

  return models[0]?.id ?? "";
}

function getProviderBaseUrl(settings: UserPreferencesSnapshot, provider: ProviderId) {
  const configured = settings.providers?.[provider]?.baseUrl?.trim();
  return configured || providerDescriptors[provider].defaultBaseUrl || "";
}

function getConfiguredModel(
  settings: UserPreferencesSnapshot,
  provider: ProviderId,
  mode: "fast" | "deep",
) {
  const models = settings.providers?.[provider]?.models ?? {};
  return (
    (mode === "deep" ? models.deepModel : models.fastModel) ||
    (mode === "deep"
      ? providerDescriptors[provider].defaultModels.deepModel
      : providerDescriptors[provider].defaultModels.fastModel) ||
    ""
  );
}

function getOpenRouterFreeOnly(settings: UserPreferencesSnapshot) {
  return Boolean(settings.providers?.openrouter?.options?.freeOnly);
}

interface OpenAICompatibleServerResponse {
  error?: { message?: string };
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function normalizeOpenAICompatibleContent(
  value: OpenAICompatibleServerResponse["choices"],
) {
  const content = value?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((part) => (part.type === "text" ? part.text ?? "" : "")).join("").trim();
  }
  return "";
}

async function postOpenAICompatibleCompletion(options: {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };

  if (options.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://mike-net.top";
    headers["X-Title"] = "Mike Answers";
  }

  const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAICompatibleServerResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `${options.provider} request failed (${response.status})`);
  }

  const text = normalizeOpenAICompatibleContent(payload.choices);
  if (!text) {
    throw new Error(`${options.provider} returned an empty response.`);
  }

  return text;
}

async function solveTextWithOpenAICompatible(options: {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  text: string;
  mode: "fast" | "deep";
  subject: string;
  detailed: boolean;
}) {
  const requestPlan = buildRequestPlan(options.mode, options.text, options.detailed);
  const looksLikeHomework = isLikelyHomeworkRequest(options.text, { subject: options.subject });
  const shouldClarify = shouldAskClarifyingQuestions(options.text);

  return postOpenAICompatibleCompletion({
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    body: {
      model: options.model,
      temperature: options.mode === "deep" ? 0.2 : 0.45,
      messages: [
        {
          role: "system",
          content: buildUniversalSystemInstruction({
            subject: options.subject,
            detailed: options.detailed,
            requestText: options.text,
            providerSupportsGrounding: false,
            includeGroundingWarning: requestPlan.useGrounding,
          }),
        },
        {
          role: "user",
          content: `User request:\n\n${options.text}\n\nIf the user pasted their own attempt, notes, or answer, proactively check that work first and then continue tutoring. If it is just a question, solve it directly.\n\n${looksLikeHomework ? "This looks like student coursework. Teach the underlying method first and keep the final answer confined to the **Answer:** section only." : ""}\n${shouldClarify ? "This may be too vague for a correct answer. If key details are missing, ask up to 3 concise clarification questions and stop there." : ""}`,
        },
      ],
    },
  });
}

async function chatWithOpenAICompatible(options: {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  history: Array<{ role: string; text: string }>;
  message: string;
  originalQuestion?: { text?: string; imageBase64?: string };
}) {
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: buildTutorSystemInstruction(false) },
  ];

  if (options.originalQuestion?.text || options.originalQuestion?.imageBase64) {
    const content: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [];
    if (options.originalQuestion.imageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${options.originalQuestion.imageBase64}` },
      });
    }
    if (options.originalQuestion.text) {
      content.push({ type: "text", text: `The user originally asked: ${options.originalQuestion.text}` });
    }
    messages.push({ role: "user", content });
    messages.push({ role: "assistant", content: "Understood. I will keep the original question context in mind." });
  }

  for (const item of options.history) {
    messages.push({
      role: item.role === "user" ? "user" : "assistant",
      content: item.text,
    });
  }

  messages.push({ role: "user", content: options.message });

  return postOpenAICompatibleCompletion({
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    body: {
      model: options.model,
      temperature: 0.35,
      messages,
    },
  });
}

async function callMiniMaxAdvancedBridge(options: {
  apiKey: string;
  imageBase64: string;
  subject: string;
  mode: "fast" | "deep";
  detailed: boolean;
}) {
  const bridgeUrl = process.env[MINIMAX_ADVANCED_BRIDGE_ENV]?.trim();
  if (!bridgeUrl) {
    throw new Error(`MiniMax advanced image understanding requires ${MINIMAX_ADVANCED_BRIDGE_ENV} on Convex.`);
  }

  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env[MINIMAX_ADVANCED_BRIDGE_TOKEN_ENV]
        ? {
            Authorization: `Bearer ${process.env[MINIMAX_ADVANCED_BRIDGE_TOKEN_ENV]}`,
          }
        : {}),
    },
    body: JSON.stringify({
      apiKey: options.apiKey,
      imageBase64: options.imageBase64,
      mode: options.mode,
      subject: options.subject,
      detailed: options.detailed,
      prompt: `Analyze the uploaded image carefully. It may contain a question, a partial attempt, completed student work, or both.\n\nIf the image includes the user's work, proactively check it before giving the final answer:\n- say what is correct,\n- identify the first mistake or missing step,\n- continue from the last correct idea,\n- and then provide the corrected solution.\n\nIf the image is only the question prompt, solve it directly. Assume this may be coursework. Teach the method first and keep any final numeric/result statement isolated in the **Answer:** section only.\n\nIf the image is too ambiguous to answer correctly, ask concise clarification questions instead of guessing.`,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
    model?: string;
  };

  if (!response.ok || !payload.text) {
    throw new Error(payload.error ?? `MiniMax advanced bridge failed (${response.status}).`);
  }

  return {
    text: payload.text,
    model: payload.model,
  };
}

async function loadStoredProviderKey(
  ctx: any,
  provider: ProviderId,
) {
  await requireClerkIdentity(ctx);
  const record = await ctx.runQuery(keyMaterialRef, { provider });
  if (!record) {
    throw new Error(`No secure ${provider} key is stored for this account.`);
  }

  return decryptApiKey(record);
}

export const storeProviderKey = actionGeneric({
  args: {
    provider: providerValidator,
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireClerkIdentity(ctx);
    const trimmed = args.apiKey.trim();
    if (!trimmed) {
      throw new Error("API key must not be empty.");
    }

    const encrypted = encryptApiKey(trimmed);
    await ctx.runMutation(storeKeyRef, {
      provider: args.provider,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      algorithm: encrypted.algorithm,
      keyVersion: encrypted.keyVersion,
    });

    return { ok: true };
  },
});

export const deleteProviderKey = actionGeneric({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    await requireClerkIdentity(ctx);
    await ctx.runMutation(deleteKeyRef, { provider: args.provider });
    return { ok: true };
  },
});

export const solveText = actionGeneric({
  args: {
    provider: providerValidator,
    text: v.string(),
    mode: v.union(v.literal("fast"), v.literal("deep")),
    subject: v.string(),
    detailed: v.boolean(),
    settings: runtimeSettingsValidator,
  },
  handler: async (ctx, args) => {
    const apiKey = await loadStoredProviderKey(ctx, args.provider);

    if (args.provider === "openrouter") {
      const allModels = await fetchOpenRouterModels();
      const models = getOpenRouterFreeOnly(args.settings)
        ? allModels.filter((model) => model.free)
        : allModels;
      const model = chooseOpenRouterModel(
        models,
        args.mode === "deep"
          ? args.settings.providers?.openrouter?.models?.deepModel
          : args.settings.providers?.openrouter?.models?.fastModel,
        args.mode,
      );

      const text = await solveTextWithOpenAICompatible({
        provider: args.provider,
        apiKey,
        baseUrl: OPENROUTER_BASE_URL,
        model,
        text: args.text,
        mode: args.mode,
        subject: args.subject,
        detailed: args.detailed,
      });

      return { text, provider: "openrouter" as const, model };
    }

    if (args.provider === "minimax" || args.provider === "custom_openai") {
      const baseUrl = getProviderBaseUrl(args.settings, args.provider);
      if (!baseUrl) {
        throw new Error(`Add a base URL for ${getProviderDescriptor(args.provider).label} before using the secure backend.`);
      }

      const model = getConfiguredModel(args.settings, args.provider, args.mode);
      if (!model) {
        throw new Error(`Choose a ${args.mode} model for ${getProviderDescriptor(args.provider).label} before using it.`);
      }

      const text = await solveTextWithOpenAICompatible({
        provider: args.provider,
        apiKey,
        baseUrl,
        model,
        text: args.text,
        mode: args.mode,
        subject: args.subject,
        detailed: args.detailed,
      });

      return { text, provider: args.provider, model };
    }

    const requestText = getRequestText(args.text);
    const plan = buildRequestPlan(args.mode, requestText, args.detailed);
    const response = await generateGeminiWithFallback(
      apiKey,
      getGeminiCandidates(args.settings, args.mode, plan.useGrounding, args.detailed, requestText),
      {
        contents: [
          `User request:\n\n${args.text}\n\nIf the user pasted their own attempt, notes, or answer, proactively check that work first and then continue tutoring. If it is just a question, solve it directly.\n\n${isLikelyHomeworkRequest(requestText, { subject: args.subject }) ? "This looks like student coursework. Teach the underlying method first and keep the final answer confined to the **Answer:** section only." : ""}\n${shouldAskClarifyingQuestions(requestText) ? "This may be too vague for a correct answer. If key details are missing, ask up to 3 concise clarification questions and stop there." : ""}`,
        ],
        config: {
          ...buildGeminiConfig(args.mode, args.subject, args.detailed, requestText),
          ...(plan.useGrounding ? { tools: [{ googleSearch: {} }] } : {}),
        },
      },
    );

    return {
      text: finalizeGeminiResponse(response, requestText),
      provider: "gemini" as const,
      model: getGeminiCandidates(args.settings, args.mode, plan.useGrounding, args.detailed, requestText)[0],
    };
  },
});

export const solveImage = actionGeneric({
  args: {
    provider: providerValidator,
    base64Image: v.string(),
    mode: v.union(v.literal("fast"), v.literal("deep")),
    subject: v.string(),
    detailed: v.boolean(),
    settings: runtimeSettingsValidator,
  },
  handler: async (ctx, args) => {
    const apiKey = await loadStoredProviderKey(ctx, args.provider);

    if (args.provider === "openrouter") {
      const allModels = await fetchOpenRouterModels();
      const models = getOpenRouterFreeOnly(args.settings)
        ? allModels.filter((model) => model.free)
        : allModels;
      const model = chooseOpenRouterModel(
        models,
        args.mode === "deep"
          ? args.settings.providers?.openrouter?.models?.deepModel
          : args.settings.providers?.openrouter?.models?.fastModel,
        args.mode,
      );
      const selectedModel = models.find((entry) => entry.id === model);
      if (!selectedModel?.supportsImages) {
        throw new Error("The selected OpenRouter model is text-only. Choose an image-capable OpenRouter model.");
      }

      const text = await postOpenAICompatibleCompletion({
        provider: "openrouter",
        apiKey,
        baseUrl: OPENROUTER_BASE_URL,
        body: {
          model,
          temperature: args.mode === "deep" ? 0.2 : 0.45,
          messages: [
            {
              role: "system",
              content: buildUniversalSystemInstruction({
                subject: args.subject,
                detailed: args.detailed,
                requestText: args.subject === "Auto-detect" ? "" : `Subject: ${args.subject}`,
                providerSupportsGrounding: false,
                includeGroundingWarning: false,
              }),
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${args.base64Image}`,
                  },
                },
                {
                  type: "text",
                  text: `Analyze the uploaded image carefully. It may contain a question, a partial attempt, completed student work, or both.\n\nIf the image includes the user's work, proactively check it before giving the final answer: say what is correct, identify the first mistake or missing step, continue from the last correct idea, and then provide the corrected solution.\n\nIf the image is only the question prompt, solve it directly. Assume this may be coursework. Teach the method first and keep any final numeric/result statement isolated in the **Answer:** section only.\n\nIf the image is too ambiguous to answer correctly, ask concise clarification questions instead of guessing.`,
                },
              ],
            },
          ],
        },
      });

      return { text, provider: "openrouter" as const, model };
    }

    if (args.provider === "minimax") {
      const result = await callMiniMaxAdvancedBridge({
        apiKey,
        imageBase64: args.base64Image,
        subject: args.subject,
        mode: args.mode,
        detailed: args.detailed,
      });

      return {
        text: result.text,
        provider: "minimax" as const,
        model: result.model ?? getConfiguredModel(args.settings, "minimax", args.mode),
      };
    }

    if (args.provider === "custom_openai") {
      throw new Error("Custom OpenAI-compatible secure image solving is not enabled. Use Gemini, OpenRouter, or MiniMax advanced image understanding.");
    }

    const requestText = getRequestText(args.subject === "Auto-detect" ? "" : `Subject: ${args.subject}`);
    const plan = buildRequestPlan(args.mode, requestText, args.detailed);
    const response = await generateGeminiWithFallback(
      apiKey,
      getGeminiCandidates(args.settings, args.mode, plan.useGrounding || args.subject === "Auto-detect", args.detailed, requestText),
      {
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: args.base64Image } },
          `Analyze the uploaded image carefully. It may contain a question, a partial attempt, completed student work, or both.\n\nIf the image includes the user's work, proactively check it before giving the final answer:\n- say what is correct,\n- identify the first mistake or missing step,\n- continue from the last correct idea,\n- and then provide the corrected solution.\n\nIf the image is only the question prompt, solve it directly. Assume this may be coursework. Teach the method first and keep any final numeric/result statement isolated in the **Answer:** section only.\n\nIf the image is too ambiguous to answer correctly, ask concise clarification questions instead of guessing.`,
        ],
        config: {
          ...buildGeminiConfig(args.mode, args.subject, args.detailed, requestText),
          ...(plan.useGrounding || args.subject === "Auto-detect" ? { tools: [{ googleSearch: {} }] } : {}),
        },
      },
    );

    return {
      text: finalizeGeminiResponse(response, requestText),
      provider: "gemini" as const,
      model: getGeminiCandidates(args.settings, args.mode, plan.useGrounding || args.subject === "Auto-detect", args.detailed, requestText)[0],
    };
  },
});

export const chatWithTutor = actionGeneric({
  args: {
    provider: providerValidator,
    history: v.array(v.object({ role: v.string(), text: v.string() })),
    message: v.string(),
    originalQuestion: v.optional(
      v.object({
        text: v.optional(v.string()),
        imageBase64: v.optional(v.string()),
      }),
    ),
    settings: runtimeSettingsValidator,
  },
  handler: async (ctx, args) => {
    const apiKey = await loadStoredProviderKey(ctx, args.provider);
    if (!args.message.trim()) {
      throw new Error("Message must not be empty.");
    }

    if (args.provider === "openrouter") {
      const allModels = await fetchOpenRouterModels();
      const models = getOpenRouterFreeOnly(args.settings)
        ? allModels.filter((model) => model.free)
        : allModels;
      const model = chooseOpenRouterModel(
        models,
        args.settings.providers?.openrouter?.models?.deepModel,
        "deep",
      );

      return await chatWithOpenAICompatible({
        provider: "openrouter",
        apiKey,
        baseUrl: OPENROUTER_BASE_URL,
        model,
        history: args.history,
        message: args.message,
        originalQuestion: args.originalQuestion,
      });
    }

    if (args.provider === "minimax" || args.provider === "custom_openai") {
      const baseUrl = getProviderBaseUrl(args.settings, args.provider);
      if (!baseUrl) {
        throw new Error(`Add a base URL for ${getProviderDescriptor(args.provider).label} before using secure chat.`);
      }

      const model = getConfiguredModel(args.settings, args.provider, "deep");
      if (!model) {
        throw new Error(`Choose a deep model for ${getProviderDescriptor(args.provider).label} before using it.`);
      }

      return await chatWithOpenAICompatible({
        provider: args.provider,
        apiKey,
        baseUrl,
        model,
        history: args.history,
        message: args.message,
        originalQuestion: args.originalQuestion,
      });
    }

    const contents: Array<{ role: "user" | "model"; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> = [];
    const originalParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (args.originalQuestion?.imageBase64) {
      originalParts.push({
        inlineData: { mimeType: "image/jpeg", data: args.originalQuestion.imageBase64 },
      });
    }
    if (args.originalQuestion?.text) {
      originalParts.push({ text: `The user originally asked: ${args.originalQuestion.text}` });
    } else if (originalParts.length > 0) {
      originalParts.push({ text: "The image above shows the user's original question." });
    }

    let prefixedHistory = args.history;
    if (originalParts.length > 0) {
      if (args.history[0]?.role === "user") {
        const [firstTurn, ...rest] = args.history;
        contents.push({
          role: "user",
          parts: [...originalParts, { text: firstTurn.text }],
        });
        prefixedHistory = rest;
      } else {
        contents.push({
          role: "user",
          parts: [
            ...originalParts,
            { text: args.originalQuestion?.text ? `Original question: ${args.originalQuestion.text}` : "Use the original question context above in your answer." },
          ],
        });
        contents.push({
          role: "model",
          parts: [{ text: "Understood. I will use the original question context in the follow-up reply." }],
        });
      }
    }

    for (const item of prefixedHistory) {
      contents.push({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      });
    }

    contents.push({ role: "user", parts: [{ text: args.message }] });

    const plan = buildRequestPlan("fast", args.message, false);
    const response = await generateGeminiWithFallback(
      apiKey,
      getGeminiCandidates(args.settings, "fast", plan.useGrounding, false, args.message),
      {
        contents,
        config: {
          systemInstruction: buildTutorSystemInstruction(true),
          ...(plan.useGrounding ? { tools: [{ googleSearch: {} }] } : {}),
        },
      },
    );

    return finalizeGeminiResponse(response, args.message);
  },
});

export const transcribeAudio = actionGeneric({
  args: {
    provider: providerValidator,
    audioBase64: v.string(),
    mimeType: v.string(),
    settings: runtimeSettingsValidator,
  },
  handler: async (ctx, args) => {
    if (args.provider !== "gemini") {
      throw new Error("Audio transcription is only available with Gemini.");
    }

    const apiKey = await loadStoredProviderKey(ctx, "gemini");
    const response = await generateGeminiWithFallback(
      apiKey,
      getGeminiCandidates(args.settings, "fast", false, false, "transcribe audio"),
      {
        contents: [
          {
            inlineData: {
              mimeType: args.mimeType,
              data: args.audioBase64,
            },
          },
          `Transcribe the spoken audio into clean plain text.

Rules:
- Return only the transcript text.
- Keep the wording faithful to the speaker.
- Fix obvious punctuation and capitalization.
- Do not add commentary, labels, or quotes.
- If the audio is unclear, transcribe the intelligible parts only.`,
        ],
        config: {
          systemInstruction:
            "You are a precise transcription assistant. Return only the user's transcript with clean punctuation.",
        },
      },
    );

    return (response.text ?? "").trim();
  },
});

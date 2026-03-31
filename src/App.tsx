import React, { Suspense, lazy, type ReactNode, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { BookOpen, BrainCircuit, ChevronDown, Download, Newspaper, ShieldCheck, Zap } from "lucide-react";

import type {
  AppState,
  SolveMode,
  ChatMessage,
  HistoryItem,
  BackgroundTask,
  SavedState,
  AuthWorkspaceState,
  HistoryController,
  SecureBackendController,
  UserPreferencesSnapshot,
} from "./types";
import { useDarkMode } from "./hooks/useDarkMode";
import { useHistory } from "./hooks/useHistory";
import { useFilePreview } from "./hooks/useFilePreview";
import { useAISettings } from "./hooks/useAISettings";
import { useProviderCatalog } from "./hooks/useProviderCatalog";
import { resizeImage } from "./utils/image";
import { stripSolutionClientArtifacts } from "./utils/solution";
import { isLikelyHomeworkRequest } from "./utils/request";
import {
  chatWithTutorWithProvider,
  isRuntimeProviderReady,
  solveImageQuestionWithProvider,
  solveTextQuestionWithProvider,
  transcribeAudioWithProvider,
} from "./services/ai";
import { getMikeEmblemAsset, getMikeHeroAsset } from "./services/assets";
import { describeEvidencePlan, formatEvidencePills } from "./services/evidencePlan";
import { deriveNewsQuery } from "./services/news";
import { isStandalonePwa, registerInstallPrompt, type InstallPromptEvent } from "./services/pwa";
import { buildEvidencePlan } from "./services/requestRouter";
import { getProviderDescriptor, getProviderLabel } from "./services/providers/registry";

import { Header } from "./components/Header";
import { Dropzone } from "./components/Dropzone";
import { InputPreview } from "./components/InputPreview";
import { ActionBar } from "./components/ActionBar";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { SetupGuide } from "./components/SetupGuide";

const SolutionDisplay = lazy(async () => ({
  default: (await import("./components/SolutionDisplay")).SolutionDisplay,
}));
const ChatPanel = lazy(async () => ({
  default: (await import("./components/ChatPanel")).ChatPanel,
}));
const HistorySidebar = lazy(async () => ({
  default: (await import("./components/HistorySidebar")).HistorySidebar,
}));
const WordOfTheDay = lazy(async () => ({
  default: (await import("./components/WordOfTheDay")).WordOfTheDay,
}));
const NewsView = lazy(async () => ({
  default: (await import("./components/NewsView")).NewsView,
}));

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_SOLVE_MODE: Exclude<SolveMode, "research"> = "fast";

interface SolveRequest {
  mode: Exclude<SolveMode, "research">;
  detailed?: boolean;
  nextImageFile?: File | null;
  nextTextInput?: string | null;
}

function parseAIActions(text: string): { cleanText: string; actions: string[] } {
  const actions: string[] = [];
  let cleanText = text;

  const actionRegex = /\[ACTION:\s*(\w+)\]/g;
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push(match[1]);
    cleanText = cleanText.replace(match[0], "");
  }

  return { cleanText: cleanText.trim(), actions };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (isEditableTarget(target) ||
      Boolean(target.closest("button, a, label, summary, [role='button'], select")))
  );
}

function isWordOfTheDayRequest(value: string) {
  return /\b(word of the day|daily word)\b/i.test(value);
}

function isNewsRequest(value: string) {
  return /\b(news|headlines|current events|latest on|latest about|what happened|what's happening|updates? on)\b/i.test(value);
}

function buildFollowUpStarters(solution: string, hideAnswerByDefault: boolean) {
  const starters = [
    hideAnswerByDefault ? "Check my next step before revealing the final answer." : "Explain why this works in simpler words.",
    "Show me the single next step I should do on my own.",
    "Check this approach for mistakes before I continue.",
    "Give me one mistake to avoid on a problem like this.",
  ];

  if (solution.includes("[VIDEO_SEARCH:")) {
    starters.unshift(
      "Tell me exactly what to watch for in the suggested video.",
      "Summarize the recommended video in 5 useful bullets.",
    );
    starters.push("Compare the video method with the written explanation above.");
  }

  if (solution.includes("[IMAGE_SEARCH:")) {
    starters.push("Explain what the image or diagram is supposed to show.");
  }

  if (solution.includes("```chart")) {
    starters.push("Explain what the chart means without jargon.");
  }

  if (solution.includes("[IMAGE_SEARCH:") || solution.includes("diagram")) {
    starters.push("Explain what part of the diagram I should focus on first.");
  }

  return [...new Set(starters)].slice(0, 4);
}

function formatModelLabel(model: string | undefined, fallback: string) {
  const value = model?.trim() || fallback;
  return value.length > 28 ? `${value.slice(0, 25)}...` : value;
}

interface AppProps {
  authState?: AuthWorkspaceState;
  accountControls?: ReactNode;
  externalHistory?: HistoryController;
  remotePreferences?: UserPreferencesSnapshot | null;
  secureBackend?: SecureBackendController;
  onPreferencesChange?: (snapshot: UserPreferencesSnapshot) => void | Promise<void>;
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export default function App({
  authState,
  accountControls,
  externalHistory,
  remotePreferences,
  secureBackend,
  onPreferencesChange,
}: AppProps) {
  // ── Core application state ──────────────────────────────────────────
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<Exclude<SolveMode, "research">>(DEFAULT_SOLVE_MODE);

  // ── Input state ─────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState<string | null>(null);
  const [subject, setSubject] = useState("Auto-detect");
  const imagePreviewUrl = useFilePreview(imageFile);
  const [showSetup, setShowSetup] = useState(false);

  // ── Solution state ───────────────────────────────────────────────────
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionHideAnswerDefault, setSolutionHideAnswerDefault] = useState(false);

  // ── Chat state ──────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ── Sidebar state ───────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [standalonePwa, setStandalonePwa] = useState(() => isStandalonePwa());
  const idleDraftBufferRef = useRef("");
  const idleDraftCaptureTimeoutRef = useRef<number | null>(null);

  // ── Original question context for follow-up chat ────────────────────
  const originalQuestionRef = useRef<{ text?: string; imageBase64?: string } | null>(null);

  // ── Feature toggle state ─────────────────────────────────────────────
  const [newsQuery, setNewsQuery] = useState("");

  // ── Background task state ───────────────────────────────────────────
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [savedState, setSavedState] = useState<SavedState | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  // ── Hooks ───────────────────────────────────────────────────────────
  const [darkMode, toggleDarkMode] = useDarkMode();
  const localHistory = useHistory();
  const history = externalHistory ?? localHistory;
  const appStateRef = useRef<AppState>("IDLE");
  const { settings, updateSettings, updateProviderSettings, resetSettings } = useAISettings({
    remoteSnapshot: remotePreferences,
    onPreferencesChange,
  });
  const selectedProviderId = settings.selectedProviderId;
  const selectedProvider = getProviderDescriptor(selectedProviderId);
  const secureProviderReady = Boolean(secureBackend?.keyStatus[selectedProviderId]);
  const runtimeProviderReady = secureProviderReady || isRuntimeProviderReady(settings);
  const providerCatalog = useProviderCatalog(settings);
  const selectedProviderConfig = settings.providers[selectedProviderId];

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    setStandalonePwa(isStandalonePwa());
    const unregisterPrompt = registerInstallPrompt((event) => {
      setInstallPromptEvent(event);
    });
    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setStandalonePwa(true);
    };

    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      unregisterPrompt();
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (settings.preferredSubject && subject === "Auto-detect") {
      setSubject(settings.preferredSubject);
    }
  }, [settings.preferredSubject, subject]);

  useEffect(() => {
    if (subject === settings.preferredSubject) {
      return;
    }

    updateSettings({ preferredSubject: subject });
  }, [settings.preferredSubject, subject, updateSettings]);

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Resets everything back to the initial idle screen. */
  const resetAll = useCallback(() => {
    idleDraftBufferRef.current = "";
    if (idleDraftCaptureTimeoutRef.current !== null) {
      window.clearTimeout(idleDraftCaptureTimeoutRef.current);
      idleDraftCaptureTimeoutRef.current = null;
    }
    originalQuestionRef.current = null;
    setAppState("IDLE");
    setImageFile(null);
    setTextInput(null);
    setSolution(null);
    setSolutionHideAnswerDefault(false);
    setErrorMsg(null);
    setChatHistory([]);
    setNewsQuery("");
    setSavedState(null);
    setIsReturning(false);
  }, []);

  // ── Feature handlers ────────────────────────────────────────────────

  const handleOpenNews = useCallback((query?: string) => {
    if (solution && appState === "SOLVED") {
      setSavedState({
        solution,
        hideAnswerByDefault: solutionHideAnswerDefault,
        chatHistory,
        mode: lastMode,
        subject,
        input: { imageFile: imageFile ?? undefined, textInput: textInput ?? undefined },
      });
      setIsReturning(true);
    }
    setNewsQuery(query || "");
    setAppState("NEWS");
  }, [solution, solutionHideAnswerDefault, chatHistory, lastMode, subject, imageFile, textInput, appState]);

  const handleOpenWotd = useCallback(() => {
    if (solution && appState === "SOLVED") {
      setSavedState({
        solution,
        hideAnswerByDefault: solutionHideAnswerDefault,
        chatHistory,
        mode: lastMode,
        subject,
        input: { imageFile: imageFile ?? undefined, textInput: textInput ?? undefined },
      });
      setIsReturning(true);
    }
    setAppState("WOTD");
  }, [solution, solutionHideAnswerDefault, chatHistory, lastMode, subject, imageFile, textInput, appState]);

  const handleReturnToPrevious = useCallback(() => {
    if (savedState) {
      setSolution(savedState.solution);
      setSolutionHideAnswerDefault(savedState.hideAnswerByDefault ?? false);
      setChatHistory(savedState.chatHistory);
      setLastMode(savedState.mode);
      setSubject(savedState.subject);
      setImageFile(savedState.input.imageFile ?? null);
      setTextInput(savedState.input.textInput ?? null);
      setAppState("SOLVED");
      setSavedState(null);
      setIsReturning(false);
      return;
    }

    const completedTask = backgroundTasks.find((t) => t.status === "completed" && t.type === "solve");
    if (completedTask && completedTask.solution) {
      setSolution(completedTask.solution);
      setSolutionHideAnswerDefault(completedTask.hideAnswerByDefault ?? false);
      setChatHistory([]);
      setLastMode(completedTask.mode);
      setSubject(completedTask.input.subject);
      setImageFile(completedTask.input.imageFile ?? null);
      setTextInput(completedTask.input.textInput ?? null);
      setAppState("SOLVED");
      setBackgroundTasks((prev) => prev.filter((t) => t.id !== completedTask.id));
      setIsReturning(false);
    }
  }, [savedState, backgroundTasks]);

  // ── Input handlers ──────────────────────────────────────────────────

  const handleImageSelected = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg("Image is too large (max 10 MB). Try a cropped screenshot.");
      setAppState("ERROR");
      return;
    }
    setImageFile(file);
    setTextInput(null);
    setAppState("PREVIEWING");
    setErrorMsg(null);
  }, []);

  const handleTextPasted = useCallback((text: string) => {
    setTextInput(text);
    setImageFile(null);
    setAppState("PREVIEWING");
    setErrorMsg(null);
  }, []);

  // ── Solve / Grade handlers ──────────────────────────────────────────

  const currentTaskIdRef = useRef<string | null>(null);

  const runSolve = useCallback(
    async ({
      mode,
      detailed = false,
      nextImageFile = imageFile,
      nextTextInput = textInput,
    }: SolveRequest) => {
      if (!runtimeProviderReady) {
        setShowSetup(true);
        setErrorMsg("Complete provider setup before asking a question.");
        setAppState("ERROR");
        return;
      }

      const trimmedText = nextTextInput?.trim() ?? null;
      const taskId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      currentTaskIdRef.current = taskId;
      const nextHideAnswerByDefault = isLikelyHomeworkRequest(trimmedText, {
        hasImage: Boolean(nextImageFile),
        subject,
      });

      if (nextImageFile) {
        setImageFile(nextImageFile);
        setTextInput(null);
      } else if (trimmedText) {
        setTextInput(trimmedText);
        setImageFile(null);
      }

      setAppState("LOADING");
      setErrorMsg(null);
      setSolution(null);
      setChatHistory([]);
      setLastMode(mode);

      try {
        let result: string;
        let resolvedModel: string | undefined;
        let resolvedProvider = selectedProviderId;
        let originalImageBase64: string | undefined;

        if (nextImageFile) {
          originalImageBase64 = await resizeImage(nextImageFile);
          const canUseSecureImageSolve =
            Boolean(secureBackend?.keyStatus[selectedProviderId]) &&
            (
              selectedProvider.capabilities.supportsImageInputInBrowser ||
              Boolean(selectedProviderConfig.options?.useSecureBackendForAdvanced)
            );
          const response =
            secureBackend && canUseSecureImageSolve
              ? await secureBackend.solveImage({
                  provider: selectedProviderId,
                  base64Image: originalImageBase64,
                  mode,
                  subject,
                  detailed,
                  settings,
                })
              : await solveImageQuestionWithProvider(
                  originalImageBase64,
                  mode,
                  subject,
                  detailed,
                  settings,
                );
          result = response.text;
          resolvedModel = response.model;
          resolvedProvider = response.provider;
        } else if (trimmedText) {
          if (isWordOfTheDayRequest(trimmedText)) {
            setAppState("WOTD");
            return;
          }

          if (isNewsRequest(trimmedText)) {
            setNewsQuery(deriveNewsQuery(trimmedText));
            setAppState("NEWS");
            return;
          }

          const response =
            secureBackend && secureBackend.keyStatus[selectedProviderId]
              ? await secureBackend.solveText({
                  provider: selectedProviderId,
                  text: trimmedText,
                  mode,
                  subject,
                  detailed,
                  settings,
                })
              : await solveTextQuestionWithProvider(
                  trimmedText,
                  mode,
                  subject,
                  detailed,
                  settings,
                );
          result = response.text;
          resolvedModel = response.model;
          resolvedProvider = response.provider;
        } else {
          throw new Error("No input provided.");
        }

        originalQuestionRef.current = {
          text: trimmedText ?? undefined,
          imageBase64: originalImageBase64,
        };

        if (currentTaskIdRef.current !== taskId) {
          return;
        }

        const { cleanText, actions } = parseAIActions(result);

        if (actions.includes("show_wotd")) {
          if (solution && appStateRef.current === "SOLVED") {
            setSavedState({
              solution,
              hideAnswerByDefault: solutionHideAnswerDefault,
              chatHistory,
              mode: lastMode,
              subject,
              input: { imageFile: imageFile ?? undefined, textInput: textInput ?? undefined },
            });
          }
          setAppState("WOTD");
          return;
        }

        if (actions.includes("show_news")) {
          if (solution && appStateRef.current === "SOLVED") {
            setSavedState({
              solution,
              hideAnswerByDefault: solutionHideAnswerDefault,
              chatHistory,
              mode: lastMode,
              subject,
              input: { imageFile: imageFile ?? undefined, textInput: textInput ?? undefined },
            });
          }
          setNewsQuery(deriveNewsQuery(trimmedText ?? cleanText));
          setAppState("NEWS");
          return;
        }

        const finalSolution = cleanText || result;

        if (appStateRef.current === "NEWS" || appStateRef.current === "WOTD") {
          setBackgroundTasks((prev) => [
            ...prev.filter((t) => t.id !== taskId),
            {
              id: taskId,
              type: "solve",
              status: "completed",
              solution: finalSolution,
              hideAnswerByDefault: nextHideAnswerByDefault,
              timestamp: Date.now(),
              mode,
              input: { imageFile: nextImageFile ?? undefined, textInput: trimmedText ?? undefined, subject },
            },
          ]);
          return;
        }

        setSolution(finalSolution);
        setSolutionHideAnswerDefault(nextHideAnswerByDefault);
        setAppState("SOLVED");
        history.push({
          id: Date.now().toString(),
          timestamp: Date.now(),
          solution: finalSolution,
          type: "solve",
          hideAnswerByDefault: nextHideAnswerByDefault,
          requestText: trimmedText ?? undefined,
          subject,
          mode,
          provider: resolvedProvider,
          model: resolvedModel,
        });
      } catch (err) {
        if (currentTaskIdRef.current !== taskId) {
          return;
        }
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("No input provided"))
          setErrorMsg("Add a question or paste an image to continue.");
        else if (msg.includes("No usable Gemini model") || msg.includes("selected OpenRouter model"))
          setErrorMsg(msg);
        else if (msg.includes("429") || msg.includes("quota"))
          setErrorMsg("Too many requests — please wait a moment and try again.");
        else if (msg.includes("offline") || msg.includes("fetch"))
          setErrorMsg("No internet connection. Please check your network.");
        else if (msg.includes("API key") || msg.includes("403") || msg.includes("OpenRouter API key") || msg.includes("Gemini API key"))
          setErrorMsg(msg);
        else
          setErrorMsg("Something went wrong. Please try again.");
        setAppState("ERROR");
      }
    },
    [appState, chatHistory, history, imageFile, lastMode, runtimeProviderReady, secureBackend, selectedProvider, selectedProviderConfig.options?.useSecureBackendForAdvanced, selectedProviderId, settings, solution, solutionHideAnswerDefault, subject, textInput],
  );

  const handleSolve = useCallback(
    (mode: Exclude<SolveMode, "research">, detailed = false) => {
      void runSolve({ mode, detailed });
    },
    [runSolve],
  );

  const handleQuickTextSubmit = useCallback(
    (text: string) => {
      void runSolve({
        mode: DEFAULT_SOLVE_MODE,
        nextImageFile: null,
        nextTextInput: text,
      });
    },
    [runSolve],
  );

  useEffect(() => {
    const handleIdleTyping = (event: KeyboardEvent) => {
      const isCapturingBufferedDraft = idleDraftBufferRef.current.length > 0;
      if (
        (appState !== "IDLE" && !isCapturingBufferedDraft) ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (!isCapturingBufferedDraft && isInteractiveTarget(event.target)) ||
        event.key.length !== 1 ||
        (!isCapturingBufferedDraft && event.key.trim().length === 0)
      ) {
        return;
      }

      event.preventDefault();
      const nextDraft = `${idleDraftBufferRef.current}${event.key}`;
      idleDraftBufferRef.current = nextDraft;
      if (idleDraftCaptureTimeoutRef.current !== null) {
        window.clearTimeout(idleDraftCaptureTimeoutRef.current);
      }
      idleDraftCaptureTimeoutRef.current = window.setTimeout(() => {
        idleDraftBufferRef.current = "";
        idleDraftCaptureTimeoutRef.current = null;
      }, 300);
      handleTextPasted(nextDraft);
    };

    window.addEventListener("keydown", handleIdleTyping, true);
    return () => {
      window.removeEventListener("keydown", handleIdleTyping, true);
      if (idleDraftCaptureTimeoutRef.current !== null) {
        window.clearTimeout(idleDraftCaptureTimeoutRef.current);
        idleDraftCaptureTimeoutRef.current = null;
      }
    };
  }, [appState, handleTextPasted]);

  // ── Global keyboard shortcuts ────────────────────────────────────────

  // ESC to close views/navigate back
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const insideChatPanel = Boolean(target?.closest('[data-chat-panel="true"]'));

      // ESC: Close views and navigate back - handle this even if in an input
      if (event.key === "Escape") {
        if (insideChatPanel) {
          return;
        }

        if (showHistory) {
          event.preventDefault();
          setShowHistory(false);
          return;
        }

        if (appState === "NEWS" || appState === "WOTD") {
          event.preventDefault();
          if (savedState || backgroundTasks.some((t) => t.status === "completed")) {
            handleReturnToPrevious();
          } else {
            resetAll();
          }
          return;
        }

        if (appState === "SOLVED") {
          event.preventDefault();
          if (savedState || backgroundTasks.some((t) => t.status === "completed")) {
            handleReturnToPrevious();
          }
          return;
        }

        if (appState === "IDLE") {
          return;
        }
      }

      // Don't intercept other keys if user is typing in an input
      if (isInteractiveTarget(event.target)) {
        return;
      }

      // In SOLVED state: typing auto-focuses chat input
      if (appState === "SOLVED" && !isChatLoading) {
        const isPrintableKey = event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
        if (isPrintableKey && !event.shiftKey) {
          // Small delay to allow the key to be typed before focus
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 10);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [appState, showHistory, savedState, backgroundTasks, handleReturnToPrevious, resetAll, isChatLoading]);

  useEffect(() => {
    if (appState !== "PREVIEWING") {
      return;
    }

    const handlePreviewEnter = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (isEditableTarget(target)) {
        return;
      }

      event.preventDefault();
      handleSolve(DEFAULT_SOLVE_MODE);
    };

    window.addEventListener("keydown", handlePreviewEnter);
    return () => window.removeEventListener("keydown", handlePreviewEnter);
  }, [appState, handleSolve]);

  // ── Chat handler ────────────────────────────────────────────────────

  const handleSendChat = useCallback(
    async (text: string, options?: { retryLast?: boolean }) => {
      if (!solution) return false;

      const trimmed = text.trim();
      if (!trimmed) return false;

      let historyBeforeCurrentTurn = chatHistory;
      let nextHistory: ChatMessage[];

      if (options?.retryLast) {
        const lastUserIndex = [...chatHistory].map((message) => message.role).lastIndexOf("user");
        if (lastUserIndex === -1) {
          return false;
        }

        historyBeforeCurrentTurn = chatHistory.slice(0, lastUserIndex);
        nextHistory = [...historyBeforeCurrentTurn, { role: "user", text: trimmed }];
      } else {
        nextHistory = [...chatHistory, { role: "user", text: trimmed }];
      }

      setChatHistory(nextHistory);
      setIsChatLoading(true);

      try {
        const cleanSolution = stripSolutionClientArtifacts(solution);
        const lastTutorMessage =
          [...historyBeforeCurrentTurn].reverse().find((message) => message.role === "tutor")?.text ?? null;
        const looksLikeClarifyingTurn =
          Boolean(lastTutorMessage) &&
          /(\bclarif|could you|which one|which of these|do you mean|specify|interested in|for example|1\.|2\.)/i.test(lastTutorMessage);
        const effectiveMessage =
          looksLikeClarifyingTurn && trimmed.length < 120
            ? `You asked a clarifying question in your previous reply. Treat the user's message below as their answer to that clarification and continue with the actual task instead of asking the same question again.\n\nPrevious tutor message:\n${lastTutorMessage}\n\nUser answer:\n${trimmed}`
            : trimmed;
        const context: ChatMessage[] =
          historyBeforeCurrentTurn.length === 0
            ? [
                { role: "user", text: "Please help me understand this problem." },
                { role: "tutor", text: `Here is the solution I provided earlier:\n\n${cleanSolution}` },
              ]
            : [];

        let reply: string;
        try {
          reply =
            secureBackend && secureBackend.keyStatus[selectedProviderId]
              ? await secureBackend.chat({
                  provider: selectedProviderId,
                  history: [...context, ...historyBeforeCurrentTurn],
                  message: effectiveMessage,
                  originalQuestion: originalQuestionRef.current ?? undefined,
                  settings,
                })
              : await chatWithTutorWithProvider(
                  [...context, ...historyBeforeCurrentTurn],
                  effectiveMessage,
                  originalQuestionRef.current ?? undefined,
                  settings,
                );
        } catch (firstError) {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
          reply =
            secureBackend && secureBackend.keyStatus[selectedProviderId]
              ? await secureBackend.chat({
                  provider: selectedProviderId,
                  history: [...context, ...historyBeforeCurrentTurn],
                  message: effectiveMessage,
                  originalQuestion: originalQuestionRef.current ?? undefined,
                  settings,
                })
              : await chatWithTutorWithProvider(
                  [...context, ...historyBeforeCurrentTurn],
                  effectiveMessage,
                  originalQuestionRef.current ?? undefined,
                  settings,
                );
          console.warn("Recovered follow-up chat after retry.", firstError);
        }

        setChatHistory([...nextHistory, { role: "tutor", text: reply }]);
        return true;
      } catch (err) {
        console.error(err);
        setChatHistory([
          ...nextHistory,
          { role: "tutor", text: "Sorry, I couldn't process that right now. Please try again." },
        ]);
        return false;
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatHistory, secureBackend, selectedProviderId, settings, solution],
  );

  // ── History handler ─────────────────────────────────────────────────

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setSolution(item.solution);
    setSolutionHideAnswerDefault(item.hideAnswerByDefault ?? false);
    setLastMode(item.mode ?? DEFAULT_SOLVE_MODE);
    setSubject(item.subject ?? "Auto-detect");
    setAppState("SOLVED");
    setShowHistory(false);
    setImageFile(null);
    setTextInput(item.requestText ?? null);
    originalQuestionRef.current = {
      text: item.requestText ?? undefined,
    };
  }, []);

  const hasDraftInput = Boolean(imageFile || textInput?.trim());
  const updateDraftText = useCallback((value: string) => {
    setTextInput(value);
    setImageFile(null);
    setErrorMsg(null);
  }, []);
  const editCurrentRequest = useCallback(() => {
    if (!hasDraftInput) {
      return;
    }

    setErrorMsg(null);
    setAppState("PREVIEWING");
  }, [hasDraftInput]);
  const retryCurrentRequest = useCallback(() => {
    if (!hasDraftInput) {
      return;
    }

    void runSolve({ mode: lastMode });
  }, [hasDraftInput, lastMode, runSolve]);
  const lastFollowUpQuestion =
    [...chatHistory].reverse().find((message) => message.role === "user")?.text ?? null;
  const handleRetryChat = useCallback(async () => {
    if (!lastFollowUpQuestion) {
      return false;
    }

    return handleSendChat(lastFollowUpQuestion, { retryLast: true });
  }, [handleSendChat, lastFollowUpQuestion]);

  const handleInstallApp = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice.catch(() => null);
    setInstallPromptEvent(null);
  }, [installPromptEvent]);

  const providerName = getProviderLabel(selectedProviderId);
  const providerStatus = secureProviderReady
    ? "account vault key ready"
    : runtimeProviderReady
      ? "browser key ready"
      : "key needed";
  const visibleOpenRouterModels =
    settings.providers.openrouter.options?.freeOnly
      ? providerCatalog.models.filter((model) => model.free)
      : providerCatalog.models;
  const accountControlsNode = accountControls ?? (
    <div className="rounded-full border border-[var(--aqs-ink)]/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
      Local-only mode
    </div>
  );
  const heroAsset = getMikeHeroAsset(subject);
  const emblemAsset = getMikeEmblemAsset();
  const evidencePlan = useMemo(() => buildEvidencePlan(textInput?.trim() ?? ""), [textInput]);
  const evidencePlanPills = useMemo(() => {
    const pills = formatEvidencePills(evidencePlan);
    if (pills.length > 0) {
      return pills;
    }

    return ["Citations", "Research", "Weather", "Maps"];
  }, [evidencePlan]);
  const evidencePlanDescription = textInput?.trim()
    ? describeEvidencePlan(evidencePlan)
    : "Mike stays direct by default, but it switches to live evidence, calculations, figures, demos, weather, or maps links when those actually make the answer stronger.";
  const subjectDescriptor = subject === "Auto-detect" ? "General reasoning studio" : `${subject} studio`;
  const localContextLabel = settings.preferredLocation?.trim()
    ? `Preferred location: ${settings.preferredLocation.trim()}`
    : "Typed city stays local until you decide to use it.";
  const fastModelLabel = formatModelLabel(
    selectedProviderConfig.models.fastModel,
    selectedProvider.defaultModels.fastModel || "Set fast model",
  );
  const deepModelLabel = formatModelLabel(
    selectedProviderConfig.models.deepModel,
    selectedProvider.defaultModels.deepModel || "Set deep model",
  );

  const subjectControl = (
    <div className="flex flex-col gap-2 no-print sm:flex-row sm:items-center">
      <label
        htmlFor="subject-select"
        className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400"
      >
        Subject
      </label>
      <div className="relative">
        <select
          id="subject-select"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="select-themed appearance-none rounded-full border border-[var(--aqs-ink)]/10 bg-white/92 px-4 py-3 pr-12 text-sm font-semibold text-[var(--aqs-ink)] outline-none transition focus-visible:border-[var(--aqs-accent)] focus-visible:ring-4 focus-visible:ring-[color:rgba(122,31,52,0.14)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
        >
          <option>Auto-detect</option>
          <option>Mathematics</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
          <option>Computer Science</option>
          <option>Engineering</option>
          <option>Statistics</option>
          <option>Economics</option>
          <option>History</option>
          <option>Literature</option>
          <option>Philosophy</option>
          <option>Psychology</option>
          <option>Medicine</option>
          <option>Law</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]" />
      </div>
    </div>
  );

  const studySignals = [
    {
      title: "Truth-first",
      body: "Current questions get live evidence and exact date framing when needed.",
    },
    {
      title: "Visual when useful",
      body: "Charts, figures, tables, and demos appear only when they clarify the answer.",
    },
    {
      title: "Local by choice",
      body: localContextLabel,
    },
  ];

  const mascotStage = (
    <aside className="studio-panel relative overflow-hidden bg-white p-6 dark:bg-slate-900 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,140,58,0.12),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,30,63,0.1),transparent_40%)]" />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center px-4 py-1.5 patch">
            {subjectDescriptor}
          </div>
          <div className="h-2 w-12 rounded-full bg-[var(--aqs-border)]/5" />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--aqs-ink)]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(252,245,238,0.96))] px-4 pt-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(29,18,26,0.86))]">
          <div className="absolute inset-x-[8%] bottom-6 h-40 rounded-[50%] bg-[radial-gradient(circle,rgba(139,30,63,0.16),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(240,163,182,0.14),transparent_70%)]" />
          <div className="mb-4 text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">
            Subject art direction
          </div>
          <img
            src={heroAsset.webp}
            alt={`${subjectDescriptor} mascot`}
            className="relative z-10 mx-auto max-h-[250px] w-full object-contain object-top drop-shadow-[0_28px_48px_rgba(20,17,21,0.24)] transition-transform duration-700 hover:scale-[1.03] md:max-h-[310px] xl:max-h-[340px] animate-in zoom-in-95"
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-3xl font-black tracking-tighter text-[var(--aqs-ink)] dark:text-white">
            {subject === "Auto-detect" ? "Universal Agent" : `Master ${subject}`}
          </h3>
          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Mike’s visual profile shifts with the studio subject, while the runtime stays explicit about speed, depth, and evidence.
          </p>
        </div>

        <div className="grid gap-3 border-t-2 border-[var(--aqs-border)]/5 pt-4 sm:grid-cols-3 xl:grid-cols-1">
          {studySignals.map((signal) => (
            <div key={signal.title} className="flex items-start gap-3">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aqs-accent)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--aqs-ink)] dark:text-white">{signal.title}</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{signal.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-[var(--aqs-ink)] dark:text-gray-100 font-sans selection:bg-[var(--aqs-accent-soft)] selection:text-[var(--aqs-accent-strong)] transition-colors duration-300">
      {showHistory && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />}>
          <HistorySidebar
            items={history.items}
            onSelect={loadHistoryItem}
            onClose={() => setShowHistory(false)}
          />
        </Suspense>
      )}

      <div
        className={`mx-auto px-4 py-8 transition-all duration-500 md:py-12 ${
          appState === "NEWS" ? "max-w-[1780px]" : appState === "WOTD" ? "max-w-6xl" : "max-w-[1280px]"
        }`}
      >
        <Header
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
          onOpenHistory={() => setShowHistory(true)}
          onToggleSetup={() => setShowSetup((value) => !value)}
          setupOpen={showSetup}
          accountControls={accountControlsNode}
          emblemSrc={emblemAsset.webp}
          onInstallApp={handleInstallApp}
          canInstallApp={Boolean(installPromptEvent) && !standalonePwa}
          providerName={providerName}
          providerStatus={providerStatus}
        />

        {showSetup && appState !== "NEWS" && appState !== "WOTD" ? (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-md md:items-center md:p-8">
            <div className="relative max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[2.5rem]">
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                aria-label="Close settings"
                className="absolute right-6 top-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--aqs-border)] bg-white text-[var(--aqs-ink)] shadow-[4px_4px_0px_0px_var(--aqs-border)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900 dark:text-white"
              >
                ×
              </button>
              <SetupGuide
                settings={settings}
                authState={authState}
                accountControls={accountControlsNode}
                historyLabel={history.label}
                emblemSrc={emblemAsset.webp}
                openrouterModels={visibleOpenRouterModels}
                openrouterLoading={providerCatalog.loading}
                openrouterError={providerCatalog.error}
                onRefreshOpenRouterModels={() => {
                  void providerCatalog.refresh(true);
                }}
                secureKeyStatus={secureBackend?.keyStatus}
                onStoreSecureKey={secureBackend?.storeProviderKey}
                onDeleteSecureKey={secureBackend?.removeProviderKey}
                onUpdateSettings={updateSettings}
                onUpdateProviderSettings={updateProviderSettings}
                onResetSettings={resetSettings}
                onComplete={() => {
                  updateSettings({ onboardingCompleted: true });
                  setShowSetup(false);
                }}
              />
            </div>
          </div>
        ) : null}

        <main className="space-y-8">
          <div
            className={
              showSetup && appState !== "NEWS" && appState !== "WOTD"
                ? "pointer-events-none opacity-20 blur-sm grayscale transition duration-500"
                : "transition duration-500"
            }
            aria-hidden={showSetup && appState !== "NEWS" && appState !== "WOTD"}
          >
            {/* ── Idle: show dropzone ──────────────────────────────── */}
            {appState === "IDLE" && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <section className="studio-panel relative overflow-hidden p-6 md:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,30,63,0.06),transparent_40%),radial-gradient(circle_at_top_right,rgba(184,140,58,0.06),transparent_40%)]" />

                    <div className="relative space-y-10">
                      <div className="flex flex-col gap-6 border-b-2 border-[var(--aqs-border)]/5 pb-10 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                          <div className="inline-flex items-center gap-2 patch">
                            <ShieldCheck className="h-4 w-4" />
                            Secure Academic Studio
                          </div>
                          <h2 className="academic-title mt-8 text-[var(--aqs-ink)] dark:text-white">
                            Ask anything <span className="text-[var(--aqs-accent)]">serious.</span>
                          </h2>
                          <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            The direct path to truth. Mike provides clear reasoning and evidence without the conversational fluff.
                          </p>
                        </div>

                        <div className="shrink-0">
                          {subjectControl}
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="neo-border-thin rounded-3xl bg-white/50 p-6 dark:bg-slate-950/30">
                          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                            Studio Heuristics
                          </div>
                          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            {evidencePlanDescription}
                          </p>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {evidencePlanPills.map((pill) => (
                              <span
                                key={pill}
                                className="neo-border-thin rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="neo-border-thin rounded-3xl bg-[var(--aqs-accent-soft)] p-6 dark:bg-[color:rgba(139,30,63,0.12)]">
                          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                            Provider Profile
                          </div>
                          <div className="mt-3 text-sm font-semibold text-[var(--aqs-ink)] dark:text-white">
                            {providerName}
                          </div>
                          <div className="mt-5 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <Zap className="h-5 w-5 text-[var(--aqs-gold)] fill-[var(--aqs-gold)]" />
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                  Fast
                                </div>
                                <div className="truncate text-sm font-black text-[var(--aqs-ink)] dark:text-white">{fastModelLabel}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <BrainCircuit className="h-5 w-5 text-[var(--aqs-accent)]" />
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                  Deep
                                </div>
                                <div className="truncate text-sm font-black text-[var(--aqs-ink)] dark:text-white">{deepModelLabel}</div>
                              </div>
                            </div>
                          </div>
                          <p className="mt-4 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            {selectedProvider.shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <Dropzone
                          onImageSelected={handleImageSelected}
                          onTextPasted={handleTextPasted}
                          onQuickSubmit={handleQuickTextSubmit}
                          onError={(msg) => {
                            setErrorMsg(msg);
                            setAppState("ERROR");
                          }}
                          onVoiceInput={handleTextPasted}
                          onAudioTranscribe={async (audioBlob) => {
                            if (
                              selectedProvider.capabilities.supportsAudioTranscription &&
                              secureBackend?.transcribeAudio &&
                              secureBackend.keyStatus[selectedProviderId]
                            ) {
                              const audioBase64 = await blobToBase64(audioBlob);
                              return await secureBackend.transcribeAudio({
                                provider: selectedProviderId,
                                audioBase64,
                                mimeType: audioBlob.type || "audio/ogg",
                                settings,
                              });
                            }

                            return await transcribeAudioWithProvider(audioBlob, settings);
                          }}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => handleOpenNews()}
                          className="studio-card flex items-start justify-between p-6 text-left"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-black text-[var(--aqs-ink)] dark:text-white">Current news</div>
                            <div className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              Real-time updates from verified editorial sources.
                            </div>
                          </div>
                          <Newspaper className="h-5 w-5 shrink-0 text-[var(--aqs-accent)]" />
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenWotd}
                          className="studio-card flex items-start justify-between p-6 text-left"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-black text-[var(--aqs-ink)] dark:text-white">Daily word</div>
                            <div className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              Expand your vocabulary with MW's word of the day.
                            </div>
                          </div>
                          <BookOpen className="h-5 w-5 shrink-0 text-[var(--aqs-accent)]" />
                        </button>

                        {Boolean(installPromptEvent) && !standalonePwa ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleInstallApp();
                            }}
                            className="studio-card flex items-start justify-between bg-[var(--aqs-gold-soft)] p-6 text-left dark:bg-[color:rgba(198,156,67,0.12)]"
                          >
                            <div className="min-w-0 pr-4">
                              <div className="text-sm font-black text-[var(--aqs-ink)] dark:text-white">Native app</div>
                              <div className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                                Run Mike as a standalone desktop utility.
                              </div>
                            </div>
                            <Download className="h-5 w-5 shrink-0 text-[var(--aqs-gold)]" />
                          </button>
                        ) : (
                          <div className="studio-card flex items-start justify-between bg-slate-100/30 p-6 text-left dark:bg-slate-900/30">
                            <div className="min-w-0 pr-4">
                              <div className="text-sm font-black text-slate-400">Pro Cloud</div>
                              <div className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">
                                Connect to Convex for sync and secure storage.
                              </div>
                            </div>
                            <ShieldCheck className="h-5 w-5 shrink-0 text-slate-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {mascotStage}
                </div>
              </div>
            )}

            {/* ── Previewing: show input + solve buttons ──────────── */}
            {appState === "PREVIEWING" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="space-y-8">
                    <div className="paper-panel p-6 md:p-8">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <span className="patch px-4 py-1.5 text-[10px]">Review Request</span>
                          <p className="mt-4 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                            {evidencePlanDescription}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {evidencePlanPills.map((pill) => (
                              <span
                                key={pill}
                                className="neo-border-thin rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {subjectControl}
                        </div>
                      </div>
                    </div>
                    <InputPreview
                      imagePreviewUrl={imagePreviewUrl}
                      textInput={textInput}
                      onTextChange={updateDraftText}
                      onSolve={handleSolve}
                      onClear={resetAll}
                    />
                  </div>

                  {mascotStage}
                </div>
              </div>
            )}

            {/* ── Loading spinner ──────────────────────────────────── */}
            {appState === "LOADING" && <LoadingState />}

            {/* ── Error message ────────────────────────────────────── */}
            {appState === "ERROR" && errorMsg && (
              <ErrorState
                message={errorMsg}
                onRetry={() => {
                  if (!hasDraftInput) {
                    resetAll();
                    return;
                  }

                  handleSolve(lastMode);
                }}
                onClear={resetAll}
              />
            )}

            {/* ── Solved: show solution + actions + chat ──────────── */}
            {appState === "SOLVED" && solution && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Suspense fallback={<LoadingState />}>
                  <SolutionDisplay
                    solution={solution}
                    hideAnswerByDefault={solutionHideAnswerDefault}
                  />
                </Suspense>

                <ActionBar
                  solution={solution}
                  lastMode={lastMode}
                  canRetryEdit={hasDraftInput}
                  onSolveAgain={handleSolve}
                  onRetry={retryCurrentRequest}
                  onEditRequest={editCurrentRequest}
                  onClear={resetAll}
                />

                <Suspense fallback={<LoadingState />}>
                  <ChatPanel
                    messages={chatHistory}
                    isLoading={isChatLoading}
                    lastUserMessage={lastFollowUpQuestion}
                    onSend={handleSendChat}
                    onRetryLast={handleRetryChat}
                    inputRef={chatInputRef}
                    starterPrompts={buildFollowUpStarters(solution, solutionHideAnswerDefault)}
                  />
                </Suspense>
              </div>
            )}

            {/* ── News view ─────────────────────────────────────── */}
            {appState === "NEWS" && (
              <Suspense fallback={<LoadingState />}>
                <NewsView
                  initialQuery={newsQuery}
                  onClose={resetAll}
                  onReturn={isReturning || backgroundTasks.some(t => t.status === "completed") ? handleReturnToPrevious : undefined}
                  hasBackgroundTask={backgroundTasks.some(t => t.status === "completed")}
                />
              </Suspense>
            )}

            {/* ── Word of the Day view ─────────────────────────── */}
            {appState === "WOTD" && (
              <Suspense fallback={<LoadingState />}>
                <WordOfTheDay 
                  onClose={resetAll} 
                  onReturn={isReturning || backgroundTasks.some(t => t.status === "completed") ? handleReturnToPrevious : undefined}
                />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

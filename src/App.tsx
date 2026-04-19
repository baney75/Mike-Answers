import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";

import type {
  AppState,
  SolveMode,
  ChatMessage,
  HistoryItem,
  BackgroundTask,
  SavedState,
  HistoryController,
  ProviderId,
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

import { deriveNewsQuery } from "./services/news";
import {
  isStandalonePwa,
  registerInstallPrompt,
  registerPwaLifecycle,
  subscribeNetworkStatus,
  type InstallPromptEvent,
} from "./services/pwa";
import { getProviderDescriptor, getProviderLabel } from "./services/providers/registry";


import { Header } from "./components/Header";
import { HomeWorkspace } from "./components/HomeWorkspace";
import { PwaNotice } from "./components/PwaNotice";
import { DeskWorkspaceShell } from "./components/DeskWorkspaceShell";
import { InputPreview } from "./components/InputPreview";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { SetupGuide } from "./components/SetupGuide";
import { buildWorkspaceTransferBundle } from "./services/workspaceTransfer";
import { usePeerWorkspaceSync } from "./hooks/usePeerWorkspaceSync";

const SolveWorkspace = lazy(async () => ({
  default: (await import("./components/SolveWorkspace")).SolveWorkspace,
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
const AiCitationModal = lazy(async () => ({
  default: (await import("./components/AiCitationModal")).AiCitationModal,
}));
const WorkspaceTransferModal = lazy(async () => ({
  default: (await import("./components/WorkspaceTransferModal")).WorkspaceTransferModal,
}));

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_SOLVE_MODE: Exclude<SolveMode, "research"> = "fast";
type DailyDeskView = "overview" | "word" | "verse" | "news";

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
  let match: RegExpExecArray | null = actionRegex.exec(text);
  while (match !== null) {
    actions.push(match[1]);
    cleanText = cleanText.replace(match[0], "");
    match = actionRegex.exec(text);
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

function isVerseOfTheDayRequest(value: string) {
  return /\b(verse of the day|daily verse|today'?s verse)\b/i.test(value);
}

function isNewsRequest(value: string) {
  return /\b(news|headlines|current events|latest on|latest about|what happened|what's happening|updates? on)\b/i.test(value);
}

function buildFollowUpStarters(solution: string, hideAnswerByDefault: boolean) {
  const clarificationPromptPattern =
    /\b(clarify|specific question|specific task|what would you like me to do|what do you want me to do|provide more details?|give me more details?|test my abilities)\b/i;

  if (clarificationPromptPattern.test(solution)) {
    return [
      "Paste the exact question.",
      "Check my work and find the first mistake.",
      "Explain the concept in plain language.",
      "Show the first step only.",
    ];
  }

  const starters = [
    hideAnswerByDefault ? "Check my next step." : "Explain this more simply.",
    "Show the next step only.",
    "Check this for mistakes.",
    "Give me one mistake to avoid.",
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

function buildIdlePrompts(subject: string) {
  switch (subject) {
    case "Mathematics":
    case "Statistics":
      return [
        "Solve this step by step and show the first mistake if my work is wrong.",
        "Turn this problem into a short study guide with one worked example.",
        "Explain the key idea behind this problem before giving the answer.",
        "Check whether my algebra or arithmetic is correct.",
      ];
    case "Physics":
    case "Chemistry":
    case "Biology":
    case "Engineering":
    case "Medicine":
      return [
        "Explain this diagram or screenshot in plain language.",
        "Walk through the solution and name the formula or principle being used.",
        "Turn this into a quick review sheet with the big ideas first.",
        "Check my reasoning and tell me where it first goes wrong.",
      ];
    case "History":
    case "Literature":
    case "Philosophy":
    case "Psychology":
    case "Law":
    case "Economics":
      return [
        "Summarize this in plain English and tell me what matters most.",
        "Compare the two strongest viewpoints in a clean table.",
        "Turn this reading into a study guide with likely quiz questions.",
        "Explain the argument, evidence, and weakness in simple terms.",
      ];
    case "Computer Science":
      return [
        "Explain this code or error message and tell me the first fix to try.",
        "Turn this screenshot into a debugging checklist.",
        "Compare two implementation options and tell me which is safer.",
        "Review this logic and point out the first bug or blind spot.",
      ];
    default:
      return [
        "Explain this screenshot step by step.",
        "Summarize this article in plain language.",
        "Check my work and find the first mistake.",
        "Turn this into a study guide I can review fast.",
      ];
  }
}

interface AppProps {
  externalHistory?: HistoryController;
}

export default function App({ externalHistory }: AppProps) {
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);

  // ── Solution state ───────────────────────────────────────────────────
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionHideAnswerDefault, setSolutionHideAnswerDefault] = useState(false);
  const [lastResolvedProviderId, setLastResolvedProviderId] = useState<ProviderId>("gemini");
  const [lastResolvedModel, setLastResolvedModel] = useState<string | undefined>(undefined);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // ── Chat state ──────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ── Sidebar state ───────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [standalonePwa, setStandalonePwa] = useState(() => isStandalonePwa());
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const pwaUpdateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const idleDraftBufferRef = useRef("");
  const idleDraftCaptureTimeoutRef = useRef<number | null>(null);

  // ── Original question context for follow-up chat ────────────────────
  const originalQuestionRef = useRef<{ text?: string; imageBase64?: string } | null>(null);

  // ── Feature toggle state ─────────────────────────────────────────────
  const [newsQuery, setNewsQuery] = useState("");
  const [dailyDeskView, setDailyDeskView] = useState<DailyDeskView>("overview");
  const [chatPrefill, setChatPrefill] = useState<{ id: number; text: string } | null>(null);

  // ── Background task state ───────────────────────────────────────────
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [savedState, setSavedState] = useState<SavedState | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  // ── Hooks ───────────────────────────────────────────────────────────
  const { theme, setTheme } = useDarkMode();
  const localHistory = useHistory();
  const history = externalHistory ?? localHistory;
  const appStateRef = useRef<AppState>("IDLE");
  const { settings, updateSettings, updateProviderSettings, replaceSettings, resetSettings } = useAISettings();
  const selectedProviderId = settings.selectedProviderId;
  const selectedProvider = getProviderDescriptor(selectedProviderId);
  const runtimeProviderReady = isRuntimeProviderReady(settings);
  const providerCatalog = useProviderCatalog(settings);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get("scene");

    if (scene === "settings") {
      setShowSetup(true);
      return;
    }

    if (scene === "daily-desk") {
      setDailyDeskView("overview");
      setAppState("WOTD");
    }
  }, []);

  const currentHistoryItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    setStandalonePwa(isStandalonePwa());
    const unregisterPrompt = registerInstallPrompt((event) => {
      setInstallPromptEvent(event);
    });
    const pwaLifecycle = registerPwaLifecycle({
      onOfflineReady: () => setOfflineReady(true),
      onNeedRefresh: () => setNeedRefresh(true),
      onRegisterError: (error) => console.error("PWA registration error", error),
    });
    pwaUpdateRef.current = pwaLifecycle.updateServiceWorker;
    const unsubscribeNetwork = subscribeNetworkStatus(setIsOffline);
    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setStandalonePwa(true);
    };

    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      unregisterPrompt();
      unsubscribeNetwork();
      pwaLifecycle.unregister();
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOfflineReady(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [offlineReady]);

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
    setDailyDeskView("overview");
    setChatPrefill(null);
    setSavedState(null);
    setIsReturning(false);
    currentHistoryItemIdRef.current = null;
  }, []);

  const buildPromptContext = useCallback(() => ({
    localDateTime: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date()),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone unavailable",
  }), []);

  const buildHistoryItemSnapshot = useCallback(
    (historyItemId: string): HistoryItem | null => {
      if (!solution) {
        return null;
      }

      return {
        id: historyItemId,
        timestamp: Date.now(),
        solution,
        chatHistory,
        type: "solve",
        hideAnswerByDefault: solutionHideAnswerDefault,
        requestText: textInput ?? undefined,
        subject,
        mode: lastMode,
        provider: selectedProviderId,
      };
    },
    [chatHistory, lastMode, selectedProviderId, solution, solutionHideAnswerDefault, subject, textInput],
  );

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

  const handleOpenDailyDesk = useCallback((view: DailyDeskView = "overview") => {
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
    setDailyDeskView(view);
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
      const trimmedText = nextTextInput?.trim() ?? null;

      if (!runtimeProviderReady) {
        if (nextImageFile) {
          setImageFile(nextImageFile);
          setTextInput(null);
          setAppState("PREVIEWING");
        } else if (trimmedText) {
          setTextInput(trimmedText);
          setImageFile(null);
          setAppState("PREVIEWING");
        }

        setShowSetup(true);
        setErrorMsg("Add a provider key to keep going.");
        return;
      }

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
          const response = await solveImageQuestionWithProvider(
            originalImageBase64,
            mode,
            subject,
            detailed,
            settings,
            buildPromptContext(),
          );
          result = response.text;
          resolvedModel = response.model;
          resolvedProvider = response.provider;
        } else if (trimmedText) {
          if (isVerseOfTheDayRequest(trimmedText)) {
            setDailyDeskView("verse");
            setAppState("WOTD");
            return;
          }

          if (isWordOfTheDayRequest(trimmedText)) {
            setDailyDeskView("word");
            setAppState("WOTD");
            return;
          }

          if (isNewsRequest(trimmedText)) {
            setNewsQuery(deriveNewsQuery(trimmedText));
            setAppState("NEWS");
            return;
          }

          const response = await solveTextQuestionWithProvider(
            trimmedText,
            mode,
            subject,
            detailed,
            settings,
            buildPromptContext(),
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
          setDailyDeskView("overview");
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
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          solution: finalSolution,
          chatHistory: [],
          type: "solve",
          hideAnswerByDefault: nextHideAnswerByDefault,
          requestText: trimmedText ?? undefined,
          subject,
          mode,
          provider: resolvedProvider,
          model: resolvedModel,
        };
        currentHistoryItemIdRef.current = historyItem.id;
        setLastResolvedProviderId(resolvedProvider);
        setLastResolvedModel(resolvedModel);
        setLastGeneratedAt(new Date().toISOString());
        history.push(historyItem);
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
        else if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand"))
          setErrorMsg("Gemini is busy right now. Retry in a moment, or switch to OpenRouter if you need an answer now.");
        else if (msg.includes("offline") || msg.includes("fetch"))
          setErrorMsg("No internet connection. Please check your network.");
        else if (msg.includes("API key") || msg.includes("403") || msg.includes("OpenRouter API key") || msg.includes("Gemini API key"))
          setErrorMsg(msg);
        else
          setErrorMsg("Something went wrong. Please try again.");
        setAppState("ERROR");
      }
    },
    [buildPromptContext, chatHistory, history, imageFile, lastMode, runtimeProviderReady, selectedProviderId, settings, solution, solutionHideAnswerDefault, subject, textInput],
  );

  const replaceHistoryItem = history.replace;

  useEffect(() => {
    if (appState !== "SOLVED" || !replaceHistoryItem || !currentHistoryItemIdRef.current) {
      return;
    }

    const snapshot = buildHistoryItemSnapshot(currentHistoryItemIdRef.current);
    if (!snapshot) {
      return;
    }

    void replaceHistoryItem(snapshot);
  }, [appState, buildHistoryItemSnapshot, replaceHistoryItem]);

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

  const handleQuickDeepSubmit = useCallback(
    (text: string) => {
      void runSolve({
        mode: "deep",
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

        if (showSetup) {
          event.preventDefault();
          setShowSetup(false);
          return;
        }

        if (appState === "PREVIEWING" || appState === "ERROR" || appState === "SOLVED") {
          event.preventDefault();
          resetAll();
          return;
        }

        if (appState === "NEWS" || appState === "WOTD") {
          event.preventDefault();

          if (isReturning || backgroundTasks.some((task) => task.status === "completed")) {
            handleReturnToPrevious();
            return;
          }

          resetAll();
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
          event.preventDefault();
          setChatPrefill({ id: Date.now(), text: event.key });
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 10);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [appState, showHistory, showSetup, resetAll, isChatLoading, isReturning, backgroundTasks, handleReturnToPrevious]);

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

      if (!runtimeProviderReady) {
        setChatHistory([
          ...nextHistory,
          {
            role: "tutor",
            text: "Mike needs a configured provider before follow-up chat can run. Open Setup, add a key, and try again.",
          },
        ]);
        return true;
      }

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
          reply = await chatWithTutorWithProvider(
            [...context, ...historyBeforeCurrentTurn],
            effectiveMessage,
            originalQuestionRef.current ?? undefined,
            settings,
            subject,
            buildPromptContext(),
          );
        } catch (firstError) {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
          reply = await chatWithTutorWithProvider(
            [...context, ...historyBeforeCurrentTurn],
            effectiveMessage,
            originalQuestionRef.current ?? undefined,
            settings,
            subject,
            buildPromptContext(),
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
    [buildPromptContext, chatHistory, runtimeProviderReady, settings, solution, subject],
  );

  const handleFeatureChat = useCallback(
    async (
      history: { role: string; text: string }[],
      message: string,
      options?: { subject?: string },
    ) => {
      if (!runtimeProviderReady) {
        return "Mike needs a configured provider before desk chat can run. Open Setup, add a key, and try again.";
      }

      return chatWithTutorWithProvider(
        history,
        message,
        undefined,
        settings,
        options?.subject,
        buildPromptContext(),
      );
    },
    [buildPromptContext, runtimeProviderReady, settings],
  );

  // ── History handler ─────────────────────────────────────────────────

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setSolution(item.solution);
    setChatHistory(item.chatHistory ?? []);
    setSolutionHideAnswerDefault(item.hideAnswerByDefault ?? false);
    setLastMode(item.mode ?? DEFAULT_SOLVE_MODE);
    setSubject(item.subject ?? "Auto-detect");
    setLastResolvedProviderId(item.provider ?? "gemini");
    setLastResolvedModel(item.model);
    setAppState("SOLVED");
    setShowHistory(false);
    setImageFile(null);
    setTextInput(item.requestText ?? null);
    originalQuestionRef.current = {
      text: item.requestText ?? undefined,
    };
    currentHistoryItemIdRef.current = item.id;
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

  const handleRefreshPwa = useCallback(async () => {
    if (!pwaUpdateRef.current) {
      return;
    }

    await pwaUpdateRef.current(true);
  }, []);

  const providerName = getProviderLabel(selectedProviderId);
  const providerStatus = runtimeProviderReady ? "browser key ready" : "key needed";
  const citationInput = solution
    ? {
        providerId: lastResolvedProviderId,
        providerLabel: getProviderLabel(lastResolvedProviderId),
        model: lastResolvedModel,
        prompt: textInput ?? originalQuestionRef.current?.text,
        generatedAt: lastGeneratedAt ?? new Date().toISOString(),
        appName: "Mike Answers",
        appUrl: typeof window !== "undefined" ? window.location.origin : "https://mike-net.top",
      }
    : null;
  const visibleOpenRouterModels =
    settings.providers.openrouter.options?.freeOnly
      ? providerCatalog.models.filter((model) => model.free)
      : providerCatalog.models;
  const heroAsset = getMikeHeroAsset(subject);
  const emblemAsset = getMikeEmblemAsset();
  const idlePrompts = useMemo(() => buildIdlePrompts(subject), [subject]);
  const transferBundle = useMemo(() => buildWorkspaceTransferBundle(settings, history.items), [history.items, settings]);
  const peerSync = usePeerWorkspaceSync(transferBundle, async (bundle) => {
    replaceSettings(bundle.settings);
    await history.replaceAll?.(bundle.history);
    if (bundle.history[0]) {
      loadHistoryItem(bundle.history[0]);
    }
  });
  const transferControls = (
    <div className="rounded-[1.7rem] border border-(--aqs-ink)/10 bg-white/82 p-4 dark:border-white/10 dark:bg-slate-950/58">
      <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">Encrypted device transfer</div>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Move saved keys, provider defaults, and recent solved chats between devices with encrypted QR frames or an encrypted backup file.
      </p>
      <button
        type="button"
        onClick={() => setShowTransferModal(true)}
        className="mt-4 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-4 py-2 text-sm font-semibold text-white"
      >
        Open secure transfer
      </button>
    </div>
  );

  const hasBackgroundSolution = isReturning || backgroundTasks.some((task) => task.status === "completed");

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden font-sans text-(--aqs-ink) transition-colors duration-300 selection:bg-(--aqs-accent-soft) selection:text-(--aqs-accent-strong) dark:text-gray-100">
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
        className={`relative mx-auto flex w-full flex-1 flex-col overflow-hidden px-3 py-3 transition-all duration-500 md:px-4 md:py-4 ${
          appState === "NEWS" ? "max-w-[1780px]" : appState === "WOTD" ? "max-w-6xl" : "max-w-[1280px]"
        }`}
      >
        <Header
          theme={theme}
          setTheme={setTheme}
          onOpenHistory={() => {
            if (history.items.length > 0) {
              setShowHistory(true);
            }
          }}
          onToggleSetup={() => setShowSetup((value) => !value)}
          setupOpen={showSetup}
          emblemSrc={emblemAsset.webp}
          onInstallApp={handleInstallApp}
          canInstallApp={Boolean(installPromptEvent) && !standalonePwa}
          providerName={providerName}
          providerStatus={providerStatus}
          historyCount={history.items.length}
        />

        {showSetup && appState !== "NEWS" && appState !== "WOTD" ? (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-md md:items-center md:p-8">
            <div className="relative max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[2.5rem]">
              <button
                type="button"
                onClick={() => setShowSetup(false)}
                aria-label="Close settings"
                className="absolute right-6 top-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-(--aqs-border) bg-white text-(--aqs-ink) shadow-[4px_4px_0px_0px_var(--aqs-border)] transition-all hover:-translate-y-0.5 active:translate-y-px dark:bg-slate-900 dark:text-white"
              >
                ×
              </button>
              <SetupGuide
                settings={settings}
                transferControls={transferControls}
                historyLabel={history.label}
                emblemSrc={emblemAsset.webp}
                openrouterModels={visibleOpenRouterModels}
                openrouterLoading={providerCatalog.loading}
                openrouterError={providerCatalog.error}
                onRefreshOpenRouterModels={() => {
                  void providerCatalog.refresh(true);
                }}
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

        {showTransferModal ? (
          <Suspense fallback={null}>
            <WorkspaceTransferModal
              open={showTransferModal}
              bundle={transferBundle}
              onClose={() => setShowTransferModal(false)}
              onImportBundle={async (bundle) => {
                replaceSettings(bundle.settings);
                await history.replaceAll?.(bundle.history);
                if (bundle.history[0]) {
                  loadHistoryItem(bundle.history[0]);
                }
              }}
              peerSync={{
                connectionState: peerSync.connectionState,
                preparedSignal: peerSync.preparedSignal,
                error: peerSync.error,
                onStartHost: peerSync.startHost,
                onJoinFromOffer: peerSync.joinFromOffer,
                onFinishHost: peerSync.finishHost,
                onCloseSession: peerSync.closeSession,
              }}
            />
          </Suspense>
        ) : null}

        {showCitationModal ? (
          <Suspense fallback={null}>
            <AiCitationModal
              open={showCitationModal}
              citationInput={citationInput}
              onClose={() => setShowCitationModal(false)}
            />
          </Suspense>
        ) : null}

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden pb-2">
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
              showSetup && appState !== "NEWS" && appState !== "WOTD"
                ? "pointer-events-none opacity-20 blur-sm grayscale transition duration-500"
                : "transition duration-500"
            }`}
            aria-hidden={showSetup && appState !== "NEWS" && appState !== "WOTD"}
          >
            {/* ── Idle: home workspace ─────────────────────────────── */}
            {appState === "IDLE" && (
              <HomeWorkspace
                subject={subject}
                onSubjectChange={setSubject}
                heroSrc={heroAsset.webp}
                providerName={providerName}
                providerReady={runtimeProviderReady}
                starterPrompts={idlePrompts}

                onPrefillPrompt={handleTextPasted}
                onOpenSetup={() => setShowSetup(true)}
                onOpenDailyDesk={() => handleOpenDailyDesk("overview")}
                onImageSelected={handleImageSelected}
                onTextPasted={handleTextPasted}
                onQuickSubmit={handleQuickTextSubmit}
                onDeepSubmit={handleQuickDeepSubmit}
                onError={(msg) => {
                  setErrorMsg(msg);
                  setAppState("ERROR");
                }}
                onVoiceInput={handleTextPasted}
                onAudioTranscribe={async (audioBlob) => await transcribeAudioWithProvider(audioBlob, settings)}
              />
            )}

            {/* ── Previewing: show input + solve buttons ──────────── */}
            {appState === "PREVIEWING" && (
              <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col gap-4">
                  <div className="studio-panel neo-border p-6 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <span className="patch px-4 py-1.5 text-[10px]">Review Request</span>
                      </div>
                      <div className="shrink-0 flex items-center justify-end border-t lg:border-t-0 border-(--aqs-ink)/5 pt-4 lg:pt-0">
                        <div className="flex flex-col gap-2 no-print sm:flex-row sm:items-center">
                          <label
                            htmlFor="preview-subject-select"
                            className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400"
                          >
                            Subject
                          </label>
                          <div className="relative">
                            <select
                              id="preview-subject-select"
                              value={subject}
                              onChange={(event) => setSubject(event.target.value)}
                              className="select-themed appearance-none rounded-full border border-(--aqs-ink)/10 bg-white/92 px-4 py-3 pr-12 text-sm font-semibold text-(--aqs-ink) outline-none transition focus-visible:border-(--aqs-accent) focus-visible:ring-4 focus-visible:ring-[rgba(122,31,52,0.14)] dark:border-white/10 dark:bg-slate-950 dark:text-white"
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
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    <InputPreview
                      imagePreviewUrl={imagePreviewUrl}
                      textInput={textInput}
                      onTextChange={updateDraftText}
                      onSolve={handleSolve}
                      onClear={resetAll}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Loading spinner ──────────────────────────────────── */}
            {appState === "LOADING" && (
              <div className="flex-1 min-h-0">
                <LoadingState />
              </div>
            )}

            {/* ── Error message ────────────────────────────────────── */}
            {appState === "ERROR" && errorMsg && (
              <div className="flex-1 min-h-0">
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
              </div>
            )}

            {/* ── Solved: study workspace ──────────────────────────── */}
            {appState === "SOLVED" && solution && (
              <Suspense fallback={<LoadingState />}>
                <SolveWorkspace
                  solution={solution}
                  hideAnswerByDefault={solutionHideAnswerDefault}
                  chatHistory={chatHistory}
                  isChatLoading={isChatLoading}
                  onSendChat={handleSendChat}
                  onRetryChat={handleRetryChat}
                  lastFollowUpQuestion={lastFollowUpQuestion}
                  lastMode={lastMode}
                  canRetryEdit={hasDraftInput}
                  onCiteAi={() => setShowCitationModal(true)}
                  onSolveAgain={handleSolve}
                  onRetry={retryCurrentRequest}
                  onEditRequest={editCurrentRequest}
                  onClear={resetAll}
                  chatInputRef={chatInputRef}
                  chatPrefill={chatPrefill}
                  onConsumePrefill={() => setChatPrefill(null)}
                  starterPrompts={buildFollowUpStarters(solution, solutionHideAnswerDefault)}
                />
              </Suspense>
            )}

            {/* ── News view ─────────────────────────────────────── */}
            {appState === "NEWS" && (
              <DeskWorkspaceShell>
                <Suspense fallback={<LoadingState />}>
                  <NewsView
                    initialQuery={newsQuery}
                    onClose={hasBackgroundSolution ? handleReturnToPrevious : resetAll}
                    onReturn={hasBackgroundSolution ? handleReturnToPrevious : undefined}
                    hasBackgroundTask={backgroundTasks.some((task) => task.status === "completed")}
                    onAskMike={handleFeatureChat}
                  />
                </Suspense>
              </DeskWorkspaceShell>
            )}

            {/* ── Word of the Day view ─────────────────────────── */}
            {appState === "WOTD" && (
              <DeskWorkspaceShell>
                <Suspense fallback={<LoadingState />}>
                  <WordOfTheDay
                    initialView={dailyDeskView}
                    onClose={hasBackgroundSolution ? handleReturnToPrevious : resetAll}
                    onReturn={hasBackgroundSolution ? handleReturnToPrevious : undefined}
                    onAskMike={handleFeatureChat}
                  />
                </Suspense>
              </DeskWorkspaceShell>
            )}
          </div>
        </main>
      </div>

      <PwaNotice
        isOffline={isOffline}
        needRefresh={needRefresh}
        offlineReady={offlineReady}
        onRefresh={() => void handleRefreshPwa()}
        onDismissOfflineReady={() => setOfflineReady(false)}
        onDismissRefresh={() => setNeedRefresh(false)}
      />
    </div>
  );
}

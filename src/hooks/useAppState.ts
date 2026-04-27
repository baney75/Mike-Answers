import { useState, useCallback } from "react";
import type {
  AppState,
  SolveMode,
  ChatMessage,
  HistoryItem,
  BackgroundTask,
  SavedState,
  OriginalQuestionContext,
  ProviderId,
} from "../types";
import type { InstallPromptEvent } from "../services/pwa";

type DailyDeskView = "overview" | "word" | "verse" | "news";

/**
 * Complete state management hook for App.tsx
 * Handles all 28 state variables from the main component
 */
export function useAppState() {
  // Core app state
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<Exclude<SolveMode, "research">>("fast");

  // Input state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState<string | null>(null);
  const [subject, setSubject] = useState("Auto-detect");

  // UI state
  const [showSetup, setShowSetup] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Solution state
  const [solution, setSolution] = useState<string | null>(null);
  const [solutionHideAnswerDefault, setSolutionHideAnswerDefault] = useState(false);
  const [lastResolvedProviderId, setLastResolvedProviderId] = useState<ProviderId>("gemini");
  const [lastResolvedModel, setLastResolvedModel] = useState<string | undefined>(undefined);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<{ id: number; text: string } | null>(null);

  // PWA state
  const [installPromptEvent, setInstallPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [standalonePwa, setStandalonePwa] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Feature state
  const [newsQuery, setNewsQuery] = useState("");
  const [dailyDeskView, setDailyDeskView] = useState<DailyDeskView>("overview");

  // Background state
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [savedState, setSavedState] = useState<SavedState | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  // State transitions
  const toIdle = useCallback(() => {
    setAppState("IDLE");
    setErrorMsg(null);
    setSolution(null);
    setChatHistory([]);
    setSavedState(null);
    setBackgroundTasks([]);
  }, []);

  const toPreviewing = useCallback(() => {
    setAppState("PREVIEWING");
  }, []);

  const toLoading = useCallback(() => {
    setAppState("LOADING");
    setErrorMsg(null);
  }, []);

  const toSolved = useCallback(() => {
    setAppState("SOLVED");
    setIsReturning(false);
  }, []);

  const toError = useCallback((message: string) => {
    setAppState("ERROR");
    setErrorMsg(message);
  }, []);

  const toNews = useCallback(() => {
    setAppState("NEWS");
  }, []);

  const toWOTD = useCallback(() => {
    setAppState("WOTD");
  }, []);

  // Clear all input state
  const clearInput = useCallback(() => {
    setImageFile(null);
    setTextInput(null);
    setSubject("Auto-detect");
  }, []);

  // Save state for later restoration
  const saveCurrentState = useCallback((state: SavedState) => {
    setSavedState(state);
  }, []);

  // Restore saved state
  const restoreSavedState = useCallback((): SavedState | null => {
    const state = savedState;
    setSavedState(null);
    setIsReturning(true);
    return state;
  }, [savedState]);

  return {
    // State values
    appState,
    errorMsg,
    lastMode,
    imageFile,
    textInput,
    subject,
    showSetup,
    showTransferModal,
    showCitationModal,
    showHistory,
    solution,
    solutionHideAnswerDefault,
    lastResolvedProviderId,
    lastResolvedModel,
    lastGeneratedAt,
    chatHistory,
    isChatLoading,
    chatPrefill,
    installPromptEvent,
    standalonePwa,
    offlineReady,
    needRefresh,
    isOffline,
    newsQuery,
    dailyDeskView,
    backgroundTasks,
    savedState,
    isReturning,

    // State setters
    setAppState,
    setErrorMsg,
    setLastMode,
    setImageFile,
    setTextInput,
    setSubject,
    setShowSetup,
    setShowTransferModal,
    setShowCitationModal,
    setShowHistory,
    setSolution,
    setSolutionHideAnswerDefault,
    setLastResolvedProviderId,
    setLastResolvedModel,
    setLastGeneratedAt,
    setChatHistory,
    setIsChatLoading,
    setChatPrefill,
    setInstallPromptEvent,
    setStandalonePwa,
    setOfflineReady,
    setNeedRefresh,
    setIsOffline,
    setNewsQuery,
    setDailyDeskView,
    setBackgroundTasks,
    setSavedState,
    setIsReturning,

    // Actions
    toIdle,
    toPreviewing,
    toLoading,
    toSolved,
    toError,
    toNews,
    toWOTD,
    clearInput,
    saveCurrentState,
    restoreSavedState,
  };
}

export default useAppState;

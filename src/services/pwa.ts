import { registerSW } from "virtual:pwa-register";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaLifecycleHandlers {
  onOfflineReady: () => void;
  onNeedRefresh: () => void;
  onRegisterError?: (error: unknown) => void;
}

export function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches;
}

export function registerInstallPrompt(onPromptReady: (event: InstallPromptEvent) => void) {
  const handler = (event: Event) => {
    event.preventDefault();
    onPromptReady(event as InstallPromptEvent);
  };

  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

export function registerPwaLifecycle(handlers: PwaLifecycleHandlers) {
  let intervalId: number | null = null;

  const updateServiceWorker = registerSW({
    immediate: true,
    onOfflineReady: handlers.onOfflineReady,
    onNeedRefresh: handlers.onNeedRefresh,
    onRegisterError: handlers.onRegisterError,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        intervalId = window.setInterval(() => {
          void registration.update();
        }, 30 * 60 * 1000);
      }
    },
  });

  return {
    updateServiceWorker,
    unregister() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    },
  };
}

export function subscribeNetworkStatus(onStatusChange: (isOffline: boolean) => void) {
  const handleOnline = () => onStatusChange(false);
  const handleOffline = () => onStatusChange(true);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

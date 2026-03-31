import { useEffect, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useAction, useMutation, useQuery } from "convex/react";

import App from "./App";
import { ClerkAuthControls } from "./ClerkAuthControls";
import { convexApi } from "./convexApi";
import type {
  HistoryController,
  HistoryItem,
  SecureBackendController,
  UserPreferencesSnapshot,
} from "./types";

export function ConnectedApp() {
  const { user, isSignedIn } = useUser();
  const queryArgs = isSignedIn ? {} : ("skip" as const);
  const remoteHistory = useQuery(convexApi.history.listMyHistory, queryArgs);
  const remotePreferences = useQuery(convexApi.preferences.getMyPreferences, queryArgs);
  const secureKeyStatus = useQuery(convexApi.providerKeys.getMyProviderKeyStatus, queryArgs);
  const upsertUser = useMutation(convexApi.users.upsert);
  const saveHistoryItem = useMutation(convexApi.history.addHistoryItem);
  const clearHistory = useMutation(convexApi.history.clearMyHistory);
  const savePreferences = useMutation(convexApi.preferences.saveMyPreferences);
  const storeProviderKey = useAction(convexApi.ai.storeProviderKey);
  const deleteProviderKey = useAction(convexApi.ai.deleteProviderKey);
  const solveText = useAction(convexApi.ai.solveText);
  const solveImage = useAction(convexApi.ai.solveImage);
  const chatWithTutor = useAction(convexApi.ai.chatWithTutor);
  const transcribeAudio = useAction(convexApi.ai.transcribeAudio);

  useEffect(() => {
    if (!isSignedIn || !user) {
      return;
    }

    void upsertUser({
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      displayName: user.fullName ?? user.username ?? undefined,
      imageUrl: user.imageUrl,
    });
  }, [isSignedIn, upsertUser, user]);

  const authState = useMemo(
    () => ({
      enabled: true,
      signedIn: Boolean(isSignedIn),
      displayName: user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Signed in",
      email: user?.primaryEmailAddress?.emailAddress ?? undefined,
      avatarUrl: user?.imageUrl,
      syncReady: Boolean(isSignedIn),
    }),
    [isSignedIn, user],
  );

  const historyController = useMemo<HistoryController>(
    () => ({
      items: (remoteHistory ?? []).map((item: any): HistoryItem => ({
        id: item._id ?? String(item.createdAt),
        timestamp: item.createdAt ?? Date.now(),
        solution: item.solution,
        type: "solve",
        hideAnswerByDefault: item.hideAnswerByDefault ?? false,
        requestText: item.requestText ?? undefined,
        subject: item.subject ?? undefined,
        mode: item.mode ?? undefined,
        provider: item.provider ?? undefined,
        model: item.model ?? undefined,
      })),
      push: async (item: HistoryItem) => {
        await saveHistoryItem({
          requestText: item.requestText,
          solution: item.solution,
          subject: item.subject,
          mode: item.mode,
          provider: item.provider,
          model: item.model,
          hideAnswerByDefault: item.hideAnswerByDefault,
        });
      },
      clear: async () => {
        await clearHistory({});
      },
      label: "Synced with Convex",
    }),
    [clearHistory, remoteHistory, saveHistoryItem],
  );

  const preferencesSnapshot = useMemo<UserPreferencesSnapshot | null | undefined>(() => {
    if (remotePreferences === undefined) {
      return undefined;
    }

    if (!remotePreferences) {
      return null;
    }

    return {
      selectedProviderId: remotePreferences.selectedProviderId ?? "openrouter",
      preferredSubject: remotePreferences.preferredSubject ?? undefined,
      preferredLocation: remotePreferences.preferredLocation ?? undefined,
      onboardingCompleted: remotePreferences.onboardingCompleted ?? undefined,
      providers: remotePreferences.providers,
      updatedAt: remotePreferences.updatedAt ?? undefined,
    };
  }, [remotePreferences]);

  const secureBackend = useMemo<SecureBackendController | undefined>(() => {
    if (!isSignedIn || !secureKeyStatus) {
      return undefined;
    }

    return {
      enabled: true,
      keyStatus: secureKeyStatus,
      storeProviderKey: async (provider, apiKey) => {
        await storeProviderKey({ provider, apiKey });
      },
      removeProviderKey: async (provider) => {
        await deleteProviderKey({ provider });
      },
      solveText: async ({ provider, text, mode, subject, detailed, settings }) =>
        await solveText({
          provider,
          text,
          mode,
          subject,
          detailed,
          settings: {
            selectedProviderId: settings.selectedProviderId,
            preferredSubject: settings.preferredSubject,
            preferredLocation: settings.preferredLocation,
            onboardingCompleted: settings.onboardingCompleted,
            providers: {
              gemini: settings.providers.gemini,
              openrouter: settings.providers.openrouter,
              minimax: settings.providers.minimax,
              custom_openai: settings.providers.custom_openai,
            },
          },
        }),
      solveImage: async ({ provider, base64Image, mode, subject, detailed, settings }) =>
        await solveImage({
          provider,
          base64Image,
          mode,
          subject,
          detailed,
          settings: {
            selectedProviderId: settings.selectedProviderId,
            preferredSubject: settings.preferredSubject,
            preferredLocation: settings.preferredLocation,
            onboardingCompleted: settings.onboardingCompleted,
            providers: {
              gemini: settings.providers.gemini,
              openrouter: settings.providers.openrouter,
              minimax: settings.providers.minimax,
              custom_openai: settings.providers.custom_openai,
            },
          },
        }),
      chat: async ({ provider, history, message, originalQuestion, settings }) =>
        await chatWithTutor({
          provider,
          history,
          message,
          originalQuestion,
          settings: {
            selectedProviderId: settings.selectedProviderId,
            preferredSubject: settings.preferredSubject,
            preferredLocation: settings.preferredLocation,
            onboardingCompleted: settings.onboardingCompleted,
            providers: {
              gemini: settings.providers.gemini,
              openrouter: settings.providers.openrouter,
              minimax: settings.providers.minimax,
              custom_openai: settings.providers.custom_openai,
            },
          },
        }),
      transcribeAudio: async ({ provider, audioBase64, mimeType, settings }) =>
        await transcribeAudio({
          provider,
          audioBase64,
          mimeType,
          settings: {
            selectedProviderId: settings.selectedProviderId,
            preferredSubject: settings.preferredSubject,
            preferredLocation: settings.preferredLocation,
            onboardingCompleted: settings.onboardingCompleted,
            providers: {
              gemini: settings.providers.gemini,
              openrouter: settings.providers.openrouter,
              minimax: settings.providers.minimax,
              custom_openai: settings.providers.custom_openai,
            },
          },
        }),
    };
  }, [
    chatWithTutor,
    deleteProviderKey,
    isSignedIn,
    secureKeyStatus,
    solveImage,
    solveText,
    storeProviderKey,
    transcribeAudio,
  ]);

  if (!isSignedIn) {
    return <App authState={authState} accountControls={<ClerkAuthControls />} />;
  }

  return (
    <App
      authState={authState}
      accountControls={<ClerkAuthControls />}
      externalHistory={historyController}
      remotePreferences={preferencesSnapshot}
      secureBackend={secureBackend}
      onPreferencesChange={async (snapshot) => {
        await savePreferences({
          selectedProviderId: snapshot.selectedProviderId,
          preferredSubject: snapshot.preferredSubject,
          preferredLocation: snapshot.preferredLocation,
          onboardingCompleted: snapshot.onboardingCompleted,
          providers: snapshot.providers,
        });
      }}
    />
  );
}

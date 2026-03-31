import { makeFunctionReference } from "convex/server";
import type { ProviderId, UserPreferencesSnapshot } from "./types";

export const convexApi = {
  users: {
    me: makeFunctionReference<"query">("users:me"),
    upsert: makeFunctionReference<
      "mutation",
      { email?: string; displayName?: string; imageUrl?: string }
    >("users:upsert"),
  },
  preferences: {
    getMyPreferences: makeFunctionReference<"query">("preferences:getMyPreferences"),
    saveMyPreferences: makeFunctionReference<
      "mutation",
      Omit<UserPreferencesSnapshot, "updatedAt">
    >("preferences:saveMyPreferences"),
  },
  providerKeys: {
    getMyProviderKeyStatus: makeFunctionReference<"query">("providerKeys:getMyProviderKeyStatus"),
  },
  history: {
    listMyHistory: makeFunctionReference<"query">("history:listMyHistory"),
    addHistoryItem: makeFunctionReference<
      "mutation",
      {
        requestText?: string;
        solution: string;
        subject?: string;
        mode?: string;
        provider?: string;
        model?: string;
        hideAnswerByDefault?: boolean;
      }
    >("history:addHistoryItem"),
    clearMyHistory: makeFunctionReference<"mutation">("history:clearMyHistory"),
  },
  ai: {
    storeProviderKey: makeFunctionReference<
      "action",
      { provider: ProviderId; apiKey: string }
    >("ai:storeProviderKey"),
    deleteProviderKey: makeFunctionReference<
      "action",
      { provider: ProviderId }
    >("ai:deleteProviderKey"),
    solveText: makeFunctionReference<
      "action",
      {
        provider: ProviderId;
        text: string;
        mode: "fast" | "deep";
        subject: string;
        detailed: boolean;
        settings: UserPreferencesSnapshot;
      }
    >("ai:solveText"),
    solveImage: makeFunctionReference<
      "action",
      {
        provider: ProviderId;
        base64Image: string;
        mode: "fast" | "deep";
        subject: string;
        detailed: boolean;
        settings: UserPreferencesSnapshot;
      }
    >("ai:solveImage"),
    chatWithTutor: makeFunctionReference<
      "action",
      {
        provider: ProviderId;
        history: Array<{ role: string; text: string }>;
        message: string;
        originalQuestion?: { text?: string; imageBase64?: string };
        settings: UserPreferencesSnapshot;
      }
    >("ai:chatWithTutor"),
    transcribeAudio: makeFunctionReference<
      "action",
      {
        provider: ProviderId;
        audioBase64: string;
        mimeType: string;
        settings: UserPreferencesSnapshot;
      }
    >("ai:transcribeAudio"),
  },
} as const;

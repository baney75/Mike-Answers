import { describe, expect, test } from "bun:test";

import {
  assembleTransferQrChunks,
  buildWorkspaceTransferBundle,
  createTransferQrChunks,
  decryptWorkspaceTransfer,
  parseTransferQrChunk,
  prepareWorkspaceTransfer,
} from "./workspaceTransfer";

describe("workspaceTransfer", () => {
  test("encrypts and decrypts a workspace bundle", async () => {
    const bundle = buildWorkspaceTransferBundle(
      {
        selectedProviderId: "gemini",
        preferredSubject: "Mathematics",
        preferredLocation: undefined,
        onboardingCompleted: true,
        providers: {
          gemini: {
            rememberKey: true,
            models: {
              fastModel: "gemini-2.5-flash-lite",
              deepModel: "gemini-2.5-pro",
              groundedModel: "gemini-2.5-flash",
              transcriptionModel: "gemini-2.5-flash-lite",
            },
            options: {},
            apiKey: "AIza-test",
          },
          openrouter: {
            rememberKey: false,
            baseUrl: "https://openrouter.ai/api/v1",
            models: { fastModel: "openrouter/free", deepModel: "openrouter/free" },
            options: { freeOnly: true },
            apiKey: "sk-or-test",
          },
          minimax: {
            rememberKey: false,
            baseUrl: "https://api.minimax.io/v1",
            models: { fastModel: "MiniMax-M2.7-highspeed", deepModel: "MiniMax-M2.7" },
            options: {},
            apiKey: "",
          },
          custom_openai: {
            rememberKey: false,
            baseUrl: "https://example.com/v1",
            models: { fastModel: "fast-model", deepModel: "deep-model" },
            options: {},
            apiKey: "",
          },
        },
      },
      [
        {
          id: "history-1",
          timestamp: Date.now(),
          solution: "A solved answer",
          chatHistory: [
            { role: "user", text: "Explain step 2" },
            { role: "tutor", text: "Step 2 isolates x." },
          ],
          requestText: "Solve 2x + 4 = 10",
          subject: "Mathematics",
          mode: "fast",
          provider: "gemini",
        },
      ],
    );

    const prepared = await prepareWorkspaceTransfer(bundle, "correct horse battery staple");
    const decrypted = await decryptWorkspaceTransfer(prepared.serialized, "correct horse battery staple");

    expect(decrypted.settings.providers.gemini.apiKey).toBe("AIza-test");
    expect(decrypted.settings.providers.openrouter.apiKey).toBe("sk-or-test");
    expect(decrypted.history[0]?.chatHistory?.[1]?.text).toBe("Step 2 isolates x.");
  });

  test("round-trips QR chunk assembly", () => {
    const chunks = createTransferQrChunks("x".repeat(2400), 500);
    const parsed = chunks.map((chunk) => parseTransferQrChunk(chunk));

    expect(parsed.every(Boolean)).toBe(true);
    expect(assembleTransferQrChunks(parsed.filter(Boolean) as NonNullable<(typeof parsed)[number]>[])).toBe("x".repeat(2400));
  });
});

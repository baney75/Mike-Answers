import { describe, expect, test } from "bun:test";

import {
  assembleTransferQrChunks,
  buildWorkspaceTransferBundle,
  createTransferQrChunks,
  decryptTransferString,
  decryptWorkspaceTransfer,
  encryptTransferString,
  parseTransferQrChunk,
  prepareWorkspaceTransfer,
} from "./workspaceTransfer";

const MINIMAL_PASSPHRASE = "correct horse battery staple";

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
          openai_compatible: {
            rememberKey: false,
            baseUrl: "https://api.openai.com/v1",
            models: { fastModel: "gpt-4.1-mini", deepModel: "gpt-4.1" },
            options: { presetId: "openai" },
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
          originalContext: {
            text: "Solve 2x + 4 = 10",
            imageBase64: "persisted-image-base64",
          },
          subject: "Mathematics",
          mode: "fast",
          provider: "gemini",
          model: "gemini-2.5-flash-lite",
        },
      ],
    );

    const prepared = await prepareWorkspaceTransfer(bundle, MINIMAL_PASSPHRASE);
    const decrypted = await decryptWorkspaceTransfer(prepared.serialized, MINIMAL_PASSPHRASE);

    expect(decrypted.settings.providers.gemini.apiKey).toBe("AIza-test");
    expect(decrypted.settings.providers.openrouter.apiKey).toBe("sk-or-test");
    expect(decrypted.history[0]?.chatHistory?.[1]?.text).toBe("Step 2 isolates x.");
    expect(decrypted.history[0]?.originalContext?.imageBase64).toBe("persisted-image-base64");
    expect(decrypted.history[0]?.provider).toBe("gemini");
    expect(decrypted.history[0]?.model).toBe("gemini-2.5-flash-lite");
  });

  test("round-trips QR chunk assembly", () => {
    const chunks = createTransferQrChunks("x".repeat(2400), 500);
    const parsed = chunks.map((chunk) => parseTransferQrChunk(chunk));

    expect(parsed.every(Boolean)).toBe(true);
    expect(assembleTransferQrChunks(parsed.filter(Boolean) as NonNullable<(typeof parsed)[number]>[])).toBe("x".repeat(2400));
  });

  test("rejects wrong passphrase", async () => {
    const encrypted = await encryptTransferString("secret data", MINIMAL_PASSPHRASE);
    await expect(decryptTransferString(JSON.stringify(encrypted), "wrong passphrase 123")).rejects.toThrow();
  });

  test("rejects corrupted ciphertext", async () => {
    const encrypted = await encryptTransferString("secret data", MINIMAL_PASSPHRASE);
    const corrupted = { ...encrypted, ciphertext: "AAAA" + encrypted.ciphertext.slice(4) };
    await expect(decryptTransferString(JSON.stringify(corrupted), MINIMAL_PASSPHRASE)).rejects.toThrow();
  });

  test("rejects version mismatch", async () => {
    const encrypted = await encryptTransferString("secret data", MINIMAL_PASSPHRASE);
    const badVersion = { ...encrypted, version: 999 };
    await expect(decryptTransferString(JSON.stringify(badVersion), MINIMAL_PASSPHRASE)).rejects.toThrow("Unsupported transfer package version");
  });

  test("rejects short passphrase", async () => {
    await expect(encryptTransferString("data", "short")).rejects.toThrow("at least 12 characters");
  });

  test("rejects passphrase without non-alpha character", async () => {
    await expect(encryptTransferString("data", "twelvecharacter")).rejects.toThrow("at least one number or symbol");
  });

  test("rejects empty QR chunk assembly", () => {
    // @ts-expect-error: toThrow exists in Bun runtime but not in type defs
    expect(() => { assembleTransferQrChunks([]); }).toThrow();
  });

  test("rejects inconsistent QR chunk assembly", () => {
    const chunks = createTransferQrChunks("hello", 900);
    const parsed1 = parseTransferQrChunk(chunks[0]);
    const chunks2 = createTransferQrChunks("world", 900);
    const parsed2 = parseTransferQrChunk(chunks2[0]);
    // @ts-expect-error: toThrow exists in Bun runtime but not in type defs
    expect(() => { assembleTransferQrChunks([parsed1!, parsed2!]); }).toThrow();
  });
});

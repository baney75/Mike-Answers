import type { HistoryItem, ProviderId, RuntimeAISettings } from "../types";

const TRANSFER_VERSION = 1;
const QR_PREFIX = "aqs-sync-v1";
const TRANSFER_AAD = new TextEncoder().encode("aqs-workspace-transfer-v1");
const PBKDF2_ITERATIONS = 250_000;
const DEFAULT_QR_CHUNK_SIZE = 900;
const MAX_TRANSFER_HISTORY_ITEMS = 20;

export interface WorkspaceTransferBundle {
  version: 1;
  exportedAt: number;
  settings: RuntimeAISettings;
  history: HistoryItem[];
}

export interface EncryptedTransferPayload {
  version: 1;
  algorithm: "AES-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface PreparedTransfer {
  payload: EncryptedTransferPayload;
  serialized: string;
  qrChunks: string[];
}

export interface ParsedQrChunk {
  transferId: string;
  index: number;
  total: number;
  payload: string;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function compressText(text: string) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") {
    return bytes;
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompressToText(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    return new TextDecoder().decode(bytes);
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function deriveTransferKey(passphrase: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function sanitizeHistoryItems(history: HistoryItem[]) {
  return history
    .slice(0, MAX_TRANSFER_HISTORY_ITEMS)
    .map((item) => ({
      ...item,
      chatHistory: item.chatHistory?.slice(-24) ?? [],
    }));
}

export function buildWorkspaceTransferBundle(settings: RuntimeAISettings, history: HistoryItem[]): WorkspaceTransferBundle {
  const copiedSettings: RuntimeAISettings = structuredClone(settings);
  return {
    version: TRANSFER_VERSION,
    exportedAt: Date.now(),
    settings: copiedSettings,
    history: sanitizeHistoryItems(history),
  };
}

export async function encryptTransferString(raw: string, passphrase: string) {
  const trimmed = passphrase.trim();
  if (trimmed.length < 12) {
    throw new Error("Use a transfer passphrase with at least 12 characters.");
  }

  if (!/[^a-zA-Z]/.test(trimmed)) {
    throw new Error("Add at least one number or symbol to the transfer passphrase.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await compressText(raw);
  const key = await deriveTransferKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: TRANSFER_AAD,
    },
    key,
    plaintext,
  );

  const payload: EncryptedTransferPayload = {
    version: TRANSFER_VERSION,
    algorithm: "AES-GCM",
    iterations: PBKDF2_ITERATIONS,
    salt: arrayBufferToBase64Url(salt.buffer),
    iv: arrayBufferToBase64Url(iv.buffer),
    ciphertext: arrayBufferToBase64Url(ciphertext),
  };

  return payload;
}

export async function decryptTransferString(serialized: string, passphrase: string) {
  const payload = JSON.parse(serialized) as EncryptedTransferPayload;

  if (payload.version !== TRANSFER_VERSION) {
    throw new Error("Unsupported transfer package version.");
  }

  const salt = base64UrlToUint8Array(payload.salt);
  const iv = base64UrlToUint8Array(payload.iv);
  const ciphertext = base64UrlToUint8Array(payload.ciphertext);
  const key = await deriveTransferKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: TRANSFER_AAD,
    },
    key,
    ciphertext,
  );

  return await decompressToText(new Uint8Array(plaintext));
}

export async function prepareWorkspaceTransfer(bundle: WorkspaceTransferBundle, passphrase: string) {
  const payload = await encryptTransferString(JSON.stringify(bundle), passphrase);
  const serialized = JSON.stringify(payload);
  return {
    payload,
    serialized,
    qrChunks: createTransferQrChunks(serialized),
  } satisfies PreparedTransfer;
}

export async function decryptWorkspaceTransfer(serialized: string, passphrase: string) {
  const json = await decryptTransferString(serialized, passphrase);
  return JSON.parse(json) as WorkspaceTransferBundle;
}

export function createTransferQrChunks(serialized: string, chunkSize = DEFAULT_QR_CHUNK_SIZE) {
  const transferId = arrayBufferToBase64Url(crypto.getRandomValues(new Uint8Array(8)).buffer).slice(0, 10);
  const chunks: string[] = [];

  for (let index = 0; index < serialized.length; index += chunkSize) {
    chunks.push(serialized.slice(index, index + chunkSize));
  }

  return chunks.map(
    (chunk, index) => `${QR_PREFIX}|${transferId}|${index + 1}|${chunks.length}|${chunk}`,
  );
}

export function parseTransferQrChunk(value: string): ParsedQrChunk | null {
  const parts = value.split("|");
  if (parts.length < 5 || parts[0] !== QR_PREFIX) {
    return null;
  }

  const [, transferId, indexValue, totalValue, ...rest] = parts;
  const index = Number(indexValue);
  const total = Number(totalValue);
  const payload = rest.join("|");

  if (!transferId || !Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
    return null;
  }

  return { transferId, index, total, payload };
}

export function assembleTransferQrChunks(chunks: ParsedQrChunk[]) {
  if (chunks.length === 0) {
    throw new Error("No QR chunks captured yet.");
  }

  const transferId = chunks[0].transferId;
  const total = chunks[0].total;

  if (!chunks.every((chunk) => chunk.transferId === transferId && chunk.total === total)) {
    throw new Error("QR chunks belong to different transfers.");
  }

  if (chunks.length !== total) {
    throw new Error(`Missing QR chunks. Captured ${chunks.length} of ${total}.`);
  }

  const ordered = [...chunks].sort((a, b) => a.index - b.index);
  return ordered.map((chunk) => chunk.payload).join("");
}

export function extractTransferSecrets(settings: RuntimeAISettings) {
  const secrets = {} as Record<ProviderId, string>;

  (Object.keys(settings.providers) as ProviderId[]).forEach((providerId) => {
    secrets[providerId] = settings.providers[providerId].apiKey?.trim() ?? "";
  });

  return secrets;
}

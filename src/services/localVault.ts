const DB_NAME = "aqs-local-vault";
const DB_VERSION = 1;
const STORE_NAME = "keys";
const MASTER_KEY_ID = "provider-secrets-v1";
const SECRET_AAD = new TextEncoder().encode("aqs-local-secret-v1");

interface EncryptedSecretPayload {
  version: 1;
  iv: string;
  ciphertext: string;
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

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local vault."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

async function getStore(mode: IDBTransactionMode) {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);
  return { db, transaction, store };
}

async function getOrCreateMasterKey() {
  const { db, store } = await getStore("readonly");

  try {
    const existing = await requestToPromise<CryptoKey | undefined>(store.get(MASTER_KEY_ID));
    if (existing) {
      return existing;
    }
  } finally {
    db.close();
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  const writable = await getStore("readwrite");
  try {
    await requestToPromise(writable.store.put(key, MASTER_KEY_ID));
    return key;
  } finally {
    writable.db.close();
  }
}

export async function encryptSecretForStorage(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) {
    return "";
  }

  const key = await getOrCreateMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: SECRET_AAD,
    },
    key,
    new TextEncoder().encode(trimmed),
  );

  const payload: EncryptedSecretPayload = {
    version: 1,
    iv: arrayBufferToBase64Url(iv.buffer),
    ciphertext: arrayBufferToBase64Url(ciphertext),
  };

  return JSON.stringify(payload);
}

export async function decryptSecretFromStorage(stored: string) {
  const trimmed = stored.trim();
  if (!trimmed) {
    return "";
  }

  let payload: EncryptedSecretPayload;
  try {
    payload = JSON.parse(trimmed) as EncryptedSecretPayload;
  } catch {
    // Legacy plain-text secret. The next save cycle will re-encrypt it.
    return trimmed;
  }

  if (payload.version !== 1) {
    throw new Error("Unsupported encrypted secret version.");
  }

  const key = await getOrCreateMasterKey();
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64UrlToUint8Array(payload.iv),
      additionalData: SECRET_AAD,
    },
    key,
    base64UrlToUint8Array(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

import { useEffect, useId, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Camera, Download, QrCode, RefreshCw, ShieldCheck, Smartphone, Upload, X } from "lucide-react";
import { PeerSyncPanel } from "./PeerSyncPanel";
import type { PeerSyncPreparedSignal } from "../hooks/usePeerWorkspaceSync";

import type { WorkspaceTransferBundle } from "../services/workspaceTransfer";
import {
  assembleTransferQrChunks,
  decryptWorkspaceTransfer,
  parseTransferQrChunk,
  prepareWorkspaceTransfer,
  type ParsedQrChunk,
} from "../services/workspaceTransfer";

interface WorkspaceTransferModalProps {
  open: boolean;
  bundle: WorkspaceTransferBundle;
  onClose: () => void;
  onImportBundle: (bundle: WorkspaceTransferBundle) => void | Promise<void>;
  peerSync: {
    connectionState: RTCPeerConnectionState;
    preparedSignal: PeerSyncPreparedSignal | null;
    error: string | null;
    onStartHost: (passphrase: string) => Promise<void>;
    onJoinFromOffer: (encryptedSignal: string, passphrase: string) => Promise<void>;
    onFinishHost: (encryptedSignal: string, passphrase: string) => Promise<void>;
    onCloseSession: () => void;
  };
}

type TransferTab = "export" | "import" | "live";

export function WorkspaceTransferModal({
  open,
  bundle,
  onClose,
  onImportBundle,
  peerSync,
}: WorkspaceTransferModalProps) {
  const [tab, setTab] = useState<TransferTab>("export");
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportPassphraseConfirm, setExportPassphraseConfirm] = useState("");
  const [preparedTransfer, setPreparedTransfer] = useState<Awaited<ReturnType<typeof prepareWorkspaceTransfer>> | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [qrIndex, setQrIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [importPayloadText, setImportPayloadText] = useState("");
  const [importChunks, setImportChunks] = useState<Record<number, ParsedQrChunk>>({});
  const [importTransferId, setImportTransferId] = useState<string | null>(null);
  const [importTotalChunks, setImportTotalChunks] = useState(0);
  const [scannerActive, setScannerActive] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const scannerId = useId().replace(/:/g, "-");
  const scannerRef = useRef<{ stop: () => Promise<unknown>; clear: () => unknown } | null>(null);
  const importTransferIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreparedTransfer(null);
      setTransferError(null);
      setQrIndex(0);
      setQrDataUrl(null);
      setImportPassphrase("");
      setImportPayloadText("");
      setImportChunks({});
      setImportTransferId(null);
      setImportTotalChunks(0);
      setImportStatus(null);
      setScannerActive(false);
      importTransferIdRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!preparedTransfer) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(preparedTransfer.qrChunks[qrIndex], {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
      color: {
        dark: "#2f2927ff",
        light: "#ffffffff",
      },
    }).then((url) => {
      if (!cancelled) {
        setQrDataUrl(url);
      }
    }).catch((error) => {
      if (!cancelled) {
        setTransferError(error instanceof Error ? error.message : "Could not render QR code.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [preparedTransfer, qrIndex]);

  useEffect(() => {
    if (!preparedTransfer || !autoAdvance || preparedTransfer.qrChunks.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setQrIndex((current) => (current + 1) % preparedTransfer.qrChunks.length);
    }, 1200);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoAdvance, preparedTransfer]);

  useEffect(() => {
    if (!scannerActive || !open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(scannerId, false);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            const parsed = parseTransferQrChunk(decodedText);
            if (!parsed || cancelled) {
              return;
            }

            setImportChunks((current) => {
              if ((importTransferIdRef.current && parsed.transferId !== importTransferIdRef.current) || current[parsed.index]) {
                return current;
              }

              const next = { ...current, [parsed.index]: parsed };
              const nextCount = Object.keys(next).length;
              importTransferIdRef.current = parsed.transferId;
              setImportTransferId(parsed.transferId);
              setImportTotalChunks(parsed.total);
              setImportStatus(`Captured ${nextCount} of ${parsed.total} QR frames.`);

              if (nextCount === parsed.total) {
                void scanner.stop().catch(() => null).finally(() => {
                  void Promise.resolve(scanner.clear()).catch(() => null);
                  scannerRef.current = null;
                  setScannerActive(false);
                  setImportStatus(`Captured all ${parsed.total} QR frames. Enter the passphrase to import.`);
                });
              }

              return next;
            });
          },
          () => {
            // Camera scan misses are noisy; ignore them.
          },
        );
      } catch (error) {
        if (!cancelled) {
          setImportStatus(error instanceof Error ? error.message : "Could not start camera scanner.");
          setScannerActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        void scanner.stop().catch(() => null).finally(() => {
          void Promise.resolve(scanner.clear()).catch(() => null);
          scannerRef.current = null;
        });
      }
    };
  }, [open, scannerActive, scannerId]);

  const backupHref = useMemo(() => {
    if (!preparedTransfer) {
      return null;
    }

    return URL.createObjectURL(new Blob([preparedTransfer.serialized], { type: "application/json" }));
  }, [preparedTransfer]);

  useEffect(() => {
    return () => {
      if (backupHref) {
        URL.revokeObjectURL(backupHref);
      }
    };
  }, [backupHref]);

  if (!open) {
    return null;
  }

  const scannedChunkCount = Object.keys(importChunks).length;

  async function handlePrepareTransfer() {
    setTransferError(null);

    if (exportPassphrase !== exportPassphraseConfirm) {
      setTransferError("The transfer passphrases do not match.");
      return;
    }

    try {
      const next = await prepareWorkspaceTransfer(bundle, exportPassphrase);
      setPreparedTransfer(next);
      setQrIndex(0);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Could not prepare the encrypted transfer package.");
    }
  }

  async function handleImportTransfer() {
    setTransferError(null);

    try {
      const payload = importPayloadText.trim()
        ? importPayloadText.trim()
        : assembleTransferQrChunks(Object.values(importChunks));
      const nextBundle = await decryptWorkspaceTransfer(payload, importPassphrase);
      await onImportBundle(nextBundle);
      setImportStatus("Imported this workspace successfully.");
      onClose();
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Could not import this transfer package.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Secure device transfer"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-(--aqs-ink)/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,236,0.96))] shadow-[0_32px_100px_rgba(31,23,28,0.3)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(29,18,26,0.94))]">
        <div className="flex items-start justify-between gap-4 border-b border-(--aqs-ink)/10 px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              Secure device transfer
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-(--aqs-ink) dark:text-white">
              Move this workspace between devices without a server.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              QR frames only carry an encrypted bundle. The receiving device still needs the passphrase to unlock settings, recent conversations, and saved provider keys.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setTab("export")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === "export"
                    ? "bg-(--aqs-accent) text-white"
                    : "border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                }`}
              >
                <QrCode className="mr-2 inline h-4 w-4" /> Export QR transfer
              </button>
              <button
                type="button"
                onClick={() => setTab("import")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === "import"
                    ? "bg-(--aqs-accent) text-white"
                    : "border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                }`}
              >
                <Upload className="mr-2 inline h-4 w-4" /> Import from another device
              </button>
              <button
                type="button"
                onClick={() => setTab("live")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === "live"
                    ? "bg-(--aqs-accent) text-white"
                    : "border border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                }`}
              >
                <Smartphone className="mr-2 inline h-4 w-4" /> Live peer sync
              </button>
            </div>

            {tab === "export" ? (
              <div className="space-y-5 rounded-[1.6rem] border border-(--aqs-ink)/10 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/58">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Transfer passphrase
                    </span>
                    <input
                      type="password"
                      value={exportPassphrase}
                      onChange={(event) => setExportPassphrase(event.target.value)}
                      placeholder="Use a strong passphrase"
                      className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Confirm passphrase
                    </span>
                    <input
                      type="password"
                      value={exportPassphraseConfirm}
                      onChange={(event) => setExportPassphraseConfirm(event.target.value)}
                      placeholder="Enter it again"
                      className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                </div>

                <div className="rounded-[1.35rem] border border-emerald-500/18 bg-emerald-50/85 px-4 py-4 text-sm leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-100">
                  <strong>Included:</strong> provider settings, encrypted API keys, and your recent solved sessions with follow-up chat snapshots.
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handlePrepareTransfer()}
                    className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white"
                  >
                    <ShieldCheck className="h-4 w-4" /> Generate encrypted transfer
                  </button>
                  {backupHref ? (
                    <a
                      href={backupHref}
                      download={`mike-transfer-${bundle.exportedAt}.json`}
                      className="inline-flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-5 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    >
                      <Download className="h-4 w-4" /> Download encrypted backup
                    </a>
                  ) : null}
                </div>

                {preparedTransfer ? (
                  <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950">
                      {qrDataUrl ? <img src={qrDataUrl} alt={`Transfer QR ${qrIndex + 1}`} className="h-72 w-72 rounded-xl" /> : <div className="h-72 w-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />}
                      <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">
                        Frame {qrIndex + 1} of {preparedTransfer.qrChunks.length}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
                        On the receiving device, open <strong>Import from another device</strong>, scan the QR frames, then enter the same passphrase.
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-(--aqs-ink) dark:text-white">
                        <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} />
                        Auto-advance QR frames
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setQrIndex((current) => (current === 0 ? preparedTransfer.qrChunks.length - 1 : current - 1))}
                          className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        >
                          Previous frame
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrIndex((current) => (current + 1) % preparedTransfer.qrChunks.length)}
                          className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        >
                          Next frame
                        </button>
                      </div>
                      {preparedTransfer.qrChunks.length > 20 ? (
                        <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-100">
                          This workspace is large. QR transfer still works, but the encrypted backup file will be faster if both devices can exchange a file safely.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : tab === "import" ? (
              <div className="space-y-5 rounded-[1.6rem] border border-(--aqs-ink)/10 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/58">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Transfer passphrase
                  </span>
                  <input
                    type="password"
                    value={importPassphrase}
                    onChange={(event) => setImportPassphrase(event.target.value)}
                    placeholder="Enter the sender's passphrase"
                    className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setImportChunks({});
                      setImportTransferId(null);
                      setImportTotalChunks(0);
                      setImportStatus("Point the camera at the exporting device and keep scanning until all frames are captured.");
                      importTransferIdRef.current = null;
                      setScannerActive(true);
                    }}
                    disabled={scannerActive}
                    className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    <Camera className="h-4 w-4" /> {scannerActive ? "Scanning…" : "Start QR scan"}
                  </button>
                  {scannerActive ? (
                    <button
                      type="button"
                      onClick={() => setScannerActive(false)}
                      className="rounded-full border border-(--aqs-ink)/10 bg-white px-4 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
                    >
                      Stop camera
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950">
                    <div id={scannerId} className="min-h-[280px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[1.35rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
                      {importStatus ?? "Scan the transfer QR frames or paste an encrypted backup below."}
                    </div>
                    <div className="rounded-[1.25rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300">
                      Captured {scannedChunkCount} of {importTotalChunks || "?"} QR frames.
                    </div>
                    <label className="block space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Or paste encrypted backup text
                      </span>
                      <textarea
                        value={importPayloadText}
                        onChange={(event) => setImportPayloadText(event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleImportTransfer()}
                      disabled={
                        !importPassphrase.trim() ||
                        (!importPayloadText.trim() && (importTotalChunks === 0 || scannedChunkCount !== importTotalChunks))
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white disabled:opacity-45"
                    >
                      <Smartphone className="h-4 w-4" /> Import workspace
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <PeerSyncPanel
                connectionState={peerSync.connectionState}
                preparedSignal={peerSync.preparedSignal}
                error={peerSync.error}
                onStartHost={peerSync.onStartHost}
                onJoinFromOffer={peerSync.onJoinFromOffer}
                onFinishHost={peerSync.onFinishHost}
                onCloseSession={peerSync.onCloseSession}
              />
            )}

            {transferError ? (
              <div className="rounded-[1.25rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-950/25 dark:text-rose-200">
                {transferError}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.6rem] border border-(--aqs-ink)/10 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/58">
              <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">What moves</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>Provider defaults and subject preferences</li>
                <li>Encrypted saved API keys</li>
                <li>Recent solved sessions and follow-up chat snapshots</li>
              </ul>
            </div>
            <div className="rounded-[1.6rem] border border-emerald-500/18 bg-emerald-50/85 p-5 text-sm leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-100">
              <strong>Security note:</strong> QR frames display only ciphertext. Anyone who photographs the QR still needs the transfer passphrase to unlock the workspace.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

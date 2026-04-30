import { useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import { Camera, Link2, Lock, Smartphone, Upload } from "lucide-react";

import type { PeerSyncPreparedSignal } from "../hooks/usePeerWorkspaceSync";
import { assembleTransferQrChunks, parseTransferQrChunk, type ParsedQrChunk } from "../services/workspaceTransfer";

interface PeerSyncPanelProps {
  connectionState: RTCPeerConnectionState;
  preparedSignal: PeerSyncPreparedSignal | null;
  error: string | null;
  onStartHost: (passphrase: string) => Promise<void>;
  onJoinFromOffer: (encryptedSignal: string, passphrase: string) => Promise<void>;
  onFinishHost: (encryptedSignal: string, passphrase: string) => Promise<void>;
  onCloseSession: () => void;
}

type ScanTarget = "offer" | "answer" | null;

export function PeerSyncPanel({
  connectionState,
  preparedSignal,
  error,
  onStartHost,
  onJoinFromOffer,
  onFinishHost,
  onCloseSession,
}: PeerSyncPanelProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<ScanTarget>(null);
  const [scannedChunks, setScannedChunks] = useState<Record<number, ParsedQrChunk>>({});
  const [scannedTotal, setScannedTotal] = useState(0);
  const [qrIndex, setQrIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const scannerId = useId().replace(/:/g, "-");
  const scannerRef = useRef<{ stop: () => Promise<unknown>; clear: () => unknown } | null>(null);
  const transferIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!preparedSignal) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(preparedSignal.qrChunks[qrIndex], {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 300,
      color: { dark: "#2f2927ff", light: "#ffffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setStatus("Could not render the QR frame.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preparedSignal, qrIndex]);

  useEffect(() => {
    if (!preparedSignal) {
      return;
    }

    if (preparedSignal.kind === "offer") {
      setOfferText(preparedSignal.encrypted);
    } else {
      setAnswerText(preparedSignal.encrypted);
    }
  }, [preparedSignal]);

  useEffect(() => {
    if (!preparedSignal || preparedSignal.qrChunks.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setQrIndex((current) => (current + 1) % preparedSignal.qrChunks.length);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [preparedSignal]);

  useEffect(() => {
    if (!scanTarget) {
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

            setScannedChunks((current) => {
              if ((transferIdRef.current && parsed.transferId !== transferIdRef.current) || current[parsed.index]) {
                return current;
              }

              const next = { ...current, [parsed.index]: parsed };
              const nextCount = Object.keys(next).length;
              transferIdRef.current = parsed.transferId;
              setScannedTotal(parsed.total);
              setStatus(`Captured ${nextCount} of ${parsed.total} pairing frames.`);

              if (nextCount === parsed.total) {
                const assembled = assembleTransferQrChunks(Object.values(next));
                if (scanTarget === "offer") {
                  setOfferText(assembled);
                } else {
                  setAnswerText(assembled);
                }

                void scanner.stop().catch(() => null).finally(() => {
                  void Promise.resolve(scanner.clear()).catch(() => null);
                  scannerRef.current = null;
                  setScanTarget(null);
                  setStatus(`Captured all ${parsed.total} pairing frames.`);
                });
              }

              return next;
            });
          },
          () => {},
        );
      } catch (scanError) {
        if (!cancelled) {
          setStatus(scanError instanceof Error ? scanError.message : "Could not start pairing scanner.");
          setScanTarget(null);
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
  }, [scanTarget, scannerId]);

  async function startHost() {
    if (passphrase !== confirmPassphrase) {
      setStatus("The pairing passphrases do not match.");
      return;
    }

    setStatus("Generating encrypted host offer…");
    setQrIndex(0);
    await onStartHost(passphrase);
    setStatus("Scan this host offer from the other device, then scan its answer back here.");
  }

  async function joinFromOffer() {
    setStatus("Creating encrypted answer…");
    setQrIndex(0);
    await onJoinFromOffer(offerText.trim(), passphrase);
    setStatus("Now show this answer QR to the host device.");
  }

  async function finishHost() {
    setStatus("Finishing peer sync handshake…");
    await onFinishHost(answerText.trim(), passphrase);
    setStatus("Handshake complete. Data channel encrypted — workspace sync will begin automatically.");
  }

  return (
    <div className="space-y-5 rounded-[1.6rem] border border-(--aqs-ink)/10 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/58">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pairing passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Use the same passphrase on both devices"
            className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Confirm passphrase</span>
          <input
            type="password"
            value={confirmPassphrase}
            onChange={(event) => setConfirmPassphrase(event.target.value)}
            placeholder="Enter it again"
            className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white"
          />
        </label>
      </div>

      <div className="rounded-[1.35rem] border border-emerald-500/18 bg-emerald-50/85 px-4 py-4 text-sm leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-100">
        <strong>Live sync:</strong> once paired, both open devices exchange workspace snapshots directly over an encrypted WebRTC data channel. No app server stores the sync traffic.
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void startHost()} className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white">
          <Link2 className="h-4 w-4" /> Start this device as host
        </button>
        <button
          type="button"
          onClick={() => {
            setScannedChunks({});
            setScannedTotal(0);
            transferIdRef.current = null;
            setScanTarget("offer");
            setStatus("Scan the host offer from the other device.");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-5 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
        >
          <Camera className="h-4 w-4" /> Scan host offer
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-(--aqs-ink)/10 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950">
          {scanTarget ? (
            <div id={scannerId} className="min-h-[280px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900" />
          ) : qrDataUrl && preparedSignal ? (
            <div className="flex flex-col items-center gap-4">
              <img src={qrDataUrl} alt={`${preparedSignal.kind} qr`} className="h-72 w-72 rounded-xl" />
              <div className="text-sm font-semibold text-(--aqs-ink) dark:text-white">
                {preparedSignal.kind === "offer" ? "Host offer" : "Joiner answer"} frame {qrIndex + 1} of {preparedSignal.qrChunks.length}
              </div>
            </div>
          ) : (
            <div className="min-h-[280px] rounded-xl bg-slate-100 dark:bg-slate-900" />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
            {status ?? "Pair the two devices by scanning the host offer, then scanning the joiner answer back on the host."}
          </div>
          <div className="rounded-[1.25rem] border border-(--aqs-ink)/10 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300">
            {connectionState === "connected" ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <Lock className="h-3.5 w-3.5" /> <strong>Connected</strong> — end-to-end encrypted
              </span>
            ) : (
              <>Connection state: <strong>{connectionState}</strong></>
            )}
            {scannedTotal ? ` • Captured ${Object.keys(scannedChunks).length} of ${scannedTotal} pairing frames.` : ""}
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Encrypted host offer</span>
            <textarea value={offerText} onChange={(event) => setOfferText(event.target.value)} rows={4} className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void joinFromOffer()} disabled={!offerText.trim() || !passphrase.trim()} className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white disabled:opacity-45">
              <Smartphone className="h-4 w-4" /> Join from offer
            </button>
            <button
              type="button"
              onClick={() => {
                setScannedChunks({});
                setScannedTotal(0);
                transferIdRef.current = null;
                setScanTarget("answer");
                setStatus("Scan the answer back on the host device.");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-(--aqs-ink)/10 bg-white px-5 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white"
            >
              <Camera className="h-4 w-4" /> Scan answer on host
            </button>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Encrypted joiner answer</span>
            <textarea value={answerText} onChange={(event) => setAnswerText(event.target.value)} rows={4} className="w-full rounded-2xl border border-(--aqs-ink)/12 bg-white px-4 py-3 text-sm text-(--aqs-ink) outline-none transition dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void finishHost()} disabled={!answerText.trim() || !passphrase.trim()} className="inline-flex items-center gap-2 rounded-full border border-(--aqs-accent) bg-(--aqs-accent) px-5 py-2 text-sm font-semibold text-white disabled:opacity-45">
              <Upload className="h-4 w-4" /> Finish host pairing
            </button>
            <button type="button" onClick={onCloseSession} className="rounded-full border border-(--aqs-ink)/10 bg-white px-5 py-2 text-sm font-semibold text-(--aqs-ink) dark:border-white/10 dark:bg-slate-950 dark:text-white">
              Stop live sync
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-950/25 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

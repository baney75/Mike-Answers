import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PeerWorkspaceSyncSession, type PeerSyncSignal } from "../services/peerWorkspaceSync";
import {
  createTransferQrChunks,
  decryptTransferString,
  encryptTransferString,
  type WorkspaceTransferBundle,
} from "../services/workspaceTransfer";

export interface PeerSyncPreparedSignal {
  kind: "offer" | "answer";
  encrypted: string;
  qrChunks: string[];
}

export function usePeerWorkspaceSync(
  bundle: WorkspaceTransferBundle,
  onImportBundle: (bundle: WorkspaceTransferBundle) => void | Promise<void>,
) {
  const sessionRef = useRef<PeerWorkspaceSyncSession | null>(null);
  const suppressNextSendRef = useRef(false);
  const lastSentFingerprintRef = useRef("");
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [preparedSignal, setPreparedSignal] = useState<PeerSyncPreparedSignal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncFingerprint = useMemo(
    () => JSON.stringify({ settings: bundle.settings, history: bundle.history }),
    [bundle.history, bundle.settings],
  );

  const closeSession = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setConnectionState("closed");
    setPreparedSignal(null);
  }, []);

  const importRemoteBundle = useCallback(
    async (nextBundle: WorkspaceTransferBundle) => {
      suppressNextSendRef.current = true;
      await onImportBundle(nextBundle);
    },
    [onImportBundle],
  );

  const createSession = useCallback(
    (initiator: boolean) => {
      sessionRef.current?.close();
      const nextSession = new PeerWorkspaceSyncSession(initiator, importRemoteBundle, setConnectionState);
      sessionRef.current = nextSession;
      setConnectionState("connecting");
      return nextSession;
    },
    [importRemoteBundle],
  );

  const prepareSignalForUi = useCallback(async (signal: PeerSyncSignal, passphrase: string) => {
    const encryptedPayload = await encryptTransferString(JSON.stringify(signal), passphrase);
    const encrypted = JSON.stringify(encryptedPayload);
    setPreparedSignal({
      kind: signal.type,
      encrypted,
      qrChunks: createTransferQrChunks(encrypted, 700),
    });
  }, []);

  const startHost = useCallback(
    async (passphrase: string) => {
      setError(null);
      const session = createSession(true);

      try {
        const signal = await session.createOfferSignal();
        await prepareSignalForUi(signal, passphrase);
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Could not create a sync offer.";
        setError(message);
        closeSession();
        throw syncError;
      }
    },
    [closeSession, createSession, prepareSignalForUi],
  );

  const joinFromOffer = useCallback(
    async (encryptedSignal: string, passphrase: string) => {
      setError(null);
      const session = createSession(false);

      try {
        const signal = JSON.parse(await decryptTransferString(encryptedSignal, passphrase)) as PeerSyncSignal;
        if (signal.type !== "offer") {
          throw new Error("That pairing payload is not a sync offer.");
        }

        const answer = await session.acceptOfferSignal(signal);
        await prepareSignalForUi(answer, passphrase);
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Could not join from that sync offer.";
        setError(message);
        closeSession();
        throw syncError;
      }
    },
    [closeSession, createSession, prepareSignalForUi],
  );

  const finishHost = useCallback(
    async (encryptedSignal: string, passphrase: string) => {
      setError(null);

      try {
        const signal = JSON.parse(await decryptTransferString(encryptedSignal, passphrase)) as PeerSyncSignal;
        if (signal.type !== "answer") {
          throw new Error("That pairing payload is not a sync answer.");
        }

        if (!sessionRef.current) {
          throw new Error("Start a host pairing on this device first.");
        }

        await sessionRef.current.acceptAnswerSignal(signal);
        setPreparedSignal(null);
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Could not finish sync pairing.";
        setError(message);
        throw syncError;
      }
    },
    [closeSession],
  );

  useEffect(() => {
    if (!sessionRef.current || connectionState !== "connected") {
      return;
    }

    if (suppressNextSendRef.current) {
      suppressNextSendRef.current = false;
      lastSentFingerprintRef.current = syncFingerprint;
      return;
    }

    if (lastSentFingerprintRef.current === syncFingerprint) {
      return;
    }

    try {
      sessionRef.current.sendBundle(bundle);
      lastSentFingerprintRef.current = syncFingerprint;
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Could not send the latest workspace snapshot.");
    }
  }, [bundle, connectionState, syncFingerprint]);

  useEffect(() => () => {
    sessionRef.current?.close();
  }, []);

  return {
    connectionState,
    preparedSignal,
    error,
    setError,
    startHost,
    joinFromOffer,
    finishHost,
    closeSession,
  };
}

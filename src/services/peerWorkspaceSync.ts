import type { WorkspaceTransferBundle } from "./workspaceTransfer";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface PeerSyncSignal {
  version: 1;
  type: "offer" | "answer";
  description: RTCSessionDescriptionInit;
}

type PeerMessage =
  | { type: "snapshot"; payload: string }
  | { type: "snapshot-start"; transferId: string; total: number }
  | { type: "snapshot-chunk"; transferId: string; index: number; payload: string };

function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const handleChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handleChange);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", handleChange);
  });
}

export class PeerWorkspaceSyncSession {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private pendingChunks = new Map<string, { total: number; chunks: Map<number, string> }>();

  constructor(
    private readonly initiator: boolean,
    private readonly onBundle: (bundle: WorkspaceTransferBundle) => void | Promise<void>,
    private readonly onConnectionState?: (state: RTCPeerConnectionState) => void,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc.addEventListener("connectionstatechange", () => {
      this.onConnectionState?.(this.pc.connectionState);
    });

    this.pc.addEventListener("datachannel", (event) => {
      this.attachChannel(event.channel);
    });

    if (initiator) {
      this.attachChannel(this.pc.createDataChannel("mike-sync", { ordered: true }));
    }
  }

  private attachChannel(channel: RTCDataChannel) {
    this.channel = channel;
    channel.addEventListener("message", (event) => {
      void this.handleMessage(String(event.data));
    });
  }

  private async handleMessage(raw: string) {
    const message = JSON.parse(raw) as PeerMessage;

    if (message.type === "snapshot") {
      await this.onBundle(JSON.parse(message.payload) as WorkspaceTransferBundle);
      return;
    }

    if (message.type === "snapshot-start") {
      this.pendingChunks.set(message.transferId, {
        total: message.total,
        chunks: new Map(),
      });
      return;
    }

    const pending = this.pendingChunks.get(message.transferId);
    if (!pending) {
      return;
    }

    pending.chunks.set(message.index, message.payload);
    if (pending.chunks.size === pending.total) {
      const joined = Array.from({ length: pending.total }, (_, index) => pending.chunks.get(index + 1) ?? "").join("");
      this.pendingChunks.delete(message.transferId);
      await this.onBundle(JSON.parse(joined) as WorkspaceTransferBundle);
    }
  }

  private sendMessage(message: PeerMessage) {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Peer sync channel is not open yet.");
    }

    this.channel.send(JSON.stringify(message));
  }

  async createOfferSignal() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(this.pc);

    return {
      version: 1,
      type: "offer",
      description: this.pc.localDescription
        ? { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp ?? undefined }
        : { type: offer.type, sdp: offer.sdp ?? undefined },
    } satisfies PeerSyncSignal;
  }

  async acceptOfferSignal(signal: PeerSyncSignal) {
    await this.pc.setRemoteDescription(signal.description);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(this.pc);

    return {
      version: 1,
      type: "answer",
      description: this.pc.localDescription
        ? { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp ?? undefined }
        : { type: answer.type, sdp: answer.sdp ?? undefined },
    } satisfies PeerSyncSignal;
  }

  async acceptAnswerSignal(signal: PeerSyncSignal) {
    await this.pc.setRemoteDescription(signal.description);
  }

  sendBundle(bundle: WorkspaceTransferBundle) {
    const payload = JSON.stringify(bundle);
    if (payload.length <= 16_000) {
      this.sendMessage({ type: "snapshot", payload });
      return;
    }

    const transferId = randomId();
    const chunks: string[] = [];
    for (let index = 0; index < payload.length; index += 12_000) {
      chunks.push(payload.slice(index, index + 12_000));
    }

    this.sendMessage({ type: "snapshot-start", transferId, total: chunks.length });
    chunks.forEach((chunk, index) => {
      this.sendMessage({ type: "snapshot-chunk", transferId, index: index + 1, payload: chunk });
    });
  }

  close() {
    this.channel?.close();
    this.pc.close();
  }
}

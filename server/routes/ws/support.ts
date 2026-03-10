import { defineWebSocketHandler } from "h3";

type SupportPeer = any;

const peers = new Set<SupportPeer>();
const threadSubscriptions = new Map<number, Set<SupportPeer>>();

function subscribePeerToThread(peer: SupportPeer, threadId: number) {
  peers.add(peer);

  let set = threadSubscriptions.get(threadId);
  if (!set) {
    set = new Set<SupportPeer>();
    threadSubscriptions.set(threadId, set);
  }
  set.add(peer);
}

function unsubscribePeer(peer: SupportPeer) {
  for (const [threadId, set] of threadSubscriptions.entries()) {
    if (!set.has(peer)) continue;
    set.delete(peer);
    if (!set.size) {
      threadSubscriptions.delete(threadId);
    }
  }
  peers.delete(peer);
}

export interface SupportBroadcastMessage {
  threadId: number;
  message: {
    id: number;
    thread_id: number;
    sender_type: "user" | "admin";
    sender_id: number;
    content: string;
    created_at: string | Date;
  };
}

export function broadcastSupportMessage(payload: SupportBroadcastMessage) {
  const set = threadSubscriptions.get(payload.threadId);
  if (!set || !set.size) return;
  const data = JSON.stringify({
    type: "support_message",
    threadId: payload.threadId,
    message: payload.message,
  });
  for (const peer of set) {
    try {
      peer.send(data);
    } catch {
      // ignore
    }
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    peers.add(peer);
  },

  async message(peer, message) {
    let data: any;
    try {
      data = JSON.parse(message.text());
    } catch {
      return;
    }

    if (data?.type === "ping") {
      try {
        peer.send(JSON.stringify({ type: "pong" }));
      } catch {
        // ignore
      }
      return;
    }

    if (data?.type === "subscribe" && data.threadId) {
      const threadId = Number(data.threadId);
      if (!threadId || Number.isNaN(threadId)) return;

      // Việc gửi / đọc nội dung chính đã được kiểm soát qua HTTP.
      // WebSocket ở đây chỉ dùng để đẩy realtime cho những client đã biết threadId.
      subscribePeerToThread(peer, threadId);
    }
  },

  close(peer) {
    unsubscribePeer(peer);
  },
});


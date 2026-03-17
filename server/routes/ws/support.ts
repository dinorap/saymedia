import { defineWebSocketHandler, type H3Event, getCookie } from "h3";
import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { getJwtSecret } from "../../utils/jwt";

type SupportPeer = any;

const peers = new Set<SupportPeer>();
const threadSubscriptions = new Map<number, Set<SupportPeer>>();

const JWT_SECRET = getJwtSecret();

function getEventFromPeer(peer: any): H3Event | undefined {
  // @ts-ignore accessing internal context from h3 websocket peer
  return peer?.ctx?.event as H3Event | undefined;
}

function requireWsAuth(peer: SupportPeer) {
  const event = getEventFromPeer(peer);
  if (!event) throw new Error("UNAUTHENTICATED");
  const token = getCookie(event, "auth_token");
  if (!token) throw new Error("UNAUTHENTICATED");
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    throw new Error("UNAUTHENTICATED");
  }
}

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
    // Require authentication to keep support threads private
    try {
      requireWsAuth(peer);
    } catch {
      try {
        peer.close();
      } catch {}
      peers.delete(peer);
    }
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

      // Verify ownership/permission before subscribing to a thread.
      let current: { id: number; role: string };
      try {
        current = requireWsAuth(peer);
      } catch {
        try {
          peer.send(JSON.stringify({ type: "error", message: "UNAUTHENTICATED" }));
        } catch {}
        return;
      }

      try {
        const [[thread]]: any = await pool.query(
          "SELECT id, user_id, admin_id FROM support_threads WHERE id = ? LIMIT 1",
          [threadId],
        );
        if (!thread) return;

        const role = String(current.role || "");
        const uid = Number(current.id);

        const allowed =
          role === "admin_0" ||
          (role === "user" && Number(thread.user_id) === uid) ||
          ((role === "admin_1" || role === "admin_2") &&
            Number(thread.admin_id) === uid);

        if (!allowed) return;

        subscribePeerToThread(peer, threadId);
      } catch {
        // ignore
      }
    }
  },

  close(peer) {
    unsubscribePeer(peer);
  },
});


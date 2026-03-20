import { defineWebSocketHandler, type H3Event, getCookie } from "h3";
import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { getJwtSecret } from "../../utils/jwt";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import {
  broadcastSupportMessage,
  registerPeer,
  unregisterPeer,
  subscribePeerToThread,
  unsubscribePeer,
} from "../../utils/supportWsHub";

type SupportPeer = any;

const JWT_SECRET = getJwtSecret();
const peerAuth = new WeakMap<SupportPeer, { id: number; role: string }>();

function getEventFromPeer(peer: any): H3Event | undefined {
  // @ts-ignore accessing internal context from h3 websocket peer
  return peer?.ctx?.event as H3Event | undefined;
}

function requireWsAuth(peer: SupportPeer) {
  const cached = peerAuth.get(peer);
  if (cached) return cached;
  const event = getEventFromPeer(peer);
  if (!event) throw new Error("UNAUTHENTICATED");
  const fromCookie = getCookie(event, "auth_token");
  const token = fromCookie;
  if (!token) throw new Error("UNAUTHENTICATED");
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string; ws?: string };
    peerAuth.set(peer, { id: decoded.id, role: decoded.role });
    return { id: decoded.id, role: decoded.role };
  } catch {
    throw new Error("UNAUTHENTICATED");
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    registerPeer(peer);
  },

  async message(peer, message) {
    let data: any;
    try {
      data = JSON.parse(message.text());
    } catch {
      return;
    }

    if (data?.type === "auth" && data?.token) {
      try {
        const decoded = jwt.verify(String(data.token), JWT_SECRET) as {
          id: number;
          role: string;
          ws?: string;
        };
        if (decoded?.ws && decoded.ws !== "support") {
          throw new Error("INVALID_WS_SCOPE");
        }
        peerAuth.set(peer, { id: decoded.id, role: decoded.role });
        try {
          peer.send(JSON.stringify({ type: "auth_ok" }));
        } catch {}
      } catch {
        try {
          peer.send(JSON.stringify({ type: "error", message: "UNAUTHENTICATED" }));
          peer.close();
        } catch {}
      }
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

    if (data?.type === "message" && data.threadId) {
      const threadId = Number(data.threadId);
      let content = String(data.content || "").trim();
      if (!threadId || Number.isNaN(threadId) || !content) return;
      if (content.length > 2000) content = content.slice(0, 2000);

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
        await ensureSupportChatSchema();
        const [[thread]]: any = await pool.query(
          "SELECT id, user_id, admin_id FROM support_threads WHERE id = ? LIMIT 1",
          [threadId],
        );
        if (!thread) return;

        let senderType: "user" | "admin" | null = null;
        if (current.role === "user" && Number(thread.user_id) === Number(current.id)) {
          senderType = "user";
        } else if (
          (current.role === "admin_0" || current.role === "admin_1" || current.role === "admin_2") &&
          (current.role === "admin_0" || Number(thread.admin_id) === Number(current.id))
        ) {
          senderType = "admin";
        }
        if (!senderType) return;

        const [result]: any = await pool.query(
          `
            INSERT INTO support_messages (thread_id, sender_type, sender_id, content)
            VALUES (?, ?, ?, ?)
          `,
          [threadId, senderType, current.id, content],
        );

        await pool.query(
          "UPDATE support_threads SET last_message_at = CURRENT_TIMESTAMP, status = 'open' WHERE id = ?",
          [threadId],
        );

        const created = {
          id: Number(result?.insertId || 0),
          thread_id: threadId,
          sender_type: senderType,
          sender_id: Number(current.id),
          content,
          created_at: new Date(),
        };

        broadcastSupportMessage({
          threadId,
          message: created,
        });
      } catch {
        try {
          peer.send(JSON.stringify({ type: "error", message: "SEND_FAILED" }));
        } catch {}
      }
    }
  },

  close(peer) {
    peerAuth.delete(peer);
    unsubscribePeer(peer);
  },
});


import { defineWebSocketHandler, type H3Event, getCookie } from "h3";
import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensureChatSchema, type ChatMessageRow } from "../../utils/chat";

const JWT_SECRET =
  process.env.JWT_SECRET || "chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456";

type CommunityPeer = any;

const peers = new Set<CommunityPeer>();

function getEventFromPeer(peer: any): H3Event | undefined {
  // @ts-ignore accessing internal context from h3 websocket peer
  return peer?.ctx?.event as H3Event | undefined;
}

async function loadRecentMessages(limit = 100) {
  await ensureChatSchema();
  const [rows]: any = await pool.query(
    `
      SELECT id, author_id, author_role, author_name, content, created_at
      FROM community_messages
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
  const items: ChatMessageRow[] = rows || [];
  return items
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorRole: m.author_role,
      authorName: m.author_name,
      content: m.content,
      createdAt: m.created_at,
    }));
}

async function createMessageFromPeer(peer: CommunityPeer, contentRaw: string) {
  const event = getEventFromPeer(peer);
  if (!event) {
    throw new Error("No event context");
  }

  const token = getCookie(event, "auth_token");
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  let decoded: { id: number; username: string; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      role: string;
    };
  } catch {
    throw new Error("UNAUTHENTICATED");
  }

  let content = String(contentRaw || "").trim();
  if (!content) {
    throw new Error("EMPTY_CONTENT");
  }
  if (content.length > 500) {
    content = content.slice(0, 500);
  }

  await ensureChatSchema();

  const authorId = decoded.id;
  const authorRole = decoded.role || "user";
  const authorName = decoded.username || "Khách";

  const [result]: any = await pool.query(
    `
      INSERT INTO community_messages (author_id, author_role, author_name, content)
      VALUES (?, ?, ?, ?)
    `,
    [authorId, authorRole, authorName, content],
  );

  const insertedId = result?.insertId;

  return {
    id: insertedId,
    authorId,
    authorRole,
    authorName,
    content,
    createdAt: new Date(),
  };
}

function broadcast(payload: any) {
  const data = JSON.stringify(payload);
  for (const peer of peers) {
    try {
      peer.send(data);
    } catch {
      // ignore send errors
    }
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    peers.add(peer);
    try {
      const history = await loadRecentMessages(100);
      peer.send(
        JSON.stringify({
          type: "history",
          messages: history,
        }),
      );
    } catch {
      // ignore
    }
  },

  async message(peer, message) {
    try {
      const raw = message.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (data?.type === "ping") {
        peer.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (data?.type === "message") {
        const created = await createMessageFromPeer(peer, data.content);
        broadcast({
          type: "message",
          message: created,
        });
      }
    } catch (err) {
      try {
        peer.send(
          JSON.stringify({
            type: "error",
            message: "Không gửi được tin nhắn.",
          }),
        );
      } catch {
        // ignore
      }
    }
  },

  close(peer) {
    peers.delete(peer);
  },
});


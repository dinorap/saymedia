import pool from "../../utils/db";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import jwt from "jsonwebtoken";
import { broadcastSupportMessage } from "../../routes/ws/support";

const JWT_SECRET =
  process.env.JWT_SECRET || "chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "auth_token");
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  let decoded: { id: number; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Phiên đăng nhập hết hạn",
    });
  }

  const body = await readBody(event);
  const threadId = Number(body?.thread_id);
  let content = String(body?.content || "").trim();

  if (!threadId || Number.isNaN(threadId)) {
    throw createError({ statusCode: 400, statusMessage: "Thread không hợp lệ" });
  }
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: "Nội dung trống" });
  }
  if (content.length > 2000) {
    content = content.slice(0, 2000);
  }

  await ensureSupportChatSchema();

  const [[thread]]: any = await pool.query(
    "SELECT * FROM support_threads WHERE id = ? LIMIT 1",
    [threadId],
  );

  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy phiên chat" });
  }

  let senderType: "user" | "admin";
  if (decoded.role === "user") {
    if (thread.user_id !== decoded.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "Không có quyền gửi tin vào phiên chat này",
      });
    }
    senderType = "user";
  } else if (
    decoded.role === "admin_0" ||
    decoded.role === "admin_1" ||
    decoded.role === "admin_2"
  ) {
    // admin_0 có thể gửi vào mọi phiên chat; admin_1/2 chỉ gửi vào thread của mình
    if (
      decoded.role !== "admin_0" &&
      thread.admin_id !== decoded.id
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: "Không có quyền gửi tin vào phiên chat này",
      });
    }
    senderType = "admin";
  } else {
    throw createError({
      statusCode: 403,
      statusMessage: "Role không được phép chat hỗ trợ",
    });
  }

  await pool.query(
    `
      INSERT INTO support_messages (thread_id, sender_type, sender_id, content)
      VALUES (?, ?, ?, ?)
    `,
    [threadId, senderType, decoded.id, content],
  );

  await pool.query(
    "UPDATE support_threads SET last_message_at = CURRENT_TIMESTAMP, status = 'open' WHERE id = ?",
    [threadId],
  );

  try {
    const [rows]: any = await pool.query(
      `
        SELECT id, thread_id, sender_type, sender_id, content, created_at
        FROM support_messages
        WHERE thread_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [threadId],
    );
    const latest = rows?.[0];
    if (latest) {
      broadcastSupportMessage({
        threadId,
        message: latest,
      });
    }
  } catch {
    // ignore broadcast errors
  }

  return { success: true };
});


import pool from "../../utils/db";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import { broadcastSupportMessage } from "../../utils/supportWsHub";
import { isAdminStaffRole, requireAuth } from "../../utils/authHelpers";
import { canAdminAccessSupportThread } from "../../utils/adminHierarchy";
import { checkRateLimit, rateLimitKey } from "../../utils/rateLimit";

export default defineEventHandler(async (event) => {
  const decoded = requireAuth(event);

  const body = await readBody(event);
  const threadId = Number(body?.thread_id);
  let content = String(body?.content || "").trim();
  const imageUrl = String(body?.imageUrl || "").trim();
  const safeImageUrl =
    imageUrl && imageUrl.startsWith('/uploads/chat/') ? imageUrl : '';

  if (!threadId || Number.isNaN(threadId)) {
    throw createError({ statusCode: 400, statusMessage: "Thread không hợp lệ" });
  }
  if (!content && !safeImageUrl) {
    throw createError({ statusCode: 400, statusMessage: "Nội dung hoặc ảnh là bắt buộc" });
  }
  if (content && content.length > 2000) {
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

  // Rate limit per sender per thread to prevent spam/DoS
  checkRateLimit({
    key: rateLimitKey(["support_msg", decoded.id, threadId]),
    max: 12,
    windowMs: 60_000,
    statusMessage: "Bạn gửi tin quá nhanh, vui lòng thử lại sau.",
    auditAction: "rate_limited_support_message",
    auditMetadata: { thread_id: threadId, actor_id: decoded.id },
  });

  let senderType: "user" | "admin";
  if (decoded.role === "user") {
    if (thread.user_id !== decoded.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "Không có quyền gửi tin vào phiên chat này",
      });
    }
    senderType = "user";
  } else if (isAdminStaffRole(decoded.role)) {
    const ok = await canAdminAccessSupportThread(
      decoded.id,
      decoded.role,
      thread.admin_id,
    );
    if (!ok) {
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
      INSERT INTO support_messages (thread_id, sender_type, sender_id, content, image_url)
      VALUES (?, ?, ?, ?, ?)
    `,
    [threadId, senderType, decoded.id, content || '', safeImageUrl || null],
  );

  await pool.query(
    "UPDATE support_threads SET last_message_at = CURRENT_TIMESTAMP, status = 'open' WHERE id = ?",
    [threadId],
  );

  try {
    const [rows]: any = await pool.query(
      `
        SELECT id, thread_id, sender_type, sender_id, content, image_url AS imageUrl, created_at
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


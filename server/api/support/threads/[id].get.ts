import pool from "../../../utils/db";
import { ensureSupportChatSchema } from "../../../utils/supportChat";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../../utils/jwt";
import { canAdminAccessSupportThread } from "../../../utils/adminHierarchy";

const JWT_SECRET = getJwtSecret();

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, "id");
  const threadId = Number(idParam);
  if (!threadId || Number.isNaN(threadId)) {
    throw createError({ statusCode: 400, statusMessage: "Thread không hợp lệ" });
  }

  await ensureSupportChatSchema();

  // Lấy thông tin người gọi (user hoặc admin)
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

  const [[thread]]: any = await pool.query(
    `
      SELECT st.*, u.username AS user_username, a.username AS admin_username, p.name AS product_name
      FROM support_threads st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN admins a ON st.admin_id = a.id
      LEFT JOIN products p ON st.product_id = p.id
      WHERE st.id = ?
      LIMIT 1
    `,
    [threadId],
  );

  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy phiên chat" });
  }

  // Kiểm tra quyền truy cập
  if (decoded.role === "user" && thread.user_id !== decoded.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền xem phiên chat này",
    });
  }
  if (decoded.role !== "user") {
    const ok = await canAdminAccessSupportThread(
      decoded.id,
      decoded.role,
      thread.admin_id,
    );
    if (!ok) {
      throw createError({
        statusCode: 403,
        statusMessage: "Không có quyền xem phiên chat này",
      });
    }
  }

  const [messages]: any = await pool.query(
    `
      SELECT id, thread_id, sender_type, sender_id, content, image_url AS imageUrl, created_at
      FROM support_messages
      WHERE thread_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [threadId],
  );

  return {
    success: true,
    thread,
    messages: messages || [],
  };
});


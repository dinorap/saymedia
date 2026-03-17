import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import { getJwtSecret } from "../../utils/jwt";

const JWT_SECRET = getJwtSecret();

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

  if (decoded.role !== "user") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ người dùng mới mở phiên chat hỗ trợ.",
    });
  }

  const body = await readBody(event);
  const topic = body?.topic === "product" ? "product" : "account";
  const productId =
    topic === "product" && body?.product_id
      ? Number(body.product_id)
      : undefined;
  const initialMessage = String(body?.initial_message || "").trim();

  await ensureSupportChatSchema();

  // Xác định admin phụ trách
  let adminId: number | null = null;
  if (topic === "account") {
    const [[row]]: any = await pool.query(
      "SELECT admin_id FROM users WHERE id = ? LIMIT 1",
      [decoded.id],
    );
    adminId = row?.admin_id ?? null;
  } else {
    if (!productId || Number.isNaN(productId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Thiếu product_id cho phiên chat hỗ trợ sản phẩm.",
      });
    }
    const [[row]]: any = await pool.query(
      "SELECT admin_id FROM products WHERE id = ? LIMIT 1",
      [productId],
    );
    adminId = row?.admin_id ?? null;
  }

  if (!adminId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không tìm thấy admin phụ trách để mở phiên chat.",
    });
  }

  // Tìm thread đang mở (nếu có) để tái sử dụng
  const [existing]: any = await pool.query(
    `
      SELECT id
      FROM support_threads
      WHERE user_id = ?
        AND admin_id = ?
        AND topic = ?
        AND ${topic === "product" ? "product_id = ?" : "product_id IS NULL"}
        AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    topic === "product"
      ? [decoded.id, adminId, topic, productId]
      : [decoded.id, adminId, topic],
  );

  let threadId: number;
  if (existing.length > 0) {
    threadId = existing[0].id;
  } else {
    const [result]: any = await pool.query(
      "INSERT INTO support_threads (user_id, admin_id, product_id, topic) VALUES (?, ?, ?, ?)",
      [decoded.id, adminId, productId ?? null, topic],
    );
    threadId = result.insertId;
  }

  // Nếu có tin nhắn khởi tạo, lưu luôn
  if (initialMessage) {
    await pool.query(
      `
        INSERT INTO support_messages (thread_id, sender_type, sender_id, content)
        VALUES (?, 'user', ?, ?)
      `,
      [threadId, decoded.id, initialMessage],
    );
    await pool.query(
      "UPDATE support_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?",
      [threadId],
    );
  }

  return {
    success: true,
    threadId,
  };
});


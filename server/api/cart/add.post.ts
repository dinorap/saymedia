import jwt from "jsonwebtoken";
import pool from "../../utils/db";

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

  if (decoded.role !== "user") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ người dùng mới sử dụng giỏ hàng",
    });
  }

  const body = await readBody(event);
  const productId = Number(body?.product_id || 0);
  const qty = Number(body?.qty || 1);
  const duration =
    typeof body?.duration === "string" && body.duration.trim()
      ? String(body.duration).trim().slice(0, 32)
      : null;

  if (!Number.isInteger(productId) || productId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sản phẩm không hợp lệ",
    });
  }
  const safeQty = !Number.isInteger(qty) || qty <= 0 ? 1 : Math.min(qty, 99);

  await pool.query(
    `
      INSERT INTO user_cart_items (user_id, product_id, duration, qty)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE qty = VALUES(qty)
    `,
    [decoded.id, productId, duration, safeQty],
  );

  return { success: true };
});


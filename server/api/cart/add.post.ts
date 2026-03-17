import pool from "../../utils/db";
import { requireUser } from "../../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../../utils/rateLimit";

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event);
  checkRateLimit({
    key: rateLimitKey(["cart_add", decoded.id]),
    max: 30,
    windowMs: 60_000,
    statusMessage: "Thao tác quá nhanh, vui lòng thử lại sau.",
  });

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

  // Quy ước: mỗi sản phẩm trong giỏ chỉ có một dòng (1 loại duration).
  // Khi thêm/cập nhật, xóa mọi dòng khác product_id (tránh giữ lại duration cũ).
  await pool.query(
    "DELETE FROM user_cart_items WHERE user_id = ? AND product_id = ? AND (duration <=> ? ) = 0",
    [decoded.id, productId, duration],
  );

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


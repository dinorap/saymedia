import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { getJwtSecret } from "../../utils/jwt";
import { isCustomerRole } from "../../utils/authHelpers";

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

  if (!isCustomerRole(decoded.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ người dùng mới sử dụng giỏ hàng",
    });
  }

  const body = await readBody(event);
  const productId = Number(body?.product_id || 0);
  const duration =
    body?.duration === undefined || body?.duration === null
      ? null
      : String(body.duration);

  if (!Number.isInteger(productId) || productId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sản phẩm không hợp lệ",
    });
  }

  // Xóa đúng 1 dòng: user_id + product_id + duration (tránh xóa nhầm cùng sản phẩm khác loại key)
  await pool.query(
    "DELETE FROM user_cart_items WHERE user_id = ? AND product_id = ? AND (duration <=> ?)",
    [decoded.id, productId, duration],
  );

  return { success: true };
});


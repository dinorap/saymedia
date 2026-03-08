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

  const [rows]: any = await pool.query(
    `
      SELECT
        c.product_id AS id,
        c.qty,
        p.name,
        p.price,
        p.thumbnail_url,
        p.type
      FROM user_cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `,
    [decoded.id],
  );

  const items = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price || 0),
    thumbnail_url: r.thumbnail_url || null,
    type: r.type || null,
    qty: Number(r.qty || 1),
  }));

  return {
    success: true,
    items,
  };
});


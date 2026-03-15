import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensureProductKeySchema } from "../../utils/productKeys";

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
        c.duration,
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

  const productIds = rows.map((r: any) => r.id).filter((id: any) => id != null);

  let durationPricesByProduct: Record<number, Record<string, number>> = {};

  if (productIds.length) {
    // Đảm bảo schema bảng product_keys đã tồn tại
    await ensureProductKeySchema();

    const [keyRows]: any = await pool.query(
      `
        SELECT
          pk.product_id,
          pk.valid_duration,
          MIN(pk.price) AS price
        FROM product_keys pk
        WHERE pk.product_id IN (?)
        GROUP BY pk.product_id, pk.valid_duration
      `,
      [productIds],
    );

    durationPricesByProduct = keyRows.reduce(
      (acc: Record<number, Record<string, number>>, row: any) => {
        const pid = Number(row.product_id);
        if (!acc[pid]) acc[pid] = {};
        acc[pid][row.valid_duration] = Number(row.price || 0);
        return acc;
      },
      {},
    );
  }

  const items = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price || 0),
    thumbnail_url: r.thumbnail_url || null,
    type: r.type || null,
    qty: Number(r.qty || 1),
    duration: r.duration || null,
    duration_prices: durationPricesByProduct[r.id] || {},
  }));

  return {
    success: true,
    items,
  };
});


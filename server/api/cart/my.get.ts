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
  let durationStockByProduct: Record<number, Record<string, number>> = {};

  if (productIds.length) {
    await ensureProductKeySchema();

    const [keyRows]: any = await pool.query(
      `
        SELECT
          pk.product_id,
          pk.valid_duration,
          MIN(pk.price) AS price,
          COUNT(*) AS stock
        FROM product_keys pk
        WHERE pk.product_id IN (?)
        GROUP BY pk.product_id, pk.valid_duration
      `,
      [productIds],
    );

    for (const row of keyRows || []) {
      const pid = Number(row.product_id);
      if (!durationPricesByProduct[pid]) {
        durationPricesByProduct[pid] = {};
        durationStockByProduct[pid] = {};
      }
      durationPricesByProduct[pid][row.valid_duration] = Number(row.price || 0);
      durationStockByProduct[pid][row.valid_duration] = Number(row.stock || 0);
    }
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
    duration_stock: durationStockByProduct[r.id] || {},
  }));

  return {
    success: true,
    items,
  };
});


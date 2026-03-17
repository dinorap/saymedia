import pool from "../../utils/db";
import { ensureProductKeySchema } from "../../utils/productKeys";
import { requireUser } from "../../utils/authHelpers";

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event);

  const [rows]: any = await pool.query(
    `
      SELECT
        c.product_id AS id,
        c.qty,
        c.duration,
        p.name,
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
    price: 0, // set below from duration_prices
    thumbnail_url: r.thumbnail_url || null,
    type: r.type || null,
    qty: Number(r.qty || 1),
    duration: r.duration || null,
    duration_prices: durationPricesByProduct[r.id] || {},
    duration_stock: durationStockByProduct[r.id] || {},
  }));

  // Hướng A: giá luôn lấy theo duration từ product_keys.
  for (const it of items) {
    const d = it.duration ? String(it.duration) : "";
    const p =
      d && it.duration_prices && typeof it.duration_prices[d] === "number"
        ? Number(it.duration_prices[d] || 0)
        : 0;
    it.price = Number.isFinite(p) ? p : 0;
  }

  return {
    success: true,
    items,
  };
});


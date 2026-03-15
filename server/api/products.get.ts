import pool from "../utils/db";
import {
  cacheGet,
  cacheSet,
  PRODUCTS_LIST_KEY,
} from "../utils/cache";
import { ensureProductKeySchema } from "../utils/productKeys";

const CACHE_TTL = 60;

export default defineEventHandler(async () => {
  const cached = cacheGet<{ success: true; data: any[] }>(PRODUCTS_LIST_KEY);
  if (cached) return cached;

  // Danh sách sản phẩm cơ bản cho khách hàng
  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        youtube_url,
        type,
        thumbnail_url
      FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 200
    `,
  );

  const products: any[] = rows || [];

  // Nếu không có sản phẩm nào thì trả về luôn
  if (!products.length) {
    const emptyResult = { success: true, data: [] as any[] };
    cacheSet(PRODUCTS_LIST_KEY, emptyResult, CACHE_TTL);
    return emptyResult;
  }

  // Gắn thêm thông tin giá theo từng loại key (thời hạn) từ bảng product_keys
  await ensureProductKeySchema();

  const ids = products.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");

  const [priceRows]: any = await pool.query(
    `
      SELECT
        product_id,
        valid_duration,
        MIN(price) AS price
      FROM product_keys
      WHERE product_id IN (${placeholders})
      GROUP BY product_id, valid_duration
    `,
    ids,
  );

  const durationPricesByProduct: Record<
    number,
    Record<string, number>
  > = {};

  for (const row of priceRows || []) {
    const pid = Number(row.product_id);
    if (!durationPricesByProduct[pid]) {
      durationPricesByProduct[pid] = {};
    }
    durationPricesByProduct[pid][row.valid_duration] = Number(row.price) || 0;
  }

  for (const p of products) {
    const pid = Number(p.id);
    const durationPrices = durationPricesByProduct[pid] || {};
    p.duration_prices = durationPrices;
    // Giá mặc định dùng loại key 2h nếu có, nếu không thì 0
    p.price =
      typeof durationPrices["2h"] === "number" ? durationPrices["2h"] : 0;
  }

  const result = { success: true, data: products };
  cacheSet(PRODUCTS_LIST_KEY, result, CACHE_TTL);
  return result;
});


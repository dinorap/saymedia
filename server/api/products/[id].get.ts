import pool from "../../utils/db";
import { cacheGet, cacheSet, PRODUCT_DETAIL_KEY } from "../../utils/cache";
import { ensureProductKeySchema } from "../../utils/productKeys";

const CACHE_TTL = 60;

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Sản phẩm không hợp lệ" });
  }

  const cached = cacheGet<{ success: true; data: any }>(PRODUCT_DETAIL_KEY(id));
  if (cached) return cached;

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        long_description,
        youtube_url,
        type,
        thumbnail_url,
        images_json
      FROM products
      WHERE id = ? AND is_active = 1
      LIMIT 1
    `,
    [id],
  );

  const product = rows[0];
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  let images: string[] = [];
  if (product.images_json) {
    try {
      const parsed = JSON.parse(product.images_json);
      if (Array.isArray(parsed)) {
        images = parsed
          .map((u: any) => String(u || "").trim())
          .filter((u: string) => !!u);
      }
    } catch {
      images = [];
    }
  }

  delete product.images_json;

  // Lấy thêm thông tin giá theo từng loại key (thời hạn) của sản phẩm này
  await ensureProductKeySchema();
  const [priceRows]: any = await pool.query(
    `
      SELECT
        product_id,
        valid_duration,
        MIN(price) AS price
      FROM product_keys
      WHERE product_id = ?
      GROUP BY product_id, valid_duration
    `,
    [id],
  );

  const durationPrices: Record<string, number> = {};
  for (const row of priceRows || []) {
    durationPrices[String(row.valid_duration)] = Number(row.price) || 0;
  }

  const result = {
    success: true,
    data: {
      ...product,
      images,
      duration_prices: durationPrices,
    },
  };
  cacheSet(PRODUCT_DETAIL_KEY(id), result, CACHE_TTL);
  return result;
});


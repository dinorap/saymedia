import pool from "../../utils/db";
import { cacheGet, cacheSet, PRODUCT_DETAIL_KEY } from "../../utils/cache";

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

  const result = {
    success: true,
    data: {
      ...product,
      images,
    },
  };
  cacheSet(PRODUCT_DETAIL_KEY(id), result, CACHE_TTL);
  return result;
});


import pool from "../utils/db";
import {
  cacheGet,
  cacheSet,
  PRODUCTS_LIST_KEY,
} from "../utils/cache";

const CACHE_TTL = 60;

export default defineEventHandler(async () => {
  const cached = cacheGet<{ success: true; data: any[] }>(PRODUCTS_LIST_KEY);
  if (cached) return cached;

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

  const result = { success: true, data: rows };
  cacheSet(PRODUCTS_LIST_KEY, result, CACHE_TTL);
  return result;
});


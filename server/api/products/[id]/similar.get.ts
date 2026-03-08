import pool from "../../../utils/db";
import {
  cacheGet,
  cacheSet,
  PRODUCT_SIMILAR_KEY,
} from "../../../utils/cache";

const CACHE_TTL = 60;

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Sản phẩm không hợp lệ" });
  }

  const limit = Math.min(Math.max(Number(getQuery(event)?.limit || 6) || 6, 1), 12);
  const cached = cacheGet<{ success: true; data: any[] }>(
    PRODUCT_SIMILAR_KEY(id, limit)
  );
  if (cached) return cached;

  const [[current]]: any = await pool.query(
    "SELECT id, type FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
    [id],
  );
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  const out: any[] = [];
  const seen = new Set<number>([id]);

  const [sameTypeRows]: any = await pool.query(
    `
      SELECT id, name, description, price, type, thumbnail_url
      FROM products
      WHERE is_active = 1 AND id <> ? AND type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [id, current.type || "tool", limit],
  );
  for (const p of sameTypeRows || []) {
    if (!seen.has(Number(p.id))) {
      seen.add(Number(p.id));
      out.push(p);
    }
  }

  if (out.length < limit) {
    const remaining = limit - out.length;
    const [fallbackRows]: any = await pool.query(
      `
        SELECT id, name, description, price, type, thumbnail_url
        FROM products
        WHERE is_active = 1 AND id <> ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [id, remaining + 8],
    );
    for (const p of fallbackRows || []) {
      if (out.length >= limit) break;
      if (!seen.has(Number(p.id))) {
        seen.add(Number(p.id));
        out.push(p);
      }
    }
  }

  const result = { success: true, data: out };
  cacheSet(PRODUCT_SIMILAR_KEY(id, limit), result, CACHE_TTL);
  return result;
});


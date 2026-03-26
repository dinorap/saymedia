import pool from "../../utils/db";
import { ensurePricingSetsSchema, pricingSetTypes } from "../../utils/pricing";
import { cacheGet, cacheSet } from "../../utils/cache";

const CACHE_KEY = "pricing:sets:admin";
const CACHE_TTL = 30;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới được quản lý bảng giá",
    });
  }

  const skipCache = !!getQuery(event).refresh;
  const cached = skipCache
    ? null
    : cacheGet<{ success: true; data: any }>(CACHE_KEY);
  if (cached) return cached;

  await ensurePricingSetsSchema();

  const [rows]: any = await pool.query(
    `
      SELECT pricing_type, data
      FROM pricing_sets
    `,
  );

  const byType: Record<string, any> = {};
  for (const r of rows || []) {
    const raw = r?.data;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    byType[String(r.pricing_type)] = parsed;
  }

  const sets = pricingSetTypes
    .map((t) => ({ type: t, ...(byType[t] || {}) }))
    .filter((x) => !!x);

  const result = { success: true, data: { sets, byType } };
  if (!skipCache) cacheSet(CACHE_KEY, result, CACHE_TTL);
  return result;
});


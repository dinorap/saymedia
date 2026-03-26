import pool from "../utils/db";
import { ensurePricingSetsSchema, pricingSetTypes } from "../utils/pricing";
import { cacheGet, cacheSet } from "../utils/cache";

const CACHE_KEY = "pricing:sets";
const CACHE_TTL = 60; // seconds

export default defineEventHandler(async (event) => {
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

  // Stable order (tabs)
  const sets = pricingSetTypes
    .map((t) => ({ type: t, ...(byType[t] || {}) }))
    .filter((x) => !!x);

  const result = { success: true, data: { sets, byType } };
  if (!skipCache) cacheSet(CACHE_KEY, result, CACHE_TTL);
  return result;
});


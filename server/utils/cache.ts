/**
 * Cache in-memory đơn giản với TTL (giây). Dùng cho API products để giảm query MySQL.
 */
const store = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL = 60; // 1 phút

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export const PRODUCTS_LIST_KEY = "products:list";
export const PRODUCT_DETAIL_KEY = (id: number) => `products:detail:${id}`;
export const PRODUCT_SIMILAR_KEY = (id: number, limit: number) =>
  `products:similar:${id}:${limit}`;

/**
 * Rate limit tạo đơn hàng: tối đa 20 đơn / phút / user (chống spam, lạm dụng).
 */
const store = new Map<number, { count: number; resetAt: number }>()
const MAX_ORDERS_PER_MINUTE = 20
const WINDOW_MS = 60 * 1000

export function checkOrderCreateRateLimit(userId: number): void {
  const now = Date.now()
  const entry = store.get(userId)

  if (entry) {
    if (now > entry.resetAt) {
      store.set(userId, { count: 1, resetAt: now + WINDOW_MS })
      return
    }
    if (entry.count >= MAX_ORDERS_PER_MINUTE) {
      const secs = Math.ceil((entry.resetAt - now) / 1000)
      throw createError({
        statusCode: 429,
        statusMessage: `Tạo đơn quá nhanh. Thử lại sau ${secs} giây.`,
      })
    }
    entry.count++
  } else {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS })
  }
}

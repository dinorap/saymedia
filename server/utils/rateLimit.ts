import { addAuditLog } from './audit'

/**
 * Rate limit đơn giản cho đăng nhập - chống brute force
 * Lưu theo IP, tối đa 5 lần thất bại / 15 phút
 */
const store = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 phút

function getKey(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return getRequestIP(event) || 'unknown'
}

export function checkLoginRateLimit(event: any): void {
  const key = getKey(event)
  const now = Date.now()
  const entry = store.get(key)

  if (entry) {
    if (now > entry.resetAt) {
      store.delete(key)
      return
    }
    if (entry.count >= MAX_ATTEMPTS) {
      const mins = Math.ceil((entry.resetAt - now) / 60000)
      // ghi log khi IP bị rate limit
      addAuditLog({
        actorType: 'system',
        action: 'login_rate_limited',
        targetType: 'ip',
        targetId: key,
        metadata: { attempts: entry.count, windowMinutes: WINDOW_MS / 60000 },
      }).catch(() => {})
      throw createError({
        statusCode: 429,
        statusMessage: `Đăng nhập thất bại quá nhiều. Thử lại sau ${mins} phút.`
      })
    }
  }
}

export function recordLoginFailure(event: any): void {
  const key = getKey(event)
  const now = Date.now()
  const entry = store.get(key)

  if (entry) {
    if (now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    } else {
      entry.count++
    }
  } else {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
  }
}

export function clearLoginFailure(event: any): void {
  const key = getKey(event)
  store.delete(key)
}

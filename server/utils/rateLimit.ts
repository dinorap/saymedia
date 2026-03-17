import { addAuditLog } from './audit'
import { getRequestIpKey } from './authHelpers'

/**
 * Rate limit đơn giản cho đăng nhập - chống brute force
 * Lưu theo IP, tối đa 5 lần thất bại / 15 phút
 */
const store = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 phút

// Generic in-memory rate limiter stores
const genericStore = new Map<string, { count: number; resetAt: number }>()

export function checkLoginRateLimit(event: any): void {
  const key = getRequestIpKey(event)
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
  const key = getRequestIpKey(event)
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
  const key = getRequestIpKey(event)
  store.delete(key)
}

export function checkRateLimit(opts: {
  key: string
  max: number
  windowMs: number
  statusMessage?: string
  auditAction?: string
  auditMetadata?: any
}): void {
  const { key, max, windowMs } = opts
  const now = Date.now()
  const entry = genericStore.get(key)
  if (entry && now > entry.resetAt) {
    genericStore.delete(key)
  }
  const curr = genericStore.get(key)
  if (curr) {
    if (curr.count >= max) {
      if (opts.auditAction) {
        addAuditLog({
          actorType: 'system',
          action: opts.auditAction,
          targetType: 'rate_limit',
          targetId: key,
          metadata: { max, windowMs, ...(opts.auditMetadata || {}) },
        }).catch(() => {})
      }
      throw createError({
        statusCode: 429,
        statusMessage: opts.statusMessage || 'Thao tác quá nhanh, vui lòng thử lại sau.',
      })
    }
    curr.count++
  } else {
    genericStore.set(key, { count: 1, resetAt: now + windowMs })
  }
}

export function rateLimitKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => (p == null ? '' : String(p)))
    .filter(Boolean)
    .join(':')
}

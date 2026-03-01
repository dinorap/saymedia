/**
 * In-memory OTP store (email -> { code, expiresAt, payload? })
 * payload dùng cho register: lưu username, password, ref để tạo user sau khi verify
 */

const store = new Map<
  string,
  { code: string; expiresAt: number; payload?: Record<string, unknown> }
>()

const OTP_TTL_MS = 5 * 60 * 1000 // 5 phút

export function setOtp(
  email: string,
  code: string,
  payload?: Record<string, unknown>
) {
  const key = email.toLowerCase().trim()
  store.set(key, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    payload
  })
}

export function getOtp(email: string): { code: string; payload?: Record<string, unknown> } | null {
  const key = email.toLowerCase().trim()
  const entry = store.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return { code: entry.code, payload: entry.payload }
}

export function consumeOtp(email: string): { code: string; payload?: Record<string, unknown> } | null {
  const key = email.toLowerCase().trim()
  const entry = store.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key)
  return { code: entry.code, payload: entry.payload }
}

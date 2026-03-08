/**
 * Rate limit gửi OTP: tối đa 1 lần mỗi 2 phút theo email (và IP cho an toàn).
 * Tránh spam email, tốn tài nguyên và bị nhà cung cấp đánh dấu spam.
 */
const WINDOW_MS = 2 * 60 * 1000 // 2 phút

const byEmail = new Map<string, number>()
const byIp = new Map<string, number>()

function getIp(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return getRequestIP(event) || 'unknown'
}

function prune(map: Map<string, number>) {
  const now = Date.now()
  for (const [key, resetAt] of map.entries()) {
    if (now > resetAt) map.delete(key)
  }
}

/**
 * Gọi trước khi gửi OTP. Ném 429 nếu email hoặc IP vừa gửi OTP trong 2 phút qua.
 */
export function checkOtpRateLimit(event: any, email: string): void {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return

  const ip = getIp(event)
  const now = Date.now()

  prune(byEmail)
  prune(byIp)

  const emailResetAt = byEmail.get(normalizedEmail)
  if (emailResetAt != null && now < emailResetAt) {
    const secs = Math.ceil((emailResetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `Vui lòng đợi ${secs} giây trước khi gửi lại mã OTP.`,
    })
  }

  const ipResetAt = byIp.get(ip)
  if (ipResetAt != null && now < ipResetAt) {
    const secs = Math.ceil((ipResetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `Bạn đã gửi OTP gần đây. Thử lại sau ${secs} giây.`,
    })
  }

  const resetAt = now + WINDOW_MS
  byEmail.set(normalizedEmail, resetAt)
  byIp.set(ip, resetAt)
}

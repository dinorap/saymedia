import jwt from 'jsonwebtoken'
import { getJwtSecret } from './jwt'

export type AuthUserRole = 'user' | 'admin_0' | 'admin_1' | 'admin_2'
export type AuthClaims = {
  id: number
  username?: string
  role: AuthUserRole | string
  admin_id?: number
}

const JWT_SECRET = getJwtSecret()

export function getRequestIpKey(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return getRequestIP(event) || 'unknown'
}

export function requireAuth(event: any): AuthClaims {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  try {
    return jwt.verify(token, JWT_SECRET) as AuthClaims
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }
}

export function requireUser(event: any): AuthClaims & { role: 'user' } {
  const decoded = requireAuth(event)
  if (decoded.role !== 'user') {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
  }
  return decoded as AuthClaims & { role: 'user' }
}

export function requireAdmin(event: any): AuthClaims & { role: 'admin_0' | 'admin_1' | 'admin_2' } {
  const decoded = requireAuth(event)
  if (decoded.role !== 'admin_0' && decoded.role !== 'admin_1' && decoded.role !== 'admin_2') {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
  }
  return decoded as AuthClaims & { role: 'admin_0' | 'admin_1' | 'admin_2' }
}


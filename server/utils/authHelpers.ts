import jwt from 'jsonwebtoken'
import { getJwtSecret } from './jwt'

export type AuthUserRole =
  | 'user'
  | 'admin_3'
  | 'admin_0'
  | 'admin_1'
  | 'admin_2'
  | 'admin_support'

export function isCustomerRole(role: string | undefined | null): boolean {
  return role === 'user' || role === 'admin_3'
}

/** Tài khoản bảng `admins` (JWT cũ có thể còn `admin_2`). */
export function isAdminStaffRole(role: string | undefined | null): boolean {
  return (
    role === 'admin_0' ||
    role === 'admin_1' ||
    role === 'admin_support' ||
    role === 'admin_2'
  )
}

/** Chỉ admin hỗ trợ / chat (không gồm admin_2 cấp bán hàng). */
export function isSupportAdminRole(role: string | undefined | null): boolean {
  return role === 'admin_support'
}

/** Quản lý shop (KH, đơn, SP, key, ledger, nạp…): admin_0 | admin_1 | admin_2 — không dành cho admin_support. */
export function assertShopManagementRole(role: string | undefined | null): void {
  if (role === 'admin_support') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tài khoản hỗ trợ không dùng chức năng quản lý shop.',
    })
  }
}
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

export function requireUser(event: any): AuthClaims & { role: 'user' | 'admin_3' } {
  const decoded = requireAuth(event)
  if (!isCustomerRole(decoded.role as string)) {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
  }
  return decoded as AuthClaims & { role: 'user' | 'admin_3' }
}

export function requireAdmin(event: any): AuthClaims & {
  role: 'admin_0' | 'admin_1' | 'admin_2' | 'admin_support'
} {
  const decoded = requireAuth(event)
  if (!isAdminStaffRole(decoded.role as string)) {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
  }
  return decoded as AuthClaims & {
    role: 'admin_0' | 'admin_1' | 'admin_2' | 'admin_support'
  }
}


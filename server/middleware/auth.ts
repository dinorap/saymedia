import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../utils/jwt'
import { isAdminStaffRole } from '../utils/authHelpers'

const JWT_SECRET = getJwtSecret()

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin')) return

  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; admin_id?: number }
    // Critical: /api/admin must only be accessible by admin roles.
    if (!isAdminStaffRole(decoded.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
    }
    event.context.user = decoded
  } catch (err: any) {
    // Preserve intentional createError() responses (e.g. 403).
    if (err?.statusCode) throw err
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }
})

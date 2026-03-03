import jwt from 'jsonwebtoken'

const DEFAULT_SECRET = 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  console.warn('[security] JWT_SECRET đang dùng giá trị mặc định. Hãy đặt JWT_SECRET trong .env để bảo mật.')
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin')) return

  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; admin_id?: number }
    event.context.user = decoded
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }
})

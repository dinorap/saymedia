import jwt from 'jsonwebtoken'
import pool from '../../utils/db'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; admin_id?: number }
    const user: { id: number; username: string; role: string; admin_id?: number; email?: string; credit?: number } = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      admin_id: decoded.admin_id
    }
    if (decoded.role === 'user') {
      try {
        const [rows]: any = await pool.query('SELECT email, credit FROM users WHERE id = ?', [decoded.id])
        if (rows.length > 0) {
          user.email = rows[0].email
          user.credit = Number(rows[0].credit || 0)
        }
      } catch {
        const [rows]: any = await pool.query('SELECT email FROM users WHERE id = ?', [decoded.id])
        if (rows.length > 0) user.email = rows[0].email
      }
    }
    return { success: true, user }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }
})

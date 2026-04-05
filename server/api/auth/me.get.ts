import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { ensureAdminContactSchema } from '../../utils/adminContact'
import { getJwtSecret } from '../../utils/jwt'
import { ensureUserProfileSchema } from '../../utils/userProfile'
import { isAdminStaffRole } from '../../utils/authHelpers'

const JWT_SECRET = getJwtSecret()

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; admin_id?: number }
    const user: {
      id: number;
      username: string;
      role: string;
      admin_id?: number;
      email?: string;
      credit?: number;
      display_name?: string | null;
      phone?: string | null;
      ref_code?: string;
      ui_theme?: string | null;
    } = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      admin_id: decoded.admin_id
    }
    if (decoded.role === 'user' || decoded.role === 'admin_3') {
      try {
        await ensureUserProfileSchema()
        const [rows]: any = await pool.query(
          'SELECT email, credit, display_name, phone, partner_role FROM users WHERE id = ?',
          [decoded.id],
        )
        if (rows.length > 0) {
          user.email = rows[0].email
          user.credit = Number(rows[0].credit || 0)
          user.display_name = rows[0].display_name ?? null
          user.phone = rows[0].phone ?? null
          if (rows[0].partner_role === 'admin_3') {
            ;(user as any).partner_role = 'admin_3'
          }
        }
      } catch {
        const [rows]: any = await pool.query('SELECT email FROM users WHERE id = ?', [decoded.id])
        if (rows.length > 0) user.email = rows[0].email
      }
    } else if (isAdminStaffRole(decoded.role)) {
      await ensureAdminContactSchema()
      const [rows]: any = await pool.query(
        'SELECT ref_code, contact_info, ui_theme, role FROM admins WHERE id = ? LIMIT 1',
        [decoded.id],
      )
      if (rows.length > 0) {
        user.ref_code = rows[0].ref_code
        ;(user as any).contact_info = rows[0].contact_info
        user.ui_theme = rows[0].ui_theme || null
        if (rows[0].role) {
          user.role = String(rows[0].role)
        }
      }
    }
    return { success: true, user }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }
})

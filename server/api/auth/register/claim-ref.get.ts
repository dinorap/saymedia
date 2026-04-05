/**
 * Claim ref từ URL: validate ref_code, set cookie signed.
 * Chỉ server tin cookie này - frontend không gửi admin_id.
 */
import jwt from 'jsonwebtoken'
import pool from '../../../utils/db'
import { getJwtSecret } from '../../../utils/jwt'

const JWT_SECRET = getJwtSecret()
const COOKIE_NAME = 'register_ref_claim'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24h

export default defineEventHandler(async (event) => {
  const ref = getQuery(event).ref
  if (!ref || typeof ref !== 'string') {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return { success: true, message: 'Đã xóa ref' }
  }

  const refTrim = ref.trim()
  if (!refTrim) {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return { success: true, message: 'Đã xóa ref' }
  }

  const [admins]: any = await pool.query('SELECT id FROM admins WHERE ref_code = ? AND is_active = 1', [refTrim])
  if (admins.length === 0) {
    return { success: false, message: 'Mã giới thiệu không tồn tại hoặc đã bị khóa' }
  }

  const adminId = admins[0].id
  const token = jwt.sign(
    { admin_id: adminId, purpose: 'register_ref' },
    JWT_SECRET,
    { expiresIn: COOKIE_MAX_AGE }
  )

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  })

  return { success: true, message: 'Đã xác nhận mã giới thiệu', admin_id: adminId }
})

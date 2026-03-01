import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../../utils/db'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  let decoded: { id: number; username: string; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }

  const isAdmin = decoded.role === 'admin_0' || decoded.role === 'admin_1'
  const body = await readBody(event)
  const { old_password, new_password } = body

  if (!old_password || !new_password) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới!' })
  }
  if (new_password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Mật khẩu mới tối thiểu 6 ký tự!' })
  }

  if (isAdmin) {
    const [admins]: any = await pool.query('SELECT password_hash FROM admins WHERE id = ?', [decoded.id])
    if (admins.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Admin không tồn tại' })
    }
    const isValid = await bcrypt.compare(old_password, admins[0].password_hash)
    if (!isValid) {
      throw createError({ statusCode: 401, statusMessage: 'Mật khẩu cũ không đúng!' })
    }
    const hashedPassword = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hashedPassword, decoded.id])
    return { success: true, message: 'Đổi mật khẩu thành công!' }
  }

  const [users]: any = await pool.query('SELECT password_hash FROM users WHERE id = ?', [decoded.id])
  if (users.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Người dùng không tồn tại' })
  }
  const isValid = await bcrypt.compare(old_password, users[0].password_hash)
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Mật khẩu cũ không đúng!' })
  }
  const hashedPassword = await bcrypt.hash(new_password, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, decoded.id])
  return { success: true, message: 'Đổi mật khẩu thành công!' }
})

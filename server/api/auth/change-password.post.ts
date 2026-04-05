import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { addAuditLog } from '../../utils/audit'
import { getJwtSecret } from '../../utils/jwt'
import { isAdminStaffRole } from '../../utils/authHelpers'

const JWT_SECRET = getJwtSecret()

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

  const isAdmin = isAdminStaffRole(decoded.role)
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
    await addAuditLog({
      actorType: 'admin',
      actorId: decoded.id,
      action: 'change_password',
      targetType: 'admin',
      targetId: decoded.id,
    })
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
  await addAuditLog({
    actorType: 'user',
    actorId: decoded.id,
    action: 'change_password',
    targetType: 'user',
    targetId: decoded.id,
  })
  return { success: true, message: 'Đổi mật khẩu thành công!' }
})

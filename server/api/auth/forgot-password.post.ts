import bcrypt from 'bcryptjs'
import pool from '../../utils/db'
import { sendNewPasswordEmail } from '../../utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim()

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập email!' })
  }

  const [users]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email])
  if (users.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Email chưa được đăng ký!' })
  }

  const newPassword = Math.random().toString(36).slice(-10)
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hashedPassword, email])

  const sent = await sendNewPasswordEmail(email, newPassword)
  if (!sent) {
    throw createError({ statusCode: 500, statusMessage: 'Không gửi được email. Vui lòng thử lại!' })
  }
  return { success: true, message: 'Đã gửi mật khẩu mới đến email của bạn!' }
})

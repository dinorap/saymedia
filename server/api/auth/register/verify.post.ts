import bcrypt from 'bcryptjs'
import pool from '../../../utils/db'
import { consumeOtp } from '../../../utils/otpStore'
import { resolveAssigneeAdminId } from '../../../utils/registerAssignee'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, otp } = body
  const e = email?.trim()

  if (!e || !otp) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập email và mã OTP!' })
  }

  const entry = consumeOtp(e)
  if (!entry || entry.code !== String(otp).trim()) {
    throw createError({ statusCode: 401, statusMessage: 'Mã OTP không đúng hoặc đã hết hạn!' })
  }

  const payload = entry.payload as { username: string; password: string; admin_id: number } | undefined
  if (!payload?.username || !payload?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Phiên đăng ký hết hạn. Vui lòng thử lại từ bước 1!' })
  }

  const [byUsername]: any = await pool.query('SELECT id FROM users WHERE username = ?', [payload.username])
  if (byUsername.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập đã tồn tại!' })
  }
  const [byEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [e])
  if (byEmail.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Email đã được đăng ký!' })
  }

  const adminIdResolved = await resolveAssigneeAdminId(payload.admin_id)

  const hashedPassword = await bcrypt.hash(payload.password, 10)
  const [result]: any = await pool.query(
    'INSERT INTO users (username, email, password_hash, admin_id) VALUES (?, ?, ?, ?)',
    [payload.username, e, hashedPassword, adminIdResolved]
  )

  return {
    success: true,
    message: 'Đăng ký thành công!',
    userId: result.insertId,
    assignedToAdmin: adminIdResolved
  }
})

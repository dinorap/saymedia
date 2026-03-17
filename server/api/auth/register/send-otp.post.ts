import jwt from 'jsonwebtoken'
import pool from '../../../utils/db'
import { setOtp } from '../../../utils/otpStore'
import { enqueueOtpEmail } from '../../../utils/emailQueue'
import { checkOtpRateLimit } from '../../../utils/otpRateLimit'
import { getJwtSecret } from '../../../utils/jwt'

const JWT_SECRET = getJwtSecret()
const COOKIE_NAME = 'register_ref_claim'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, email, password } = body
  const u = username?.trim()
  const e = email?.trim()

  if (!u || !e || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập đủ tên đăng nhập, email và mật khẩu!' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Mật khẩu tối thiểu 6 ký tự!' })
  }

  const [byUser]: any = await pool.query('SELECT id FROM users WHERE username = ?', [u])
  if (byUser.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập đã tồn tại!' })
  }
  const [byEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [e])
  if (byEmail.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Email đã được đăng ký!' })
  }

  checkOtpRateLimit(event, e)

  let adminId = 1
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { admin_id?: number; purpose?: string }
      if (decoded.purpose === 'register_ref' && decoded.admin_id) {
        adminId = decoded.admin_id
      }
    } catch {
      // token hết hạn hoặc invalid - bỏ qua
    }
    deleteCookie(event, COOKIE_NAME, { path: '/' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  setOtp(e, code, { username: u, password, admin_id: adminId })
  enqueueOtpEmail(e, code, 'đăng ký')
  return { success: true, message: 'Đã gửi mã OTP đến email của bạn!' }
})

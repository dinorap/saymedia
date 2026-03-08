import pool from '../../utils/db'
import { setOtp } from '../../utils/otpStore'
import { sendOtpEmail } from '../../utils/email'
import { checkOtpRateLimit } from '../../utils/otpRateLimit'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email?.trim()

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập email!' })
  }

  checkOtpRateLimit(event, email)

  const [users]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email])
  if (users.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Email chưa được đăng ký!' })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  setOtp(email, code)
  const sent = await sendOtpEmail(email, code, 'đăng nhập')
  if (!sent) {
    throw createError({ statusCode: 500, statusMessage: 'Không gửi được email OTP. Vui lòng thử lại!' })
  }
  return { success: true, message: 'Đã gửi mã OTP đến email của bạn!' }
})

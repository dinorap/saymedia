import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { consumeOtp } from '../../utils/otpStore'
import { checkLoginRateLimit, recordLoginFailure, clearLoginFailure } from '../../utils/rateLimit'
import { addAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password, email, otp } = body

  const jwtSecret = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

  try {
    checkLoginRateLimit(event)

    // Đăng nhập bằng OTP (chỉ user, không áp dụng admin)
    if (email && otp) {
      const entry = consumeOtp(email)
      if (!entry || entry.code !== String(otp).trim()) {
        recordLoginFailure(event)
        await addAuditLog({
          actorType: 'system',
          action: 'login_failed_otp',
          targetType: 'email',
          targetId: email,
        })
        throw createError({ statusCode: 401, statusMessage: 'Mã OTP không đúng hoặc đã hết hạn!' })
      }
      const [users]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email])
      if (users.length === 0) {
        await addAuditLog({
          actorType: 'system',
          action: 'login_failed_otp',
          targetType: 'email',
          targetId: email,
          metadata: { reason: 'email_not_found' },
        })
        throw createError({ statusCode: 401, statusMessage: 'Email chưa đăng ký!' })
      }
      const user = users[0]
      if (user.status === 'blocked') {
        recordLoginFailure(event)
        throw createError({ statusCode: 403, statusMessage: 'Tài khoản đã bị khóa!' })
      }
      clearLoginFailure(event)
      const token = jwt.sign(
        { id: user.id, username: user.username, role: 'user', admin_id: user.admin_id },
        jwtSecret,
        { expiresIn: '30d' }
      )
      setCookie(event, 'auth_token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/' })
      setCookie(event, 'user_role', 'user', { path: '/' })
      return { success: true, role: 'user', message: 'Đăng nhập bằng OTP thành công!' }
    }

    if (!username || !password) {
      throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập tên đăng nhập/email và mật khẩu!' })
    }

    const loginInput = String(username).trim()

    // 1. Kiểm tra tài khoản trong bảng admins (chỉ có username)
    const [admins]: any = await pool.query('SELECT * FROM admins WHERE username = ?', [loginInput]);

    if (admins.length > 0) {
      const admin = admins[0];
      if (!admin.is_active) {
        recordLoginFailure(event)
        throw createError({ statusCode: 403, statusMessage: 'Tài khoản admin đã bị khóa!' });
      }
      const isValid = await bcrypt.compare(password, admin.password_hash);
      
      if (isValid) {
        clearLoginFailure(event)
        const token = jwt.sign(
          { id: admin.id, username: admin.username, role: admin.role },
          jwtSecret,
          { expiresIn: '7d' }
        );

        setCookie(event, 'auth_token', token, {
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
        setCookie(event, 'user_role', admin.role, { path: '/' }); // Frontend đọc để chia UI / bẻ lái
        return { success: true, role: admin.role, message: 'Admin login thành công!' };
      }
    }

    // 2. Nếu không phải admin, kiểm tra trong bảng users (username hoặc email)
    const [users]: any = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [loginInput, loginInput]);
    
      if (users.length > 0) {
      const user = users[0];
      if (user.status === 'blocked') {
        recordLoginFailure(event)
        throw createError({ statusCode: 403, statusMessage: 'Tài khoản đã bị khóa!' });
      }
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (isValid) {
        clearLoginFailure(event)
        const token = jwt.sign(
          { id: user.id, username: user.username, role: 'user', admin_id: user.admin_id },
          jwtSecret,
          { expiresIn: '30d' }
        );

        setCookie(event, 'auth_token', token, {
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
        setCookie(event, 'user_role', 'user', { path: '/' });
        return { success: true, role: 'user', message: 'Khách login thành công!' };
      }
    }

    recordLoginFailure(event)
    await addAuditLog({
      actorType: 'system',
      action: 'login_failed_password',
      targetType: 'username_or_email',
      targetId: String(body.username || body.email || ''),
    })
    throw createError({ statusCode: 401, statusMessage: 'Sai tài khoản hoặc mật khẩu!' });
  } catch (error: any) {
    if (error.statusCode) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.statusMessage })
    }
    console.error('[auth/login]', error?.message || error)
    if (error?.code) console.error('[auth/login] code:', error.code)
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      throw createError({ statusCode: 503, statusMessage: 'Không kết nối được database. Kiểm tra MySQL và file .env.' })
    }
    if (error?.code === 'ER_ACCESS_DENIED_ERROR' || error?.code === 'ER_BAD_DB_ERROR') {
      throw createError({ statusCode: 503, statusMessage: 'Cấu hình database sai. Kiểm tra DB_NAME, DB_USER, DB_PASS trong .env.' })
    }
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      throw createError({ statusCode: 503, statusMessage: 'Bảng admins/users chưa tồn tại. Chạy script init SQL.' })
    }
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Lỗi xử lý đăng nhập' })
  }
});
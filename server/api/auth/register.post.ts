import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { addAuditLog } from '../../utils/audit'
import { getJwtSecret } from '../../utils/jwt'

const JWT_SECRET = getJwtSecret()
const COOKIE_NAME = 'register_ref_claim'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, email, password } = body

  if (!username?.trim() || !email?.trim() || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Vui lòng nhập đủ thông tin (username, email, password)!' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Mật khẩu tối thiểu 6 ký tự!' })
  }

  let adminId = 1
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { admin_id?: number; purpose?: string }
      if (decoded.purpose === 'register_ref' && decoded.admin_id) {
        adminId = decoded.admin_id
      }
    } catch {
      // token hết hạn hoặc invalid
    }
    deleteCookie(event, COOKIE_NAME, { path: '/' })
  }

  const [byUsername]: any = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()])
  if (byUsername.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập đã tồn tại!' })
  }
  const [byEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim()])
  if (byEmail.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Email đã được đăng ký!' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    // Lưu user vào cơ sở dữ liệu
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, password_hash, admin_id) VALUES (?, ?, ?, ?)',
      [username.trim(), email.trim(), hashedPassword, adminId]
    );

    await addAuditLog({
      actorType: 'system',
      action: 'user_registered',
      targetType: 'user',
      targetId: result.insertId,
      metadata: { admin_id: adminId, email: email.trim() },
    })

    return { 
      success: true, 
      message: 'Đăng ký thành công!', 
      userId: result.insertId,
      assignedToAdmin: adminId 
    };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập hoặc Email đã tồn tại!' });
    }
    throw createError({ statusCode: 500, statusMessage: 'Lỗi Database trong quá trình đăng ký' });
  }
});
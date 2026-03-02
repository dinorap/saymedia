import bcrypt from 'bcryptjs'
import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  if (currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới tạo được người dùng' })
  }

  const body = await readBody(event)
  const { username, email, password, admin_id } = body
  if (!username?.trim() || !email?.trim() || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu username, email hoặc password' })
  }

  const targetAdminId = parseInt(admin_id, 10)
  if (!targetAdminId || isNaN(targetAdminId)) {
    throw createError({ statusCode: 400, statusMessage: 'Chọn Admin phụ trách' })
  }

  const [admins]: any = await pool.query('SELECT id FROM admins WHERE id = ?', [targetAdminId])
  if (admins.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Admin không tồn tại' })
  }

  const [byUsername]: any = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()])
  if (byUsername.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập đã tồn tại!' })
  }
  const [byEmail]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim()])
  if (byEmail.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Email đã được đăng ký!' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  await pool.query(
    'INSERT INTO users (username, email, password_hash, admin_id) VALUES (?, ?, ?, ?)',
    [username.trim(), email.trim(), hashedPassword, targetAdminId]
  )
  return { success: true, message: 'Tạo người dùng thành công' }
})

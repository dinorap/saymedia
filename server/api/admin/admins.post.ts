import bcrypt from 'bcryptjs'
import pool from '../../utils/db'

function randomRefCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser || currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới tạo được admin' })
  }

  const body = await readBody(event)
  const { username, password, role } = body
  if (!username?.trim() || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu username hoặc password' })
  }

  let r: 'admin_0' | 'admin_1' | 'admin_2'
  if (role === 'admin_0') {
    r = 'admin_0'
  } else if (role === 'admin_2') {
    // Đảm bảo cột role hỗ trợ admin_2 (enum) – idempotent
    try {
      await pool.query(
        "ALTER TABLE admins MODIFY COLUMN role ENUM('admin_0', 'admin_1', 'admin_2') NOT NULL",
      )
    } catch {
      // bỏ qua nếu đã đúng schema hoặc không phải ENUM
    }
    r = 'admin_2'
  } else {
    r = 'admin_1'
  }

  const [byUsername]: any = await pool.query('SELECT id FROM admins WHERE username = ?', [username.trim()])
  if (byUsername.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tên đăng nhập admin đã tồn tại!' })
  }

  let refCode = randomRefCode()
  for (let i = 0; i < 20; i++) {
    const [existing]: any = await pool.query('SELECT id FROM admins WHERE ref_code = ?', [refCode])
    if (existing.length === 0) break
    refCode = randomRefCode()
    if (i === 19) throw createError({ statusCode: 500, statusMessage: 'Không tạo được mã ref duy nhất. Thử lại!' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  await pool.query(
    'INSERT INTO admins (username, password_hash, role, ref_code) VALUES (?, ?, ?, ?)',
    [username.trim(), hashedPassword, r, refCode]
  )
  return { success: true, message: 'Tạo admin thành công' }
})

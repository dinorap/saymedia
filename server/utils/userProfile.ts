import pool from './db'

let schemaReady = false

export async function ensureUserProfileSchema() {
  if (schemaReady) return

  try {
    // Tên người dùng để hiển thị/tham chiếu thay vì username đăng nhập.
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN display_name VARCHAR(100) NULL DEFAULT NULL
    `)
  } catch {
    // Column may already exist.
  }

  try {
    // Số điện thoại để hỗ trợ mua/bán nhanh hơn (chat/điện thoại).
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN phone VARCHAR(20) NULL DEFAULT NULL
    `)
  } catch {
    // Column may already exist.
  }

  schemaReady = true
}


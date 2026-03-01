import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  // Chỉ admin_0 (superadmin) mới xem được danh sách admins
  if (currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền xem danh sách admin' })
  }

  const [admins]: any = await pool.query(
    'SELECT id, username, role, ref_code, is_active, created_at FROM admins ORDER BY id'
  )
  return { success: true, data: admins }
})

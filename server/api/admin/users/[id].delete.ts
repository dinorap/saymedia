import pool from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const [existing]: any = await pool.query('SELECT id, admin_id FROM users WHERE id = ?', [id])
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Người dùng không tồn tại' })
  }

  if (currentUser.role === 'admin_1' && existing[0].admin_id !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ xóa được người dùng của mình' })
  }

  await pool.query('DELETE FROM users WHERE id = ?', [id])
  return { success: true, message: 'Đã xóa người dùng' }
})

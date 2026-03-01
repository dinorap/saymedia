import pool from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser || currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới xóa được admin' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const numId = parseInt(id, 10)
  if (numId === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Không thể xóa Super Admin gốc' })
  }

  const [users]: any = await pool.query('SELECT id FROM users WHERE admin_id = ?', [id])
  if (users.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Admin này đang có người dùng. Chuyển người dùng sang admin khác trước khi xóa.' })
  }

  await pool.query('DELETE FROM admins WHERE id = ?', [id])
  return { success: true, message: 'Đã xóa admin' }
})

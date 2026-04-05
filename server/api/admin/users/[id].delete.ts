import pool from '../../../utils/db'
import { resolveShopAdminId } from '../../../utils/adminHierarchy'
import { assertShopManagementRole } from '../../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const [existing]: any = await pool.query('SELECT id, admin_id FROM users WHERE id = ?', [id])
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Người dùng không tồn tại' })
  }

  if (currentUser.role === 'admin_1' && existing[0].admin_id !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ xóa được người dùng của mình' })
  }
  if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    if (Number(existing[0].admin_id) !== shopId) {
      throw createError({ statusCode: 403, statusMessage: 'Chỉ xóa được người dùng trong hệ thống đại lý' })
    }
  }

  await pool.query('DELETE FROM users WHERE id = ?', [id])
  return { success: true, message: 'Đã xóa người dùng' }
})

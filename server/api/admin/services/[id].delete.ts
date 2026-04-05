import pool from '../../../utils/db'
import { ensureServicesSchema } from '../../../utils/services'
import { resolveShopAdminId } from '../../../utils/adminHierarchy'
import { assertShopManagementRole } from '../../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  await ensureServicesSchema()

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ' })
  }

  const [[service]]: any = await pool.query(
    'SELECT id, admin_id FROM services WHERE id = ? LIMIT 1',
    [id],
  )
  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy dịch vụ' })
  }
  if (currentUser.role === 'admin_1' && Number(service.admin_id) !== Number(currentUser.id)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Bạn chỉ được xóa dịch vụ do mình tạo',
    })
  }
  if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    if (Number(service.admin_id) !== shopId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Bạn chỉ được xóa dịch vụ trong hệ thống đại lý',
      })
    }
  }

  await pool.query('DELETE FROM services WHERE id = ?', [id])
  return { success: true }
})

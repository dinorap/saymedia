import pool from '../../../utils/db'
import { ensureServicesSchema } from '../../../utils/services'
import { resolveShopAdminId } from '../../../utils/adminHierarchy'
import { assertShopManagementRole } from '../../../utils/authHelpers'

const MAX_NAME = 120
const MAX_DESCRIPTION = 2000

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
      statusMessage: 'Bạn chỉ được sửa dịch vụ do mình tạo',
    })
  }
  if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    if (Number(service.admin_id) !== shopId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Bạn chỉ được sửa dịch vụ trong hệ thống đại lý',
      })
    }
  }

  const body = await readBody(event).catch(() => ({}))
  const updates: string[] = []
  const values: any[] = []

  if (body?.name != null) {
    const name = String(body.name || '').trim().slice(0, MAX_NAME)
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Tên dịch vụ là bắt buộc' })
    }
    updates.push('name = ?')
    values.push(name)
  }

  if (body?.description != null) {
    const description = String(body.description || '').trim()
    updates.push('description = ?')
    values.push(description ? description.slice(0, MAX_DESCRIPTION) : null)
  }

  if (body?.is_active != null) {
    updates.push('is_active = ?')
    values.push(body.is_active ? 1 : 0)
  }

  if (!updates.length) {
    return { success: true }
  }

  values.push(id)
  await pool.query(
    `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
    values,
  )

  return { success: true }
})

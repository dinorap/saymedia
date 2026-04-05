import pool from '../../../utils/db'
import { ensureProductKeySchema } from '../../../utils/productKeys'
import { assertShopManagementRole } from '../../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  await ensureProductKeySchema()

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ' })
  }

  const params: any[] = [id]
  let sql = 'DELETE FROM product_keys WHERE id = ?'

  if (currentUser.role === 'admin_1' || currentUser.role === 'admin_2') {
    sql += ' AND admin_id = ?'
    params.push(currentUser.id)
  }

  sql += ' LIMIT 1'

  const [result]: any = await pool.query(sql, params)
  if (!result?.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy key' })
  }

  return { success: true }
})


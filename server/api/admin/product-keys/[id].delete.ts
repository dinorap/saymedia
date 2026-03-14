import pool from '../../../utils/db'
import { ensureProductKeySchema } from '../../../utils/productKeys'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  await ensureProductKeySchema()

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID không hợp lệ' })
  }

  const [result]: any = await pool.query('DELETE FROM product_keys WHERE id = ? LIMIT 1', [id])
  if (!result?.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy key' })
  }

  return { success: true }
})


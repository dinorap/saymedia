import pool from '../../../utils/db'
import {
  ensureProductKeySchema,
  VALID_KEY_DURATIONS,
  type ProductKeyDuration,
} from '../../../utils/productKeys'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  await ensureProductKeySchema()

  const body = await readBody(event).catch(() => ({}))
  const productId = body?.product_id ? Number(body.product_id) : null
  const rawDuration = String(body?.valid_duration || '').trim() as ProductKeyDuration
  const rawPrice = Number(body?.price ?? 0)

  if (!productId || !Number.isFinite(productId) || productId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'product_id không hợp lệ' })
  }
  if (!VALID_KEY_DURATIONS.includes(rawDuration)) {
    throw createError({ statusCode: 400, statusMessage: 'Thời hạn key không hợp lệ' })
  }
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Giá key không hợp lệ' })
  }

  const price = Math.round(rawPrice)

  const params: any[] = [price, productId, rawDuration]
  let sql = `
      UPDATE product_keys
      SET price = ?
      WHERE product_id = ? AND valid_duration = ?
    `

  // admin_1 chỉ được sửa giá các key do chính mình nhập
  if (currentUser.role === 'admin_1') {
    sql += ' AND admin_id = ?'
    params.push(currentUser.id)
  }

  const [result]: any = await pool.query(sql, params)

  if (!result?.affectedRows) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Không tìm thấy key nào để cập nhật',
    })
  }

  return {
    success: true,
    updated: result.affectedRows || 0,
  }
})


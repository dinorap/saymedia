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

  const query = getQuery(event)
  const search = query.search ? String(query.search).trim() : ''
  const duration = query.duration ? String(query.duration).trim() : ''

  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 20), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  limit = Math.min(100, Math.max(10, limit))
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []

  if (search) {
    where.push('pk.product_name LIKE ?')
    const kw = `%${search}%`
    params.push(kw)
  }
  if (duration) {
    where.push('pk.valid_duration = ?')
    params.push(duration)
  }

  if (currentUser.role === 'admin_1' || currentUser.role === 'admin_2') {
    where.push('pk.admin_id = ?')
    params.push(currentUser.id)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [[{ total }]]: any = await pool.query(
    `
      SELECT COUNT(DISTINCT pk.product_id, pk.product_name) AS total
      FROM product_keys pk
      ${whereSql}
    `,
    params,
  )

  const [rows]: any = await pool.query(
    `
      SELECT
        pk.product_id,
        pk.product_name,
        COUNT(*) AS total_keys,
        MIN(pk.created_at) AS first_created_at,
        MAX(pk.created_at) AS last_created_at,
        GROUP_CONCAT(DISTINCT pk.valid_duration ORDER BY pk.valid_duration) AS durations
      FROM product_keys pk
      ${whereSql}
      GROUP BY pk.product_id, pk.product_name
      ORDER BY pk.product_name ASC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  )

  return {
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
})


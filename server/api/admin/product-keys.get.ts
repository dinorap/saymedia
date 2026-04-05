import pool from '../../utils/db'
import { ensureProductKeySchema } from '../../utils/productKeys'
import { assertShopManagementRole } from '../../utils/authHelpers'

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
  const productIdRaw = query.product_id ? Number(query.product_id) : null
  const sortFieldRaw = String(query.sort_field || '').trim()
  const sortDirRaw = String(query.sort_dir || '').trim().toLowerCase()

  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 20), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  limit = Math.min(100, Math.max(10, limit))
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []

  if (productIdRaw && Number.isFinite(productIdRaw) && productIdRaw > 0) {
    where.push('pk.product_id = ?')
    params.push(productIdRaw)
  }

  // admin_1 / admin_2 chỉ xem key do chính mình nhập
  if (currentUser.role === 'admin_1' || currentUser.role === 'admin_2') {
    where.push('pk.admin_id = ?')
    params.push(currentUser.id)
  }

  if (search) {
    where.push('(pk.product_name LIKE ? OR pk.`key` LIKE ?)')
    const kw = `%${search}%`
    params.push(kw, kw)
  }
  if (duration) {
    where.push('pk.valid_duration = ?')
    params.push(duration)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const allowedSortFields = new Set(['created_at', 'price', 'valid_duration'])
  const sortField = allowedSortFields.has(sortFieldRaw)
    ? sortFieldRaw
    : 'created_at'
  const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC'

  const orderExpression =
    sortField === 'price'
      ? 'pk.price'
      : sortField === 'valid_duration'
        ? 'pk.valid_duration'
        : 'pk.created_at'

  const [[{ total }]]: any = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM product_keys pk
      LEFT JOIN products p ON pk.product_id = p.id
      ${whereSql}
    `,
    params,
  )

  const [rows]: any = await pool.query(
    `
      SELECT
        pk.id,
        pk.product_id,
        pk.product_name,
        pk.\`key\`,
        pk.price,
        pk.valid_duration,
        pk.created_at,
        p.name AS linked_product_name
      FROM product_keys pk
      LEFT JOIN products p ON pk.product_id = p.id
      ${whereSql}
      ORDER BY ${orderExpression} ${sortDir}, pk.id DESC
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


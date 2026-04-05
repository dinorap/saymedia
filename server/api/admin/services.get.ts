import pool from '../../utils/db'
import { resolveShopAdminId } from '../../utils/adminHierarchy'
import { ensureServicesSchema } from '../../utils/services'
import { assertShopManagementRole } from '../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  await ensureServicesSchema()

  const query = getQuery(event)
  const search = query.search ? String(query.search).trim() : ''

  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 10), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  limit = Math.min(50, Math.max(5, limit))
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []

  if (currentUser.role === 'admin_1') {
    where.push('s.admin_id = ?')
    params.push(currentUser.id)
  } else if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    where.push('s.admin_id = ?')
    params.push(shopId)
  }
  if (search) {
    where.push('(s.name LIKE ? OR s.description LIKE ?)')
    const keyword = `%${search}%`
    params.push(keyword, keyword)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM services s ${whereSql}`,
    params,
  )

  const [rows]: any = await pool.query(
    `
      SELECT s.id, s.admin_id, s.name, s.description, s.is_active, s.created_at, s.updated_at,
             a.username AS admin_username
      FROM services s
      LEFT JOIN admins a ON s.admin_id = a.id
      ${whereSql}
      ORDER BY s.created_at DESC
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

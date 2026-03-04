import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const queryParams = getQuery(event)
  const adminId = queryParams.admin_id ? parseInt(String(queryParams.admin_id), 10) : null
  const search = queryParams.search ? String(queryParams.search).trim() : ''
  const status = queryParams.status ? String(queryParams.status).trim() : ''
  let page = parseInt(String(queryParams.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(queryParams.limit || 10), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  limit = Math.min(50, Math.max(5, limit))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (currentUser.role === 'admin_1') {
    conditions.push('u.admin_id = ?')
    params.push(currentUser.id)
  } else if (adminId && !isNaN(adminId)) {
    conditions.push('u.admin_id = ?')
    params.push(adminId)
  }

  if (search) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ? OR a.username LIKE ?)')
    const term = `%${search}%`
    params.push(term, term, term)
  }

  if (status) {
    conditions.push('u.status = ?')
    params.push(status)
  }

  const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) AS total FROM users u
    LEFT JOIN admins a ON u.admin_id = a.id
    ${whereClause}
  `
  const [[{ total }]]: any = await pool.query(countQuery, params)

  const dataQuery = `
    SELECT
      u.id,
      u.username,
      u.email,
      u.admin_id,
      u.status,
      u.created_at,
      u.credit,
      a.username AS admin_username
    FROM users u
    LEFT JOIN admins a ON u.admin_id = a.id
    ${whereClause}
    ORDER BY u.id ASC
    LIMIT ? OFFSET ?
  `
  const [users]: any = await pool.query(dataQuery, [...params, limit, offset])

  return {
    success: true,
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }
})
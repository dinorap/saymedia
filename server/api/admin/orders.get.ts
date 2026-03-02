import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const query = getQuery(event)
  const adminId = query.admin_id ? parseInt(String(query.admin_id), 10) : null
  const status = query.status ? String(query.status) : ''
  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 10), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  limit = Math.min(50, Math.max(5, limit))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  // Phân quyền:
  // - admin_1: chỉ xem đơn của khách mình quản lý (orders.admin_id = currentUser.id)
  // - admin_0: có thể lọc theo admin_id tùy ý
  if (currentUser.role === 'admin_1') {
    conditions.push('o.admin_id = ?')
    params.push(currentUser.id)
  } else if (adminId && !isNaN(adminId)) {
    conditions.push('o.admin_id = ?')
    params.push(adminId)
  }

  if (status) {
    conditions.push('o.status = ?')
    params.push(status)
  }

  const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ${whereClause}
  `
  const [[{ total }]]: any = await pool.query(countQuery, params)

  const dataQuery = `
    SELECT
      o.id,
      o.user_id,
      o.admin_id,
      o.amount,
      o.status,
      o.created_at,
      u.username AS user_username,
      u.email AS user_email,
      a.username AS admin_username
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN admins a ON o.admin_id = a.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `
  const [rows]: any = await pool.query(dataQuery, [...params, limit, offset])

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


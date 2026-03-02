import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  if (currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới xem được logs' })
  }

  const query = getQuery(event)
  const action = query.action ? String(query.action).trim() : ''
  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 20), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  limit = Math.min(100, Math.max(10, limit))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  if (action) {
    conditions.push('action = ?')
    params.push(action)
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`,
    params,
  )

  const [rows]: any = await pool.query(
    `
      SELECT id, actor_type, actor_id, action, target_type, target_id, metadata, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
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


import pool from '../../utils/db'
import { checkRateLimit, rateLimitKey } from '../../utils/rateLimit'

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
  const fromDate = query.from ? String(query.from).trim() : ''
  const toDate = query.to ? String(query.to).trim() : ''
  const formatCsv = query.format === 'csv'

  if (formatCsv) {
    checkRateLimit({
      key: rateLimitKey(['export_csv', 'admin_logs', currentUser.id]),
      max: 2,
      windowMs: 60_000,
      statusMessage: 'Bạn export quá nhanh, vui lòng thử lại sau.',
      auditAction: 'rate_limited_export_csv',
      auditMetadata: { scope: 'admin_logs' },
    })
  }

  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 20), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  if (formatCsv) {
    limit = 10000
    page = 1
  } else {
    limit = Math.min(100, Math.max(10, limit))
  }
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  if (action) {
    conditions.push('action = ?')
    params.push(action)
  }
  if (fromDate) {
    conditions.push('created_at >= ?')
    params.push(fromDate + ' 00:00:00')
  }
  if (toDate) {
    conditions.push('created_at <= ?')
    params.push(toDate + ' 23:59:59')
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

  if (formatCsv) {
    const headers = ['id', 'actor_type', 'actor_id', 'action', 'target_type', 'target_id', 'metadata', 'created_at']
    const escape = (v: any) => {
      const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v))
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push(headers.map((h) => escape(r[h])).join(','))
    }
    const csv = lines.join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="admin-logs.csv"')
    return csv
  }

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


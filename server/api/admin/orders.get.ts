import pool from '../../utils/db'
import { ensureOrderRefundSchema } from '../../utils/orderRefund'
import { ensureCommerceSchema } from '../../utils/commerce'
import { checkRateLimit, rateLimitKey } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const query = getQuery(event)
  await ensureOrderRefundSchema()
  await ensureCommerceSchema()
  const adminId = query.admin_id ? parseInt(String(query.admin_id), 10) : null
  const userId = query.user_id ? parseInt(String(query.user_id), 10) : null
  const status = query.status ? String(query.status) : ''
  const search = query.search ? String(query.search).trim() : ''
  const fromDate = query.from ? String(query.from).trim() : ''
  const toDate = query.to ? String(query.to).trim() : ''
  const formatCsv = query.format === 'csv'

  if (formatCsv && currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ admin_0 mới được export CSV' })
  }
  if (formatCsv) {
    checkRateLimit({
      key: rateLimitKey(['export_csv', 'admin_orders', currentUser.id]),
      max: 3,
      windowMs: 60_000,
      statusMessage: 'Bạn export quá nhanh, vui lòng thử lại sau.',
      auditAction: 'rate_limited_export_csv',
      auditMetadata: { scope: 'admin_orders' },
    })
  }

  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 10), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  if (formatCsv) {
    limit = 10000
    page = 1
  } else {
    limit = Math.min(50, Math.max(5, limit))
  }
  const offset = (page - 1) * limit

  const sortFieldRaw = String(query.sort_field || '').trim()
  const sortDirRaw = String(query.sort_dir || '').trim().toLowerCase()
  const allowedSortFields = new Set(['created_at', 'amount', 'status'])
  const sortField = allowedSortFields.has(sortFieldRaw)
    ? sortFieldRaw
    : 'created_at'
  const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC'

  const conditions: string[] = []
  const params: any[] = []

  // Phân quyền:
  // - admin_1:
  //    + Đơn của KH do mình phụ trách (users.admin_id = currentUser.id)
  //    + Đơn mà mình là người bán hộ (orders.seller_admin_id = currentUser.id)
  //    + Đơn của sản phẩm do mình làm chủ (orders.product_owner_admin_id = currentUser.id)
  // - admin_0: có thể lọc theo admin_id phụ trách user (users.admin_id = admin_id)
  if (currentUser.role === 'admin_1') {
    conditions.push(
      '(u.admin_id = ? OR o.seller_admin_id = ? OR o.product_owner_admin_id = ?)',
    )
    params.push(currentUser.id, currentUser.id, currentUser.id)
  } else if (adminId && !isNaN(adminId)) {
    conditions.push('u.admin_id = ?')
    params.push(adminId)
  }

  if (userId && !isNaN(userId)) {
    conditions.push('o.user_id = ?')
    params.push(userId)
  }

  if (status) {
    conditions.push('o.status = ?')
    params.push(status)
  }

  if (search) {
    conditions.push(
      '(u.username LIKE ? OR u.email LIKE ? OR p.name LIKE ? OR CAST(o.id AS CHAR) LIKE ?)',
    )
    const term = `%${search}%`
    params.push(term, term, term, term)
  }
  if (fromDate) {
    conditions.push('o.created_at >= ?')
    params.push(fromDate + ' 00:00:00')
  }
  if (toDate) {
    conditions.push('o.created_at <= ?')
    params.push(toDate + ' 23:59:59')
  }

  const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN products p ON o.product_id = p.id
    ${whereClause}
  `
  const [[{ total }]]: any = await pool.query(countQuery, params)

  const orderExpression =
    sortField === 'amount'
      ? 'COALESCE(o.amount_credit, ROUND(o.amount))'
      : sortField === 'status'
        ? 'o.status'
        : 'o.created_at'

  const dataQuery = `
    SELECT
      o.id,
      o.user_id,
      o.product_id,
      o.admin_id,
      o.seller_admin_id,
      o.product_owner_admin_id,
      COALESCE(o.amount_credit, ROUND(o.amount)) AS amount,
      o.amount_credit,
      o.paid_part,
      o.bonus_part,
      o.seller_ref,
      o.status,
      o.note,
      o.refund_reason,
      o.refunded_at,
      o.refunded_by_admin_id,
      o.refund_request_reason,
      o.refund_requested_at,
      o.refund_request_status,
      o.created_at,
      u.username AS user_username,
      u.email AS user_email,
      a.username AS admin_username,
      sa.username AS seller_username,
      oa.username AS product_owner_username,
      ra.username AS refunded_by_admin_username,
      p.name AS product_name,
      p.type AS product_type
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN admins a ON u.admin_id = a.id
    LEFT JOIN admins sa ON o.seller_admin_id = sa.id
    LEFT JOIN admins oa ON o.product_owner_admin_id = oa.id
    LEFT JOIN admins ra ON o.refunded_by_admin_id = ra.id
    LEFT JOIN products p ON o.product_id = p.id
    ${whereClause}
    ORDER BY ${orderExpression} ${sortDir}, o.id DESC
    LIMIT ? OFFSET ?
  `
  const [rows]: any = await pool.query(dataQuery, [...params, limit, offset])

  if (formatCsv) {
    const headers = ['id', 'user_username', 'user_email', 'admin_username', 'product_name', 'amount', 'status', 'note', 'refund_reason', 'created_at']
    const escape = (v: any) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push(headers.map((h) => escape(r[h])).join(','))
    }
    const csv = lines.join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="admin-orders.csv"')
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


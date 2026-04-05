import pool from '../../utils/db'
import { resolveShopAdminId } from '../../utils/adminHierarchy'
import { cleanupExpiredPendingTransactions, convertVndToCredit } from '../../utils/payment'
import { checkRateLimit, rateLimitKey } from '../../utils/rateLimit'
import { assertShopManagementRole } from '../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  await cleanupExpiredPendingTransactions()
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  const query = getQuery(event)
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
      key: rateLimitKey(['export_csv', 'admin_deposits', currentUser.id]),
      max: 3,
      windowMs: 60_000,
      statusMessage: 'Bạn export quá nhanh, vui lòng thử lại sau.',
      auditAction: 'rate_limited_export_csv',
      auditMetadata: { scope: 'admin_deposits' },
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

  // Phân quyền: admin_1 chỉ xem giao dịch của khách thuộc mình; admin_2 theo shop (admin_1)
  if (currentUser.role === 'admin_1') {
    conditions.push('u.admin_id = ?')
    params.push(currentUser.id)
  } else if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    conditions.push('u.admin_id = ?')
    params.push(shopId)
  } else if (adminId && !isNaN(adminId)) {
    conditions.push('u.admin_id = ?')
    params.push(adminId)
  }

  if (userId && !isNaN(userId)) {
    conditions.push('pt.user_id = ?')
    params.push(userId)
  }

  if (status) {
    conditions.push('pt.status = ?')
    params.push(status)
  }

  if (search) {
    conditions.push(
      '(u.username LIKE ? OR u.email LIKE ? OR pt.trans_id LIKE ? OR CAST(pt.id AS CHAR) LIKE ?)',
    )
    const term = `%${search}%`
    params.push(term, term, term, term)
  }
  if (fromDate) {
    conditions.push('pt.created_at >= ?')
    params.push(fromDate + ' 00:00:00')
  }
  if (toDate) {
    conditions.push('pt.created_at <= ?')
    params.push(toDate + ' 23:59:59')
  }

  const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM payment_transactions pt
    JOIN users u ON pt.user_id = u.id
    ${whereClause}
  `
  const [[{ total }]]: any = await pool.query(countQuery, params)

  const orderExpression =
    sortField === 'amount'
      ? 'pt.amount'
      : sortField === 'status'
        ? 'pt.status'
        : 'pt.created_at'

  const dataQuery = `
    SELECT
      pt.id,
      pt.trans_id,
      pt.user_id,
      pt.provider,
      pt.amount,
      pt.actual_amount,
      pt.credit_amount,
      pt.status,
      pt.memo,
      pt.promo_code,
      pt.promo_bonus_credit,
      pt.created_at,
      u.username AS user_username,
      u.email AS user_email,
      u.admin_id,
      a.username AS admin_username
    FROM payment_transactions pt
    JOIN users u ON pt.user_id = u.id
    LEFT JOIN admins a ON u.admin_id = a.id
    ${whereClause}
    ORDER BY ${orderExpression} ${sortDir}, pt.id DESC
    LIMIT ? OFFSET ?
  `
  const [rows]: any = await pool.query(dataQuery, [...params, limit, offset])

  // Tính thêm expected_credit từ số tiền nạp, để hiển thị tín chỉ dự kiến
  for (const row of rows) {
    const conv = convertVndToCredit(Number(row.amount || 0))
    row.expected_credit = conv.credit
  }

  if (formatCsv) {
    const headers = ['id', 'trans_id', 'user_username', 'admin_username', 'provider', 'amount', 'actual_amount', 'credit_amount', 'expected_credit', 'status', 'promo_code', 'created_at']
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
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="admin-deposits.csv"')
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


import pool from '../../utils/db'
import { convertVndToCredit } from '../../utils/payment'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const query = getQuery(event)
  const adminId = query.admin_id ? parseInt(String(query.admin_id), 10) : null
  const status = query.status ? String(query.status) : ''
  const search = query.search ? String(query.search).trim() : ''
  let page = parseInt(String(query.page || 1), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  let limit = parseInt(String(query.limit || 10), 10)
  if (!Number.isFinite(limit) || limit < 1) limit = 10
  limit = Math.min(50, Math.max(5, limit))
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

  // Phân quyền: admin_1 chỉ xem giao dịch của khách thuộc mình
  if (currentUser.role === 'admin_1') {
    conditions.push('u.admin_id = ?')
    params.push(currentUser.id)
  } else if (adminId && !isNaN(adminId)) {
    conditions.push('u.admin_id = ?')
    params.push(adminId)
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


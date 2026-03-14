import jwt from 'jsonwebtoken'
import pool from '../../utils/db'

const JWT_SECRET =
  process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  let decoded: { id: number; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Phiên đăng nhập hết hạn',
    })
  }

  if (decoded.role !== 'user') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Chỉ người dùng mới xem lịch sử nạp tiền',
    })
  }

  const query = getQuery(event)
  const from = query.from ? String(query.from).trim() : ''
  const to = query.to ? String(query.to).trim() : ''
  const format = query.format ? String(query.format).trim().toLowerCase() : ''

  let limit = 50
  if (query.limit) {
    const parsed = parseInt(String(query.limit), 10)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
      limit = parsed
    }
  }

  const conditions: string[] = ['user_id = ?']
  const params: any[] = [decoded.id]

  if (from) {
    conditions.push('created_at >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('created_at <= ?')
    params.push(to)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        trans_id,
        amount,
        actual_amount,
        status,
        provider,
        memo,
        created_at
      FROM payment_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [...params, limit],
  )

  if (format === 'csv') {
    const header = [
      'id',
      'trans_id',
      'amount',
      'actual_amount',
      'status',
      'provider',
      'memo',
      'created_at',
    ]
    const lines = [header.join(',')]

    for (const row of rows || []) {
      const line = [
        row.id,
        row.trans_id,
        row.amount,
        row.actual_amount ?? '',
        row.status,
        row.provider,
        (row.memo || '').toString(),
        row.created_at,
      ].map((v) => {
        const s = v == null ? '' : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      lines.push(line.join(','))
    }

    const csv = lines.join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(
      event,
      'Content-Disposition',
      'attachment; filename="deposit-history.csv"',
    )
    return csv
  }

  return {
    success: true,
    data: rows,
  }
})



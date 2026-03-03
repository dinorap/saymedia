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
      statusMessage: 'Chỉ người dùng mới xem lịch sử đơn hàng',
    })
  }

  let limit = 50
  const query = getQuery(event)
  if (query.limit) {
    const parsed = parseInt(String(query.limit), 10)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) {
      limit = parsed
    }
  }

  const [rows]: any = await pool.query(
    `
      SELECT
        o.id,
        o.admin_id,
        o.product_id,
        o.amount,
        o.status,
        o.note,
        o.created_at,
        p.name AS product_name,
        p.type AS product_type
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT ?
    `,
    [decoded.id, limit],
  )

  return {
    success: true,
    data: rows,
  }
})


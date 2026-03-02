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

  // Chỉ lấy lịch sử nạp của user hiện tại
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
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [decoded.id],
  )

  return {
    success: true,
    data: rows,
  }
})



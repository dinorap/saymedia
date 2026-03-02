import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import {
  PAYMENT_EXPIRE_MINUTES,
  ensurePaymentSchema,
  generateTransId,
  buildTransferMemo,
  buildQrUrl
} from '../../utils/payment'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })

  let decoded: { id: number; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }

  if (decoded.role !== 'user') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ người dùng mới nạp tiền được' })
  }

  const body = await readBody(event)
  const amount = parseInt(String(body?.amount || 0), 10)
  if (!amount || amount < 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Số tiền tối thiểu là 10.000 VND' })
  }

  await ensurePaymentSchema()

  const transId = generateTransId(decoded.id)
  const memo = buildTransferMemo(transId, amount)
  const qrUrl = buildQrUrl(amount, memo)

  await pool.query(
    `INSERT INTO payment_transactions (trans_id, user_id, amount, status, memo)
     VALUES (?, ?, ?, 'pending', ?)`,
    [transId, decoded.id, amount, memo]
  )

  return {
    success: true,
    trans_id: transId,
    memo,
    qr_url: qrUrl,
    expires_in_seconds: PAYMENT_EXPIRE_MINUTES * 60
  }
})


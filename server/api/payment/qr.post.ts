import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import {
  PAYMENT_EXPIRE_MINUTES,
  ensurePaymentSchema,
  generateTransId,
  buildTransferMemo,
  buildQrUrl,
  convertVndToCredit,
} from '../../utils/payment'
import { paymentQrSchema, parseBodyOrThrow } from '../../utils/schemas'

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

  const body = parseBodyOrThrow(await readBody(event), paymentQrSchema)
  const amount = body.amount
  const rawPromoCode = (body as any).promo_code as string | null | undefined
  const promoCode = rawPromoCode ? String(rawPromoCode).trim().toUpperCase() : null
  const converted = convertVndToCredit(amount)
  if (converted.credit <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Số tiền nạp chưa đủ để quy đổi tín chỉ (1 tín chỉ = ${converted.vndPerCredit.toLocaleString('vi-VN')}đ)`,
    })
  }

  await ensurePaymentSchema()

  const transId = generateTransId(decoded.id)
  const memo = buildTransferMemo(transId, amount)
  const qrUrl = buildQrUrl(amount, memo)

  await pool.query(
    `INSERT INTO payment_transactions (trans_id, user_id, amount, status, memo, promo_code)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
    [transId, decoded.id, amount, memo, promoCode]
  )

  return {
    success: true,
    trans_id: transId,
    memo,
    qr_url: qrUrl,
    expires_in_seconds: PAYMENT_EXPIRE_MINUTES * 60,
    expected_credit: converted.credit,
    vnd_per_credit: converted.vndPerCredit,
  }
})


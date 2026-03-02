import jwt from 'jsonwebtoken'
import pool from '../../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES } from '../../../utils/payment'
import { addAuditLog } from '../../../utils/audit'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_TEST_ENABLED !== 'true') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const token = getCookie(event, 'auth_token')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })

  let decoded: { id: number; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }

  if (decoded.role !== 'user') {
    throw createError({ statusCode: 403, statusMessage: 'Không có quyền' })
  }

  const body = await readBody(event)
  const transId = String(body?.trans_id || '').trim()
  if (!transId) throw createError({ statusCode: 400, statusMessage: 'Thiếu trans_id' })

  await ensurePaymentSchema()

  const [rows]: any = await pool.query(
    `SELECT trans_id, user_id, amount, status, created_at,
            TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
     FROM payment_transactions
     WHERE trans_id = ? LIMIT 1`,
    [transId]
  )

  if (!rows.length || rows[0].user_id !== decoded.id || rows[0].status !== 'pending') {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy giao dịch pending' })
  }

  const tx = rows[0]
  if (Number(tx.age_seconds || 0) > PAYMENT_EXPIRE_MINUTES * 60) {
    await pool.query(`UPDATE payment_transactions SET status = 'cancelled' WHERE trans_id = ?`, [transId])
    throw createError({ statusCode: 400, statusMessage: 'QR đã hết hạn' })
  }

  await pool.query(`UPDATE payment_transactions SET status = 'success' WHERE trans_id = ?`, [transId])
  await pool.query(`UPDATE users SET credit = credit + ? WHERE id = ?`, [tx.amount, decoded.id])

  await addAuditLog({
    actorType: 'user',
    actorId: decoded.id,
    action: 'payment_success_test',
    targetType: 'payment_transaction',
    targetId: transId,
    metadata: { amount: tx.amount, source: 'simulate-payment' },
  })

  const [urows]: any = await pool.query('SELECT credit FROM users WHERE id = ? LIMIT 1', [decoded.id])
  return {
    success: true,
    transfer_amount: tx.amount,
    actual_amount: tx.amount,
    new_credit: urows?.[0]?.credit || 0
  }
})


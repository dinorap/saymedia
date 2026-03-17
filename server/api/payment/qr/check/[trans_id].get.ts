import jwt from 'jsonwebtoken'
import pool from '../../../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES } from '../../../../utils/payment'
import { getJwtSecret } from '../../../../utils/jwt'

const JWT_SECRET = getJwtSecret()

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })

  let decoded: { id: number; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn' })
  }

  const transId = getRouterParam(event, 'trans_id')
  if (!transId) throw createError({ statusCode: 400, statusMessage: 'Thiếu trans_id' })

  await ensurePaymentSchema()

  const [rows]: any = await pool.query(
    `SELECT trans_id, user_id, amount, status, created_at,
            TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
     FROM payment_transactions
     WHERE trans_id = ? LIMIT 1`,
    [transId]
  )

  if (!rows.length || rows[0].user_id !== decoded.id) {
    return { success: false, status: 'not_found' }
  }

  const tx = rows[0]

  if (tx.status === 'pending' && Number(tx.age_seconds || 0) > PAYMENT_EXPIRE_MINUTES * 60) {
    await pool.query(`UPDATE payment_transactions SET status = 'cancelled' WHERE trans_id = ?`, [transId])
    return { success: true, status: 'expired' }
  }

  if (tx.status === 'success') {
    const [urows]: any = await pool.query('SELECT credit FROM users WHERE id = ? LIMIT 1', [decoded.id])
    return {
      success: true,
      status: 'success',
      transfer_amount: tx.amount,
      new_credit: urows?.[0]?.credit || 0
    }
  }

  if (tx.status === 'cancelled') {
    return { success: true, status: 'cancelled' }
  }

  return { success: true, status: 'pending' }
})


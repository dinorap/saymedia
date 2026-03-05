import jwt from 'jsonwebtoken'
import pool from '../../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES, convertVndToCredit } from '../../../utils/payment'
import { addAuditLog } from '../../../utils/audit'
import { applyCreditChange, ensureCreditLedgerSchema } from '../../../utils/creditLedger'

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
  await ensureCreditLedgerSchema()
  const conn = await pool.getConnection()
  let tx: any = null
  let credited = 0
  let newCredit = 0
  try {
    await conn.beginTransaction()
    const [rows]: any = await conn.query(
      `
        SELECT trans_id, user_id, amount, status, created_at,
               TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
        FROM payment_transactions
        WHERE trans_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [transId],
    )

    if (!rows.length || rows[0].user_id !== decoded.id || rows[0].status !== 'pending') {
      throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy giao dịch pending' })
    }

    tx = rows[0]
    if (Number(tx.age_seconds || 0) > PAYMENT_EXPIRE_MINUTES * 60) {
      await conn.query(`UPDATE payment_transactions SET status = 'cancelled' WHERE trans_id = ?`, [transId])
      throw createError({ statusCode: 400, statusMessage: 'QR đã hết hạn' })
    }

    const converted = convertVndToCredit(Number(tx.amount || 0))
    credited = converted.credit
    if (credited <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Số tiền nạp chưa đủ để quy đổi tín chỉ (1 tín chỉ = ${converted.vndPerCredit.toLocaleString('vi-VN')}đ)`,
      })
    }

    await conn.query(
      `
        UPDATE payment_transactions
        SET status = 'success', actual_amount = ?, credit_amount = ?
        WHERE trans_id = ?
      `,
      [tx.amount, credited, transId],
    )

    const creditResult = await applyCreditChange(conn, {
      userId: decoded.id,
      delta: credited,
      transactionType: 'deposit',
      referenceType: 'payment_transaction',
      referenceId: transId,
      note: `Nạp test ${Number(tx.amount || 0).toLocaleString('vi-VN')}đ`,
      actorType: 'user',
      actorId: decoded.id,
    })
    newCredit = creditResult.afterBalance
    await conn.commit()
  } catch (e) {
    try {
      await conn.rollback()
    } catch {}
    throw e
  } finally {
    conn.release()
  }

  await addAuditLog({
    actorType: 'user',
    actorId: decoded.id,
    action: 'payment_success_test',
    targetType: 'payment_transaction',
    targetId: transId,
    metadata: { amount: tx.amount, credited, source: 'simulate-payment' },
  })
  return {
    success: true,
    transfer_amount: tx.amount,
    actual_amount: tx.amount,
    credited_amount: credited,
    new_credit: newCredit
  }
})


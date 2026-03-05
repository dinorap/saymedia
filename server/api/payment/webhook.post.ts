import pool from '../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES, convertVndToCredit } from '../../utils/payment'
import { addAuditLog } from '../../utils/audit'
import { applyCreditChange, ensureCreditLedgerSchema } from '../../utils/creditLedger'

function extractTransId(content: string) {
  const match = content.match(/AUTO([A-Z0-9]+)-/i)
  return match?.[1]?.toUpperCase() || ''
}

export default defineEventHandler(async (event) => {
  const auth = getHeader(event, 'authorization') || ''
  const expectedKey = process.env.SEPAY_WEBHOOK_API_KEY || ''
  if (!expectedKey) {
    throw createError({ statusCode: 500, statusMessage: 'Chưa cấu hình SEPAY_WEBHOOK_API_KEY' })
  }
  if (!auth.startsWith('Apikey ') || auth.replace('Apikey ', '') !== expectedKey) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const content = String(body?.content || '')
  const transferAmount = parseInt(String(body?.transferAmount || 0), 10)
  if (!transferAmount || transferAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
  }

  await ensurePaymentSchema()
  await ensureCreditLedgerSchema()

  const extracted = extractTransId(content)
  let tx: any

  if (extracted) {
    const [rows]: any = await pool.query(
      `SELECT trans_id, user_id, amount, status, created_at,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
       FROM payment_transactions
       WHERE trans_id = ? LIMIT 1`,
      [extracted]
    )
    tx = rows?.[0]
  }

  if (!tx) {
    const [rows]: any = await pool.query(
      `SELECT trans_id, user_id, amount, status, created_at,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
       FROM payment_transactions
       WHERE status = 'pending' AND amount = ?
       ORDER BY created_at ASC LIMIT 1`,
      [transferAmount]
    )
    tx = rows?.[0]
  }

  if (!tx) return { success: true, matched: false }
  if (tx.status !== 'pending') return { success: true, matched: true, status: tx.status }
  if (Number(tx.age_seconds || 0) > PAYMENT_EXPIRE_MINUTES * 60) {
    await pool.query(`UPDATE payment_transactions SET status = 'cancelled' WHERE trans_id = ?`, [tx.trans_id])
    await addAuditLog({
      actorType: 'system',
      action: 'payment_expired',
      targetType: 'payment_transaction',
      targetId: tx.trans_id,
      metadata: { reason: 'expired_in_webhook', amount: transferAmount },
    })
    return { success: true, matched: true, status: 'expired' }
  }

  const conn = await pool.getConnection()
  let credited = 0
  try {
    await conn.beginTransaction()

    const [[lockedTx]]: any = await conn.query(
      `
        SELECT trans_id, user_id, status
        FROM payment_transactions
        WHERE trans_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [tx.trans_id],
    )
    if (!lockedTx) {
      await conn.rollback()
      return { success: true, matched: false }
    }
    if (lockedTx.status !== 'pending') {
      await conn.rollback()
      return { success: true, matched: true, status: lockedTx.status }
    }

    const converted = convertVndToCredit(transferAmount)
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
        SET status = 'success', amount = ?, actual_amount = ?, credit_amount = ?
        WHERE trans_id = ?
      `,
      [transferAmount, transferAmount, credited, tx.trans_id],
    )

    await applyCreditChange(conn, {
      userId: tx.user_id,
      delta: credited,
      transactionType: 'deposit',
      referenceType: 'payment_transaction',
      referenceId: tx.trans_id,
      note: `Nạp ${transferAmount.toLocaleString('vi-VN')}đ qua webhook`,
      actorType: 'system',
    })

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
    actorType: 'system',
    action: 'payment_success',
    targetType: 'payment_transaction',
    targetId: tx.trans_id,
    metadata: { amount: transferAmount, credited, user_id: tx.user_id, source: 'webhook' },
  })

  return { success: true, matched: true, status: 'success', trans_id: tx.trans_id }
})


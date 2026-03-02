import pool from '../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES } from '../../utils/payment'
import { addAuditLog } from '../../utils/audit'

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

  await pool.query(
    `UPDATE payment_transactions SET status = 'success', amount = ? WHERE trans_id = ?`,
    [transferAmount, tx.trans_id]
  )
  await pool.query(`UPDATE users SET credit = credit + ? WHERE id = ?`, [transferAmount, tx.user_id])

  await addAuditLog({
    actorType: 'system',
    action: 'payment_success',
    targetType: 'payment_transaction',
    targetId: tx.trans_id,
    metadata: { amount: transferAmount, user_id: tx.user_id, source: 'webhook' },
  })

  return { success: true, matched: true, status: 'success', trans_id: tx.trans_id }
})


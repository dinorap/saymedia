import pool from '../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES, convertVndToCredit } from '../../utils/payment'
import { addAuditLog } from '../../utils/audit'
import { applyCreditChange, ensureCreditLedgerSchema } from '../../utils/creditLedger'
import { addDepositSocialProofItem } from '../../utils/socialProof'

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
      `SELECT trans_id, user_id, amount, status, created_at, promo_code,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
       FROM payment_transactions
       WHERE trans_id = ? LIMIT 1`,
      [extracted]
    )
    tx = rows?.[0]
  }

  if (!tx) {
    const [rows]: any = await pool.query(
      `SELECT trans_id, user_id, amount, status, created_at, promo_code,
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
  let bonusCredit = 0
  let userIdForFeed: number | null = null
  try {
    await conn.beginTransaction()

    const [[lockedTx]]: any = await conn.query(
      `
        SELECT trans_id, user_id, amount, status, promo_code
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

    // Áp dụng khuyến mại (nếu có)
    const promoCode: string | null = lockedTx.promo_code || null
    if (promoCode && credited > 0) {
      const [[promo]]: any = await conn.query(
        `
          SELECT *
          FROM deposit_promotions
          WHERE code = ?
            AND (starts_at IS NULL OR starts_at <= NOW())
            AND (ends_at IS NULL OR ends_at >= NOW())
            AND (
              daily_start_time IS NULL
              OR daily_end_time IS NULL
              OR (TIME(NOW()) BETWEEN daily_start_time AND daily_end_time)
            )
          LIMIT 1
        `,
        [promoCode],
      )

      if (promo) {
        const minAmountOk =
          !promo.min_amount || Number(transferAmount) >= Number(promo.min_amount || 0)

        if (minAmountOk) {
          const [[usageRow]]: any = await conn.query(
            `
              SELECT
                SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS user_uses,
                COUNT(*) AS total_uses
              FROM payment_transactions
              WHERE promo_code = ?
                AND status = 'success'
            `,
            [lockedTx.user_id, promoCode],
          )

          const userUses = Number(usageRow?.user_uses || 0)
          const totalUses = Number(usageRow?.total_uses || 0)
          const underUserLimit =
            !promo.max_uses_per_user || userUses < Number(promo.max_uses_per_user || 0)
          const underTotalLimit =
            !promo.max_total_uses || totalUses < Number(promo.max_total_uses || 0)

          if (underUserLimit && underTotalLimit) {
            // Chọn tier phù hợp (nếu có) theo số tiền nạp
            const [[tier]]: any = await conn.query(
              `
                SELECT *
                FROM deposit_promo_tiers
                WHERE promo_id = ?
                  AND min_amount <= ?
                  AND (max_amount IS NULL OR max_amount > ?)
                ORDER BY min_amount DESC
                LIMIT 1
              `,
              [promo.id, transferAmount, transferAmount],
            )

            const basePercent = Number(promo.bonus_percent || 0)
            const baseFixed = Number(promo.bonus_credit || 0)

            const percent = tier
              ? Number(tier.bonus_percent || basePercent)
              : basePercent
            const fixedBonus = tier
              ? Number(tier.bonus_credit || baseFixed)
              : baseFixed

            const percentBonus =
              percent > 0 ? Math.floor((credited * percent) / 100) : 0
            bonusCredit = percentBonus + (fixedBonus > 0 ? fixedBonus : 0)
            if (bonusCredit < 0) bonusCredit = 0
            credited += bonusCredit
          }
        }
      }
    }

    await conn.query(
      `
        UPDATE payment_transactions
        SET status = 'success',
            amount = ?,
            actual_amount = ?,
            credit_amount = ?,
            promo_bonus_credit = ?
        WHERE trans_id = ?
      `,
      [transferAmount, transferAmount, credited, bonusCredit || null, tx.trans_id],
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

    userIdForFeed = tx.user_id

    await conn.commit()
  } catch (e) {
    try {
      await conn.rollback()
    } catch {}
    throw e
  } finally {
    conn.release()
  }

  // Thêm vào feed "Đơn hàng gần đây" cho nạp tiền thật
  if (userIdForFeed) {
    try {
      const [[user]]: any = await pool.query(
        `
          SELECT username
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        [userIdForFeed],
      )

      const rawName = String(user?.username || '').trim()
      let displayName = 'Khách hàng'
      if (rawName) {
        if (rawName.length <= 3) {
          displayName = `${rawName[0]}***`
        } else {
          displayName = `${rawName[0]}***${rawName[rawName.length - 1]}`
        }
      }

      await addDepositSocialProofItem(displayName, transferAmount, false)
    } catch {
      // không làm hỏng webhook nếu feed lỗi
    }
  }

  await addAuditLog({
    actorType: 'system',
    action: 'payment_success',
    targetType: 'payment_transaction',
    targetId: tx.trans_id,
    metadata: {
      amount: transferAmount,
      credited,
      bonus_credit: bonusCredit,
      user_id: tx.user_id,
      source: 'webhook',
    },
  })

  return { success: true, matched: true, status: 'success', trans_id: tx.trans_id }
})


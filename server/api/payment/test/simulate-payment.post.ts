import jwt from 'jsonwebtoken'
import pool from '../../../utils/db'
import { ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES, convertVndToCredit } from '../../../utils/payment'
import { addAuditLog } from '../../../utils/audit'
import { applyDepositCredit, ensureCreditLedgerSchema } from '../../../utils/creditLedger'
import { addDepositSocialProofItem } from '../../../utils/socialProof'
import { getJwtSecret } from '../../../utils/jwt'
import { isCustomerRole } from '../../../utils/authHelpers'

const JWT_SECRET = getJwtSecret()

export default defineEventHandler(async (event) => {
  // Hard-disable test crediting in production
  if (process.env.NODE_ENV === 'production') {
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

  if (!isCustomerRole(decoded.role)) {
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
  let bonusCredit = 0
  let newCredit = 0
  try {
    await conn.beginTransaction()
    const [rows]: any = await conn.query(
      `
        SELECT trans_id, user_id, amount, status, created_at, promo_code,
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

    const promoCode: string | null = tx.promo_code || null
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
          !promo.min_amount || Number(tx.amount) >= Number(promo.min_amount || 0)

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
            [decoded.id, promoCode],
          )

          const userUses = Number(usageRow?.user_uses || 0)
          const totalUses = Number(usageRow?.total_uses || 0)
          const underUserLimit =
            !promo.max_uses_per_user || userUses < Number(promo.max_uses_per_user || 0)
          const underTotalLimit =
            !promo.max_total_uses || totalUses < Number(promo.max_total_uses || 0)

          if (underUserLimit && underTotalLimit) {
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
              [promo.id, tx.amount, tx.amount],
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
            actual_amount = ?,
            credit_amount = ?,
            promo_bonus_credit = ?
        WHERE trans_id = ?
      `,
      [tx.amount, credited, bonusCredit || null, transId],
    )

    const baseCredit = credited - (bonusCredit || 0)
    const creditResult = await applyDepositCredit(conn, {
      userId: decoded.id,
      paidCredit: baseCredit,
      bonusCredit: bonusCredit || 0,
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
    metadata: { amount: tx.amount, credited, bonus_credit: bonusCredit, source: 'simulate-payment' },
  })

  // Thêm vào feed "Đơn hàng gần đây" cho nạp tiền test
  try {
    const [[user]]: any = await pool.query(
      `
        SELECT username
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [decoded.id],
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

    await addDepositSocialProofItem(displayName, Number(tx.amount || 0), false)
  } catch {
    // không làm hỏng simulate nếu feed lỗi
  }

  return {
    success: true,
    transfer_amount: tx.amount,
    actual_amount: tx.amount,
    credited_amount: credited,
    new_credit: newCredit
  }
})


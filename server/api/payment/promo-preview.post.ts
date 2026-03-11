import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { convertVndToCredit, ensurePaymentSchema } from '../../utils/payment'

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
      statusMessage: 'Chỉ người dùng mới nạp tiền được',
    })
  }

  const body = await readBody<{
    amount?: number
    promo_code?: string | null
  }>(event)

  const amount = Number(body?.amount || 0)
  const rawCode = (body?.promo_code || '').toString().trim().toUpperCase()

  if (!amount || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Số tiền không hợp lệ' })
  }

  const baseConv = convertVndToCredit(amount)
  const baseCredit = baseConv.credit

  if (!rawCode) {
    return {
      success: true,
      base_credit: baseCredit,
      bonus_credit: 0,
      total_credit: baseCredit,
    }
  }

  await ensurePaymentSchema()

  let bonusCredit = 0

  const conn = await pool.getConnection()
  try {
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
      [rawCode],
    )

    if (promo) {
      const minAmountOk =
        !promo.min_amount || Number(amount) >= Number(promo.min_amount || 0)

      if (minAmountOk && baseCredit > 0) {
        const [[usageRow]]: any = await conn.query(
          `
            SELECT
              SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS user_uses,
              COUNT(*) AS total_uses
            FROM payment_transactions
            WHERE promo_code = ?
              AND status = 'success'
          `,
          [decoded.id, rawCode],
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
            [promo.id, amount, amount],
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
            percent > 0 ? Math.floor((baseCredit * percent) / 100) : 0
          bonusCredit = percentBonus + (fixedBonus > 0 ? fixedBonus : 0)
          if (bonusCredit < 0) bonusCredit = 0
        }
      }
    }
  } finally {
    conn.release()
  }

  const totalCredit = baseCredit + bonusCredit

  return {
    success: true,
    base_credit: baseCredit,
    bonus_credit: bonusCredit,
    total_credit: totalCredit,
  }
})


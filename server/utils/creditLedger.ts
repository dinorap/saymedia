import type { PoolConnection } from 'mysql2/promise'
import pool from './db'

let ledgerSchemaReady = false
let userPaidBonusReady = false

export type CreditActorType = 'user' | 'admin' | 'system'
export type CreditLedgerType =
  | 'deposit'
  | 'purchase'
  | 'refund'
  | 'admin_adjust'
  | 'system_adjust'
  | 'promotion'

/** Đảm bảo bảng credit_ledger có cột paid_delta, bonus_delta (tách paid/bonus cho commission) */
export async function ensureCreditLedgerSchema() {
  if (ledgerSchemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      delta BIGINT NOT NULL,
      balance_before BIGINT NOT NULL,
      balance_after BIGINT NOT NULL,
      transaction_type VARCHAR(30) NOT NULL,
      reference_type VARCHAR(50) NULL,
      reference_id VARCHAR(100) NULL,
      note TEXT NULL,
      actor_type ENUM('user', 'admin', 'system') NOT NULL DEFAULT 'system',
      actor_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_credit_ledger_user_id (user_id),
      INDEX idx_credit_ledger_created_at (created_at),
      INDEX idx_credit_ledger_reference (reference_type, reference_id)
    )
  `)

  try {
    await pool.query('ALTER TABLE credit_ledger ADD COLUMN paid_delta BIGINT NULL')
  } catch {
    // Column may already exist
  }
  try {
    await pool.query('ALTER TABLE credit_ledger ADD COLUMN bonus_delta BIGINT NULL')
  } catch {
    // Column may already exist
  }

  await ensureUserPaidBonusSchema()
  ledgerSchemaReady = true
}

/** Đảm bảo users có paid_credit, bonus_credit; migrate credit cũ sang paid */
export async function ensureUserPaidBonusSchema() {
  if (userPaidBonusReady) return

  try {
    await pool.query('ALTER TABLE users ADD COLUMN paid_credit BIGINT NOT NULL DEFAULT 0')
  } catch {
    // Column may already exist
  }
  try {
    await pool.query('ALTER TABLE users ADD COLUMN bonus_credit BIGINT NOT NULL DEFAULT 0')
  } catch {
    // Column may already exist
  }
  // Migrate một lần: user cũ coi toàn bộ credit hiện tại là paid
  await pool.query(`
    UPDATE users
    SET paid_credit = credit, bonus_credit = 0
    WHERE (paid_credit = 0 OR paid_credit IS NULL) AND (bonus_credit = 0 OR bonus_credit IS NULL) AND credit > 0
  `)

  userPaidBonusReady = true
}

/**
 * Nạp tiền: tách paid (từ tiền thật) và bonus (khuyến mãi).
 * Commission sau này chỉ tính trên paid_part; bonus không chia cho shop.
 */
export async function applyDepositCredit(
  conn: PoolConnection,
  payload: {
    userId: number
    paidCredit: number
    bonusCredit: number
    transactionType?: CreditLedgerType
    referenceType?: string | null
    referenceId?: string | number | null
    note?: string | null
    actorType?: CreditActorType
    actorId?: number | null
  },
) {
  const paidCredit = Math.trunc(Number(payload.paidCredit || 0))
  const bonusCredit = Math.trunc(Number(payload.bonusCredit || 0))
  const delta = paidCredit + bonusCredit
  if (!Number.isFinite(delta) || delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Số credit nạp không hợp lệ' })
  }

  const [[user]]: any = await conn.query(
    'SELECT id, credit, paid_credit, bonus_credit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [payload.userId],
  )
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
  }

  const beforeBalance = Number(user.credit || 0)
  const beforePaid = Number(user.paid_credit ?? user.credit ?? 0)
  const beforeBonus = Number(user.bonus_credit ?? 0)
  const afterPaid = beforePaid + paidCredit
  const afterBonus = beforeBonus + bonusCredit
  const afterBalance = afterPaid + afterBonus

  await conn.query(
    'UPDATE users SET credit = ?, paid_credit = ?, bonus_credit = ? WHERE id = ?',
    [afterBalance, afterPaid, afterBonus, payload.userId],
  )

  await conn.query(
    `
      INSERT INTO credit_ledger
      (user_id, delta, balance_before, balance_after, transaction_type,
       reference_type, reference_id, note, actor_type, actor_id, paid_delta, bonus_delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.userId,
      delta,
      beforeBalance,
      afterBalance,
      payload.transactionType ?? 'deposit',
      payload.referenceType ?? null,
      payload.referenceId != null ? String(payload.referenceId) : null,
      payload.note ?? null,
      payload.actorType ?? 'system',
      payload.actorId ?? null,
      paidCredit,
      bonusCredit,
    ],
  )

  return {
    beforeBalance,
    afterBalance,
    paidCredit,
    bonusCredit,
  }
}

/**
 * Trừ credit khi mua hàng: dùng bonus trước, sau đó mới paid.
 * Trả về paidPart và bonusPart để order ghi paid_part, bonus_part (commission chỉ tính trên paidPart).
 */
export async function applyPurchaseCreditDeduction(
  conn: PoolConnection,
  payload: {
    userId: number
    totalAmount: number
    transactionType?: CreditLedgerType
    referenceType?: string | null
    referenceId?: string | number | null
    note?: string | null
    actorType?: CreditActorType
    actorId?: number | null
  },
): Promise<{ beforeBalance: number; afterBalance: number; paidPart: number; bonusPart: number }> {
  const totalAmount = Math.trunc(Number(payload.totalAmount || 0))
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Số credit thanh toán không hợp lệ' })
  }

  const [[user]]: any = await conn.query(
    'SELECT id, credit, paid_credit, bonus_credit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [payload.userId],
  )
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
  }

  const beforeBalance = Number(user.credit || 0)
  const paidCredit = Number(user.paid_credit ?? user.credit ?? 0)
  const bonusCredit = Number(user.bonus_credit ?? 0)

  if (beforeBalance < totalAmount) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Số dư không đủ, vui lòng nạp thêm',
    })
  }

  const bonusPart = Math.min(totalAmount, bonusCredit)
  const paidPart = totalAmount - bonusPart
  const afterPaid = paidCredit - paidPart
  const afterBonus = bonusCredit - bonusPart
  const afterBalance = afterPaid + afterBonus

  await conn.query(
    'UPDATE users SET credit = ?, paid_credit = ?, bonus_credit = ? WHERE id = ?',
    [afterBalance, afterPaid, afterBonus, payload.userId],
  )

  await conn.query(
    `
      INSERT INTO credit_ledger
      (user_id, delta, balance_before, balance_after, transaction_type,
       reference_type, reference_id, note, actor_type, actor_id, paid_delta, bonus_delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.userId,
      -totalAmount,
      beforeBalance,
      afterBalance,
      payload.transactionType ?? 'purchase',
      payload.referenceType ?? null,
      payload.referenceId != null ? String(payload.referenceId) : null,
      payload.note ?? null,
      payload.actorType ?? 'user',
      payload.actorId ?? payload.userId,
      -paidPart,
      -bonusPart,
    ],
  )

  return {
    beforeBalance,
    afterBalance,
    paidPart,
    bonusPart,
  }
}

/**
 * Hoàn tiền: cộng lại vào paid_credit (tiền thật trả lại).
 * Nếu order có paid_part/bonus_part thì dùng để cộng đúng vào paid và bonus.
 */
export async function applyRefundCredit(
  conn: PoolConnection,
  payload: {
    userId: number
    amount: number
    paidPart?: number | null
    bonusPart?: number | null
    transactionType?: CreditLedgerType
    referenceType?: string | null
    referenceId?: string | number | null
    note?: string | null
    actorType?: CreditActorType
    actorId?: number | null
  },
) {
  const amount = Math.trunc(Number(payload.amount || 0))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Số credit hoàn không hợp lệ' })
  }

  let paidDelta = amount
  let bonusDelta = 0
  if (
    payload.paidPart != null &&
    payload.bonusPart != null &&
    payload.paidPart + payload.bonusPart === amount
  ) {
    paidDelta = payload.paidPart
    bonusDelta = payload.bonusPart
  }

  const [[user]]: any = await conn.query(
    'SELECT id, credit, paid_credit, bonus_credit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [payload.userId],
  )
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
  }

  const beforeBalance = Number(user.credit || 0)
  const beforePaid = Number(user.paid_credit ?? user.credit ?? 0)
  const beforeBonus = Number(user.bonus_credit ?? 0)
  const afterPaid = beforePaid + paidDelta
  const afterBonus = beforeBonus + bonusDelta
  const afterBalance = afterPaid + afterBonus

  await conn.query(
    'UPDATE users SET credit = ?, paid_credit = ?, bonus_credit = ? WHERE id = ?',
    [afterBalance, afterPaid, afterBonus, payload.userId],
  )

  await conn.query(
    `
      INSERT INTO credit_ledger
      (user_id, delta, balance_before, balance_after, transaction_type,
       reference_type, reference_id, note, actor_type, actor_id, paid_delta, bonus_delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.userId,
      amount,
      beforeBalance,
      afterBalance,
      payload.transactionType ?? 'refund',
      payload.referenceType ?? null,
      payload.referenceId != null ? String(payload.referenceId) : null,
      payload.note ?? null,
      payload.actorType ?? 'admin',
      payload.actorId ?? null,
      paidDelta,
      bonusDelta,
    ],
  )

  return { beforeBalance, afterBalance }
}

export async function applyCreditChange(
  conn: PoolConnection,
  payload: {
    userId: number
    delta: number
    transactionType: CreditLedgerType
    referenceType?: string | null
    referenceId?: string | number | null
    note?: string | null
    actorType?: CreditActorType
    actorId?: number | null
  },
) {
  const delta = Math.trunc(Number(payload.delta || 0))
  if (!Number.isFinite(delta) || delta === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Biến động tín chỉ không hợp lệ' })
  }

  const [[user]]: any = await conn.query(
    'SELECT id, credit, paid_credit, bonus_credit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [payload.userId],
  )
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
  }

  const beforeBalance = Number(user.credit || 0)
  const paidCredit = Number(user.paid_credit ?? user.credit ?? 0)
  const bonusCredit = Number(user.bonus_credit ?? 0)

  let afterBalance: number
  let paidDelta: number
  let bonusDelta: number

  if (delta > 0) {
    afterBalance = beforeBalance + delta
    paidDelta = delta
    bonusDelta = 0
    const afterPaid = paidCredit + delta
    await conn.query(
      'UPDATE users SET credit = ?, paid_credit = ?, bonus_credit = ? WHERE id = ?',
      [afterBalance, afterPaid, bonusCredit, payload.userId],
    )
  } else {
    const totalDeduct = -delta
    if (beforeBalance < totalDeduct) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Số dư không đủ, vui lòng nạp thêm',
      })
    }
    const bonusTaken = Math.min(totalDeduct, bonusCredit)
    const paidTaken = totalDeduct - bonusTaken
    afterBalance = beforeBalance - totalDeduct
    paidDelta = -paidTaken
    bonusDelta = -bonusTaken
    const afterPaid = paidCredit - paidTaken
    const afterBonus = bonusCredit - bonusTaken
    await conn.query(
      'UPDATE users SET credit = ?, paid_credit = ?, bonus_credit = ? WHERE id = ?',
      [afterBalance, afterPaid, afterBonus, payload.userId],
    )
  }

  await conn.query(
    `
      INSERT INTO credit_ledger
      (user_id, delta, balance_before, balance_after, transaction_type,
       reference_type, reference_id, note, actor_type, actor_id, paid_delta, bonus_delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.userId,
      delta,
      beforeBalance,
      afterBalance,
      payload.transactionType,
      payload.referenceType ?? null,
      payload.referenceId != null ? String(payload.referenceId) : null,
      payload.note ?? null,
      payload.actorType ?? 'system',
      payload.actorId ?? null,
      paidDelta,
      bonusDelta,
    ],
  )

  return {
    beforeBalance,
    afterBalance,
  }
}

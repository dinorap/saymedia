import type { PoolConnection } from 'mysql2/promise'
import pool from './db'

let ledgerSchemaReady = false

export type CreditActorType = 'user' | 'admin' | 'system'
export type CreditLedgerType =
  | 'deposit'
  | 'purchase'
  | 'refund'
  | 'admin_adjust'
  | 'system_adjust'

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

  ledgerSchemaReady = true
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
    'SELECT id, credit FROM users WHERE id = ? LIMIT 1 FOR UPDATE',
    [payload.userId],
  )
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy người dùng' })
  }

  const beforeBalance = Number(user.credit || 0)
  const afterBalance = beforeBalance + delta
  if (afterBalance < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Số dư không đủ, vui lòng nạp thêm',
    })
  }

  await conn.query('UPDATE users SET credit = ? WHERE id = ?', [afterBalance, payload.userId])

  await conn.query(
    `
      INSERT INTO credit_ledger
      (
        user_id, delta, balance_before, balance_after, transaction_type,
        reference_type, reference_id, note, actor_type, actor_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ],
  )

  return {
    beforeBalance,
    afterBalance,
  }
}

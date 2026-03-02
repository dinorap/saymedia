import crypto from 'crypto'
import pool from './db'

let schemaReady = false

export const PAYMENT_EXPIRE_MINUTES = 5

export async function ensurePaymentSchema() {
  if (schemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      trans_id VARCHAR(32) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      amount BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      memo VARCHAR(128) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  try {
    await pool.query('ALTER TABLE users ADD COLUMN credit BIGINT NOT NULL DEFAULT 0')
  } catch {
    // Column may already exist.
  }

  schemaReady = true
}

export function generateTransId(userId: number) {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  const ts = Date.now().toString().slice(-8)
  return `U${userId}${ts}${rand}`.slice(0, 32).toUpperCase()
}

export function buildTransferMemo(transId: string, amount: number) {
  return `AUTO${transId}-${amount}END`
}

export function buildQrUrl(amount: number, memo: string) {
  const bankId = process.env.SEPAY_BANK_ID || process.env.BANK_ID || 'ACB'
  const accountNo = process.env.SEPAY_ACCOUNT_NO || process.env.ACCOUNT_NO || '23766621'
  const template = process.env.SEPAY_TEMPLATE || process.env.TEMPLATE || 'compact2'
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}`
}

export function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > PAYMENT_EXPIRE_MINUTES * 60 * 1000
}


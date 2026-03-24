import crypto from 'crypto'
import pool from './db'
import { assertRuntimeMigrationsAllowed } from './runtimeMigrations'

let schemaReady = false
let lastPendingCleanupAt = 0

export const PAYMENT_EXPIRE_MINUTES = 5
export const DEFAULT_VND_PER_CREDIT = 1000
let cachedVndPerCredit: number | null = null

export async function ensurePaymentSchema() {
  if (schemaReady) return

  assertRuntimeMigrationsAllowed('payment')

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

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN actual_amount BIGINT NULL")
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'sepay'")
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query('ALTER TABLE payment_transactions ADD COLUMN credit_amount BIGINT NULL')
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN promo_code VARCHAR(32) NULL")
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN promo_bonus_credit BIGINT NULL")
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN provider_payment_id VARCHAR(64) NULL")
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE payment_transactions ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'VND'")
  } catch {
    // Column may already exist.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposit_promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      bonus_percent INT NULL,
      bonus_credit BIGINT NULL,
      max_total_uses INT NULL,
      max_uses_per_user INT NULL,
      min_amount BIGINT NULL,
      starts_at TIMESTAMP NULL,
      ends_at TIMESTAMP NULL,
      daily_start_time TIME NULL,
      daily_end_time TIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    await pool.query("ALTER TABLE deposit_promotions ADD COLUMN daily_start_time TIME NULL")
  } catch {
    // Column may already exist.
  }

  // Bảng cấu hình thanh toán (tùy chọn)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id TINYINT PRIMARY KEY,
      vnd_per_credit BIGINT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  try {
    const [[row]]: any = await pool.query(
      "SELECT vnd_per_credit FROM payment_settings WHERE id = 1 LIMIT 1",
    )
    if (row && Number(row.vnd_per_credit) > 0) {
      const v = Math.round(Number(row.vnd_per_credit))
      cachedVndPerCredit = v
      process.env.DEPOSIT_VND_PER_CREDIT = String(v)
    }
  } catch {
    // ignore
  }

  try {
    await pool.query("ALTER TABLE deposit_promotions ADD COLUMN daily_end_time TIME NULL")
  } catch {
    // Column may already exist.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposit_promo_tiers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      promo_id INT NOT NULL,
      min_amount BIGINT NOT NULL,
      max_amount BIGINT NULL,
      bonus_percent INT NULL,
      bonus_credit BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promo_id) REFERENCES deposit_promotions(id) ON DELETE CASCADE
    )
  `)

  schemaReady = true
}

export function getVndPerCredit() {
  if (cachedVndPerCredit != null) return cachedVndPerCredit
  const raw = Number(process.env.DEPOSIT_VND_PER_CREDIT || DEFAULT_VND_PER_CREDIT)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_VND_PER_CREDIT
  return Math.round(raw)
}

export function setVndPerCreditCache(v: number) {
  if (!Number.isFinite(v) || v <= 0) return
  const rounded = Math.round(v)
  cachedVndPerCredit = rounded
  process.env.DEPOSIT_VND_PER_CREDIT = String(rounded)
}

export function convertVndToCredit(vndAmount: number) {
  const vndPerCredit = getVndPerCredit()
  const amount = Number(vndAmount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      vndPerCredit,
      credit: 0,
    }
  }

  return {
    vndPerCredit,
    credit: Math.floor(amount / vndPerCredit),
  }
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
  const envBankId = process.env.SEPAY_BANK_ID || process.env.BANK_ID
  const envAccountNo = process.env.SEPAY_ACCOUNT_NO || process.env.ACCOUNT_NO

  if (!envBankId || !envAccountNo) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[payment] Thiếu SEPAY_BANK_ID/SEPAY_ACCOUNT_NO (hoặc BANK_ID/ACCOUNT_NO) trong production. Hãy cấu hình đúng tài khoản nhận tiền.',
      )
    }
    // Dev fallback để dễ dùng local, nhưng log cảnh báo rõ ràng.
    console.warn(
      '[payment] SEPAY_BANK_ID/SEPAY_ACCOUNT_NO chưa được cấu hình. Đang dùng fallback ACB/23766621 cho môi trường dev.',
    )
  }

  const bankId = envBankId || 'ACB'
  const accountNo = envAccountNo || '23766621'
  const template = process.env.SEPAY_TEMPLATE || process.env.TEMPLATE || 'compact2'
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}`
}

export function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > PAYMENT_EXPIRE_MINUTES * 60 * 1000
}

export async function cleanupExpiredPendingTransactions(force = false) {
  const now = Date.now()
  // Avoid running the same UPDATE too frequently under high traffic.
  if (!force && now - lastPendingCleanupAt < 30_000) return 0
  lastPendingCleanupAt = now

  const [result]: any = await pool.query(
    `
      UPDATE payment_transactions
      SET status = 'cancelled'
      WHERE status = 'pending'
        AND created_at < (NOW() - INTERVAL ? MINUTE)
    `,
    [PAYMENT_EXPIRE_MINUTES],
  )

  return Number(result?.affectedRows || 0)
}


import pool from "./db";

let orderRefundSchemaReady = false;

export async function ensureOrderRefundSchema() {
  if (orderRefundSchemaReady) return;

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refund_reason TEXT NULL");
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refunded_at TIMESTAMP NULL");
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refunded_by_admin_id INT NULL");
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refund_request_reason TEXT NULL");
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refund_requested_at TIMESTAMP NULL");
  } catch {
    // Column may already exist.
  }

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN refund_request_status VARCHAR(20) NULL");
  } catch {
    // Column may already exist.
  }

  orderRefundSchemaReady = true;
}

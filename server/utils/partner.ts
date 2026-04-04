import type { PoolConnection } from "mysql2/promise";
import crypto from "crypto";
import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";
import { ensureCommerceSchema } from "./commerce";

let partnerSchemaReady = false;

export async function ensurePartnerSchema() {
  if (partnerSchemaReady) return;

  assertRuntimeMigrationsAllowed("partner");
  await ensureCommerceSchema();

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN partner_role VARCHAR(32) NULL DEFAULT NULL
    `);
  } catch {
    // Column may already exist
  }

  try {
    await pool.query(`
      ALTER TABLE orders
      ADD COLUMN partner_user_id INT NULL AFTER seller_ref
    `);
  } catch {
    // Column may already exist
  }

  try {
    await pool.query(`
      CREATE INDEX idx_orders_partner_user_id ON orders(partner_user_id)
    `);
  } catch {
    // Index may exist
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_commission_payouts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      partner_user_id INT NOT NULL,
      amount_credit BIGINT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_by_admin_id INT NULL,
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_pcp_order (order_id),
      INDEX idx_pcp_partner_status (partner_user_id, status),
      INDEX idx_pcp_created (created_at),
      CONSTRAINT fk_pcp_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_pcp_user FOREIGN KEY (partner_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_product_refs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      ref_code VARCHAR(32) NOT NULL,
      commission_percent INT NOT NULL DEFAULT 15,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_partner_ref_code (ref_code),
      UNIQUE KEY uniq_partner_user_product (user_id, product_id),
      INDEX idx_partner_refs_user (user_id),
      INDEX idx_partner_refs_product (product_id),
      CONSTRAINT fk_partner_refs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_partner_refs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  partnerSchemaReady = true;
}

function randomSuffix(len = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i]! % chars.length];
  return s;
}

async function refCodeExists(conn: PoolConnection | null, code: string): Promise<boolean> {
  const run = async (c: PoolConnection | typeof pool) => {
    const [[a]]: any = await c.query(
      "SELECT 1 FROM product_sellers WHERE ref_code = ? LIMIT 1",
      [code],
    );
    if (a) return true;
    const [[b]]: any = await c.query(
      "SELECT 1 FROM partner_product_refs WHERE ref_code = ? LIMIT 1",
      [code],
    );
    return !!b;
  };
  if (conn) return run(conn);
  return run(pool);
}

/** Tạo mã ref duy nhất (tối đa 32 ký tự). */
export async function generateUniquePartnerRefCode(
  conn: PoolConnection | null,
  userId: number,
  productId: number,
): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const base = `U${userId}P${productId}${randomSuffix(4)}`.slice(0, 32);
    if (!(await refCodeExists(conn, base))) return base;
  }
  const fallback = `U${userId}P${productId}${randomSuffix(8)}`.slice(0, 32);
  if (!(await refCodeExists(conn, fallback))) return fallback;
  return `U${userId}P${Date.now().toString(36)}`.slice(0, 32);
}

export async function seedPartnerRefsForUser(
  conn: PoolConnection,
  userId: number,
  defaultCommissionPercent = 15,
) {
  const [products]: any = await conn.query(
    "SELECT id FROM products WHERE is_active = 1",
  );
  for (const row of products || []) {
    const pid = Number(row.id);
    if (!Number.isFinite(pid)) continue;
    const [[exists]]: any = await conn.query(
      "SELECT id FROM partner_product_refs WHERE user_id = ? AND product_id = ? LIMIT 1",
      [userId, pid],
    );
    if (exists) continue;
    const refCode = await generateUniquePartnerRefCode(conn, userId, pid);
    await conn.query(
      `INSERT INTO partner_product_refs (user_id, product_id, ref_code, commission_percent, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, pid, refCode, defaultCommissionPercent],
    );
  }
}

export function getPartnerInviteKey(): string {
  const k = process.env.PARTNER_INVITE_KEY;
  if (k != null && String(k).trim() !== "") return String(k).trim();
  return "abc";
}

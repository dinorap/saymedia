import pool from './db'

let productKeySchemaReady = false

export const VALID_KEY_DURATIONS = [
  '2h',
  '12h',
  '1d',
  '3d',
  '7d',
  '10d',
  '30d',
  '90d',
  'lifetime',
] as const

export type ProductKeyDuration = (typeof VALID_KEY_DURATIONS)[number]

export async function ensureProductKeySchema() {
  if (productKeySchemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_keys (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NULL,
      product_name VARCHAR(255) NOT NULL,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      valid_duration ENUM('2h','12h','1d','3d','7d','10d','30d','90d','lifetime') NOT NULL,
      price BIGINT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_keys_product_id (product_id),
      INDEX idx_product_keys_product_name (product_name),
      CONSTRAINT fk_product_keys_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  // Bổ sung cột price cho schema cũ (nếu thiếu)
  try {
    await pool.query(
      `
        ALTER TABLE product_keys
        ADD COLUMN price BIGINT UNSIGNED NOT NULL DEFAULT 0
      `,
    )
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_FIELDNAME') {
      throw e
    }
  }

  productKeySchemaReady = true
}


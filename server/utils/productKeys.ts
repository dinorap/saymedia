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
      \`key\` VARCHAR(255) NOT NULL,
      valid_duration ENUM('2h','12h','1d','3d','7d','10d','30d','90d','lifetime') NOT NULL,
      price BIGINT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product_keys_product_id (product_id),
      INDEX idx_product_keys_product_name (product_name),
      CONSTRAINT fk_product_keys_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  // Đảm bảo unique theo (product_id, key), không bắt toàn hệ thống phải unique theo key
  try {
    // Với schema cũ, cột `key` có UNIQUE implicit -> cần drop trước
    await pool.query(
      `
        ALTER TABLE product_keys
        DROP INDEX \`key\`
      `,
    )
  } catch (e: any) {
    // Nếu index không tồn tại thì bỏ qua
    if (e?.code !== 'ER_CANT_DROP_FIELD_OR_KEY' && e?.code !== 'ER_KEY_DOES_NOT_EXIST') {
      // Các lỗi khác vẫn ném ra để không nuốt bug nghiêm trọng
      throw e
    }
  }
  try {
    await pool.query(
      `
        ALTER TABLE product_keys
        ADD UNIQUE KEY uniq_product_key_per_product (product_id, \`key\`)
      `,
    )
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_KEYNAME') {
      throw e
    }
  }

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

  // Bổ sung cột admin_id để biết admin nào đã nhập key (người tạo)
  try {
    await pool.query(
      `
        ALTER TABLE product_keys
        ADD COLUMN admin_id INT NULL
      `,
    )
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_FIELDNAME') {
      throw e
    }
  }
  try {
    await pool.query(
      `
        ALTER TABLE product_keys
        ADD INDEX idx_product_keys_admin_id (admin_id)
      `,
    )
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_KEYNAME') {
      throw e
    }
  }
  try {
    await pool.query(
      `
        ALTER TABLE product_keys
        ADD CONSTRAINT fk_product_keys_admin
          FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
      `,
    )
  } catch (e: any) {
    // Có thể constraint đã tồn tại
    if (!e?.code || e.code === 'ER_CANT_CREATE_TABLE') {
      // Nếu lỗi khác hẳn thì ném ra để không nuốt bug nghiêm trọng
      throw e
    }
  }

  productKeySchemaReady = true
}


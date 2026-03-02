import pool from './db'

let schemaReady = false

export async function ensureSocialProofSchema() {
  if (schemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recent_orders_feed (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      is_fake TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  schemaReady = true
}

export async function addSocialProofItem(
  displayName: string,
  itemName: string,
  isFake: boolean,
) {
  await ensureSocialProofSchema()

  await pool.query(
    `
      INSERT INTO recent_orders_feed (display_name, item_name, is_fake)
      VALUES (?, ?, ?)
    `,
    [displayName, itemName, isFake ? 1 : 0],
  )

  // Giữ tối đa 20 bản ghi mới nhất
  await pool.query(
    `
      DELETE FROM recent_orders_feed
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id
          FROM recent_orders_feed
          ORDER BY created_at DESC
          LIMIT 20
        ) AS t
      )
    `,
  )
}


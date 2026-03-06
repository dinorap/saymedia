import pool from "./db";

let commerceSchemaReady = false;

async function addColumnIfMissing(sql: string) {
  try {
    await pool.query(sql);
  } catch {
    // Column/index/constraint may already exist.
  }
}

export async function ensureCommerceSchema() {
  if (commerceSchemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      support_contact TEXT NULL,
      price BIGINT NOT NULL DEFAULT 0,
      type ENUM('tool', 'account', 'service', 'other') NOT NULL DEFAULT 'other',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      download_url TEXT NULL,
      thumbnail_url VARCHAR(512) NULL,
      images_json TEXT NULL,
      long_description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Nếu bảng products đã tồn tại từ trước, đảm bảo các cột mới cũng được thêm vào.
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN download_url TEXT NULL AFTER is_active",
  );
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN thumbnail_url VARCHAR(512) NULL AFTER download_url",
  );
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN images_json TEXT NULL AFTER thumbnail_url",
  );
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN long_description TEXT NULL AFTER description",
  );
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN support_contact TEXT NULL AFTER description",
  );
  // Và cột admin_id để biết admin nào tạo.
  await addColumnIfMissing(
    "ALTER TABLE products ADD COLUMN admin_id INT NULL AFTER id",
  );
  await addColumnIfMissing(
    "CREATE INDEX idx_products_admin_id ON products(admin_id)",
  );
  await addColumnIfMissing(
    "ALTER TABLE products ADD CONSTRAINT fk_products_admin_id FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL",
  );

  await addColumnIfMissing(
    "ALTER TABLE orders ADD COLUMN product_id INT NULL AFTER user_id",
  );
  await addColumnIfMissing(
    "ALTER TABLE orders ADD COLUMN note TEXT NULL AFTER status",
  );
  await addColumnIfMissing(
    "CREATE INDEX idx_orders_product_id ON orders(product_id)",
  );
  await addColumnIfMissing(
    "ALTER TABLE orders ADD CONSTRAINT fk_orders_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL",
  );

  commerceSchemaReady = true;
}


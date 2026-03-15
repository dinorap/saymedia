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
      youtube_url VARCHAR(512) NULL,
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
    "ALTER TABLE products ADD COLUMN youtube_url VARCHAR(512) NULL AFTER description",
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

  // Bảng lưu giỏ hàng theo từng tài khoản người dùng.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      qty INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_product (user_id, product_id),
      CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Bổ sung cột duration cho user_cart_items để lưu loại key (thời lượng)
  await addColumnIfMissing(
    "ALTER TABLE user_cart_items ADD COLUMN duration VARCHAR(32) NULL AFTER product_id",
  );
  // Chuyển unique key sang (user_id, product_id, duration) để cùng 1 sản phẩm nhưng loại key khác nhau vẫn tách dòng.
  await addColumnIfMissing(
    "ALTER TABLE user_cart_items DROP INDEX uniq_user_product",
  );
  await addColumnIfMissing(
    "ALTER TABLE user_cart_items ADD UNIQUE KEY uniq_user_product_duration (user_id, product_id, duration)",
  );

  // Bảng liên kết sản phẩm với admin bán (shop) + mã ref riêng cho từng shop.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sellers (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      seller_admin_id INT NOT NULL,
      ref_code VARCHAR(32) NOT NULL UNIQUE,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_seller (product_id, seller_admin_id),
      CONSTRAINT fk_product_sellers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_product_sellers_admin FOREIGN KEY (seller_admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `);

  // Index cho truy vấn nhanh khi data lớn (>100k record).
  await addColumnIfMissing("CREATE INDEX idx_orders_user_id ON orders(user_id)");
  await addColumnIfMissing("CREATE INDEX idx_orders_created_at ON orders(created_at)");
  await addColumnIfMissing("CREATE INDEX idx_orders_status ON orders(status)");
  await addColumnIfMissing("CREATE INDEX idx_products_is_active_created ON products(is_active, created_at)");

  commerceSchemaReady = true;
}


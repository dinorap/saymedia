CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin_0', 'admin_1', 'admin_2') NOT NULL,
    ref_code VARCHAR(12) UNIQUE NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ref_code ON admins(ref_code);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    admin_id INT NOT NULL,
    credit BIGINT NOT NULL DEFAULT 0,
    paid_credit BIGINT NOT NULL DEFAULT 0,
    bonus_credit BIGINT NOT NULL DEFAULT 0,
    status ENUM('active', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
);
CREATE INDEX idx_users_admin_id ON users(admin_id);

-- Bảng quản lý nạp tiền (SePay/manual/test)
CREATE TABLE payment_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trans_id VARCHAR(32) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'sepay',
    amount BIGINT NOT NULL,
    actual_amount BIGINT NULL,
    credit_amount BIGINT NULL,
    status ENUM('pending', 'success', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    memo VARCHAR(128) NOT NULL,
    bank_code VARCHAR(32) NULL,
    bank_account VARCHAR(32) NULL,
    webhook_content TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_status ON payment_transactions(status);
CREATE INDEX idx_payment_created_at ON payment_transactions(created_at);

-- Mã khuyến mại cho nạp tiền
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
);
CREATE INDEX idx_deposit_promotions_code ON deposit_promotions(code);

CREATE TABLE IF NOT EXISTS deposit_promo_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promo_id INT NOT NULL,
    min_amount BIGINT NOT NULL,
    max_amount BIGINT NULL,
    bonus_percent INT NULL,
    bonus_credit BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_id) REFERENCES deposit_promotions(id) ON DELETE CASCADE
);
CREATE INDEX idx_deposit_promo_tiers_promo_id ON deposit_promo_tiers(promo_id);

CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);
CREATE INDEX idx_services_admin_id ON services(admin_id);
CREATE INDEX idx_services_active ON services(is_active);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    youtube_url VARCHAR(512) NULL,
    type ENUM('tool', 'account', 'service', 'other') NOT NULL DEFAULT 'other',
    platform_fee_percent INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    download_url TEXT NULL,
    thumbnail_url VARCHAR(512) NULL,
    images_json TEXT NULL,
    long_description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_admin_id ON products(admin_id);

-- Bảng liên kết sản phẩm với admin bán (shop) + mã ref riêng cho từng shop
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
);
CREATE INDEX idx_product_sellers_product_id ON product_sellers(product_id);
CREATE INDEX idx_product_sellers_seller_admin_id ON product_sellers(seller_admin_id);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NULL,
    admin_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_part BIGINT NULL,
    bonus_part BIGINT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    note TEXT NULL,
    refund_reason TEXT NULL,
    refunded_at TIMESTAMP NULL,
    refunded_by_admin_id INT NULL,
    refund_request_reason TEXT NULL,
    refund_requested_at TIMESTAMP NULL,
    refund_request_status VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
);
CREATE INDEX idx_orders_admin_id ON orders(admin_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Feed hiển thị "Đơn hàng gần đây" (tối đa 20 bản ghi mới nhất)
CREATE TABLE IF NOT EXISTS recent_orders_feed (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    is_fake TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_recent_orders_created_at ON recent_orders_feed(created_at);

-- Log bảo mật / tài chính
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_type ENUM('user', 'admin', 'system') NOT NULL,
    actor_id INT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id VARCHAR(100) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

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
    paid_delta BIGINT NULL,
    bonus_delta BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_created_at ON credit_ledger(created_at);
CREATE INDEX idx_credit_ledger_reference ON credit_ledger(reference_type, reference_id);

-- Hỗ trợ chat 1-1 giữa user và admin
CREATE TABLE IF NOT EXISTS support_threads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    admin_id INT NOT NULL,
    product_id INT NULL,
    topic ENUM('account', 'product') NOT NULL DEFAULT 'account',
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX idx_support_threads_admin_id ON support_threads(admin_id);
CREATE INDEX idx_support_threads_user_id ON support_threads(user_id);
CREATE INDEX idx_support_threads_last_msg ON support_threads(last_message_at);

CREATE TABLE IF NOT EXISTS support_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    sender_type ENUM('user', 'admin') NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE
);
CREATE INDEX idx_support_messages_thread_id ON support_messages(thread_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);

-- Bảng lưu key sản phẩm + thời hạn sử dụng
CREATE TABLE IF NOT EXISTS product_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NULL,
    product_name VARCHAR(255) NOT NULL,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    valid_duration ENUM('2h','12h','1d','3d','7d','10d','30d','90d','lifetime') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_keys_product_id (product_id),
    INDEX idx_product_keys_product_name (product_name),
    CONSTRAINT fk_product_keys_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Dev only: superadmin / 123456. Production: tạo admin qua tool, không hardcode mật khẩu trong SQL.
INSERT INTO admins (username, password_hash, role, ref_code)
VALUES ('superadmin', '$2b$10$hMSE6SHtfvgS1YrqwMXmIOdgTv7mp3yhIBpfLOOmiMaDnBvkhC0Cq', 'admin_0', 'ADMIN0_ROOT');

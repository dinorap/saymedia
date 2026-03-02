CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin_0', 'admin_1') NOT NULL,
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

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    admin_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
);
CREATE INDEX idx_orders_admin_id ON orders(admin_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
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

-- Dev only: superadmin / 123456. Production: tạo admin qua tool, không hardcode mật khẩu trong SQL.
INSERT INTO admins (username, password_hash, role, ref_code)
VALUES ('superadmin', '$2b$10$hMSE6SHtfvgS1YrqwMXmIOdgTv7mp3yhIBpfLOOmiMaDnBvkhC0Cq', 'admin_0', 'ADMIN0_ROOT');

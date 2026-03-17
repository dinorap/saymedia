import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";

let supportSchemaReady = false;

export async function ensureSupportChatSchema() {
  if (supportSchemaReady) return;

  assertRuntimeMigrationsAllowed("supportChat");

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      thread_id BIGINT NOT NULL,
      sender_type ENUM('user', 'admin') NOT NULL,
      sender_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE
    )
  `);

  supportSchemaReady = true;
}


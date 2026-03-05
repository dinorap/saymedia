import pool from './db'

let servicesSchemaReady = false

export async function ensureServicesSchema() {
  if (servicesSchemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_services_admin_id (admin_id),
      INDEX idx_services_active (is_active),
      CONSTRAINT fk_services_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )
  `)

  servicesSchemaReady = true
}

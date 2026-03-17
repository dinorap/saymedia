import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";

let schemaReady = false;

export async function ensureAnnouncementsSchema() {
  if (schemaReady) return;

  assertRuntimeMigrationsAllowed("announcements");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_name VARCHAR(120) NOT NULL,
      is_popup TINYINT(1) NOT NULL DEFAULT 0,
      image_url VARCHAR(500) NULL,
      images_json TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Bổ sung cột is_popup cho schema cũ (nếu thiếu)
  try {
    await pool.query(
      `
        ALTER TABLE announcements
        ADD COLUMN is_popup TINYINT(1) NOT NULL DEFAULT 0
      `,
    );
  } catch (e: any) {
    // ER_DUP_FIELDNAME => cột đã tồn tại, bỏ qua
    if (e?.code !== "ER_DUP_FIELDNAME") {
      throw e;
    }
  }

  // Bổ sung cột image_url cho schema cũ (nếu thiếu)
  try {
    await pool.query(
      `
        ALTER TABLE announcements
        ADD COLUMN image_url VARCHAR(500) NULL
      `,
    );
  } catch (e: any) {
    if (e?.code !== "ER_DUP_FIELDNAME") {
      throw e;
    }
  }

  // Bổ sung cột images_json cho schema cũ (nếu thiếu)
  try {
    await pool.query(
      `
        ALTER TABLE announcements
        ADD COLUMN images_json TEXT NULL
      `,
    );
  } catch (e: any) {
    if (e?.code !== "ER_DUP_FIELDNAME") {
      throw e;
    }
  }

  // Bổ sung cột updated_at cho schema cũ (nếu thiếu)
  try {
    await pool.query(
      `
        ALTER TABLE announcements
        ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
      `,
    );
  } catch (e: any) {
    if (e?.code !== "ER_DUP_FIELDNAME") {
      throw e;
    }
  }

  schemaReady = true;
}


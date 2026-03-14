import pool from "./db";

let schemaReady = false;

export async function ensureAnnouncementsSchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_name VARCHAR(120) NOT NULL,
      is_popup TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  schemaReady = true;
}


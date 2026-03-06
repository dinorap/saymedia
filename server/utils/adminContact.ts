import pool from "./db";

let schemaReady = false;

export async function ensureAdminContactSchema() {
  if (schemaReady) return;

  try {
    const [rows]: any = await pool.query(
      "SHOW COLUMNS FROM admins LIKE 'contact_info'",
    );
    if (!rows || rows.length === 0) {
      await pool.query(
        "ALTER TABLE admins ADD COLUMN contact_info TEXT NULL DEFAULT NULL",
      );
    }
  } catch {
    // ignore, column may already exist on some setups
  }

  schemaReady = true;
}


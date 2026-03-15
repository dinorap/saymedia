import pool from "./db";

let schemaReady = false;

export async function ensureUserStatsSchema() {
  if (schemaReady) return;

  try {
    await pool.query(
      `
        ALTER TABLE users
        ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL
      `,
    );
  } catch (e: any) {
    if (e?.code !== "ER_DUP_FIELDNAME") {
      throw e;
    }
  }

  schemaReady = true;
}


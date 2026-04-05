import pool from "./db";

let adminRoleMigrated = false;

/** Đổi role cũ admin_2 → admin_support (ENUM + bản ghi + tin chat cộng đồng). Idempotent. */
export async function ensureAdminSupportRoleMigration() {
  if (adminRoleMigrated) return;
  try {
    const [[col]]: any = await pool.query(
      `
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'admins'
          AND COLUMN_NAME = 'role'
      `,
    );
    const ct = String(col?.COLUMN_TYPE || "");
    if (ct.includes("admin_2")) {
      await pool.query(`
        ALTER TABLE admins
        MODIFY COLUMN role ENUM('admin_0', 'admin_1', 'admin_2', 'admin_support') NOT NULL
      `);
      await pool.query(`UPDATE admins SET role = 'admin_support' WHERE role = 'admin_2'`);
      await pool.query(`
        ALTER TABLE admins
        MODIFY COLUMN role ENUM('admin_0', 'admin_1', 'admin_support') NOT NULL
      `);
    }
  } catch (e) {
    console.error("[adminRoleMigration] admins:", e);
  }
  try {
    await pool.query(
      `UPDATE community_messages SET author_role = 'admin_support' WHERE author_role = 'admin_2'`,
    );
  } catch {
    // bảng có thể chưa tồn tại
  }
  adminRoleMigrated = true;
}

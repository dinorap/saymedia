import type { PoolConnection } from "mysql2/promise";
import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";

let hierarchyReady = false;

/** Cột parent_admin_id + ENUM có admin_2 (cấp dưới admin_1). */
export async function ensureAdminHierarchySchema() {
  if (hierarchyReady) return;

  assertRuntimeMigrationsAllowed("adminHierarchy");

  try {
    await pool.query(`
      ALTER TABLE admins
      ADD COLUMN parent_admin_id INT NULL
    `);
  } catch {
    // đã có
  }
  try {
    await pool.query(`
      CREATE INDEX idx_admins_parent ON admins(parent_admin_id)
    `);
  } catch {
    // đã có
  }
  try {
    await pool.query(`
      ALTER TABLE admins
      ADD CONSTRAINT fk_admins_parent FOREIGN KEY (parent_admin_id) REFERENCES admins(id) ON DELETE RESTRICT
    `);
  } catch {
    // đã có hoặc engine không hỗ trợ
  }

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
    if (!ct.includes("'admin_2'")) {
      await pool.query(`
        ALTER TABLE admins
        MODIFY COLUMN role ENUM('admin_0', 'admin_1', 'admin_2', 'admin_support') NOT NULL
      `);
    }
  } catch (e) {
    console.error("[adminHierarchy] ENUM:", e);
  }

  hierarchyReady = true;
}

const MAX_SUB_DEFAULT = 20;

export function getMaxSubordinates(): number {
  const n = parseInt(String(process.env.ADMIN_MAX_SUBORDINATES || ""), 10);
  if (Number.isFinite(n) && n >= 1 && n <= 500) return n;
  return MAX_SUB_DEFAULT;
}

/**
 * admin_1 → chính mình; admin_2 → parent (admin_1).
 * Dùng để lọc sản phẩm/đơn/user theo “shop”.
 */
export async function resolveShopAdminId(
  adminId: number,
  role: string,
  conn?: PoolConnection,
): Promise<number> {
  if (role !== "admin_2") {
    return adminId;
  }
  const q = conn ?? pool;
  const [[row]]: any = await q.query(
    "SELECT parent_admin_id FROM admins WHERE id = ? LIMIT 1",
    [adminId],
  );
  const p =
    row?.parent_admin_id != null ? Number(row.parent_admin_id) : null;
  if (!p || !Number.isFinite(p) || p <= 0) {
    throw createError({
      statusCode: 403,
      statusMessage: "Tài khoản cấp dưới chưa được gắn cấp trên.",
    });
  }
  return p;
}

/**
 * Quyền staff với phiên chat: thread gán cho đúng admin hoặc (với admin_2) cho shop cấp trên.
 */
export async function canAdminAccessSupportThread(
  adminId: number,
  role: string,
  threadAssignedAdminId: number | null | undefined,
): Promise<boolean> {
  if (role === "admin_0") return true;
  const tid =
    threadAssignedAdminId != null ? Number(threadAssignedAdminId) : NaN;
  if (!Number.isFinite(tid) || tid <= 0) return false;
  if (role === "admin_1" || role === "admin_support") {
    return tid === adminId;
  }
  if (role === "admin_2") {
    try {
      const shopId = await resolveShopAdminId(adminId, role);
      return tid === shopId || tid === adminId;
    } catch {
      return false;
    }
  }
  return false;
}

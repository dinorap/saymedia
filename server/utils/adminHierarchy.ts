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
 * Quyền staff với phiên chat:
 * - admin_1: thread gán cho mình hoặc cho cấp dưới (admin_2) của shop.
 * - admin_support: chỉ thread gán đúng tài khoản support.
 * - admin_2: thread gán cho shop (cấp trên) hoặc cho chính mình.
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
  if (role === "admin_support") {
    return tid === adminId;
  }
  if (role === "admin_1") {
    if (tid === adminId) return true;
    const [[sub]]: any = await pool.query(
      "SELECT id FROM admins WHERE id = ? AND parent_admin_id = ? LIMIT 1",
      [tid, adminId],
    );
    return !!sub?.id;
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

/** Khớp orders.get: KH của shop / người bán hộ / chủ SP (không chỉ `orders.admin_id`). */
const ORDER_SHOP_SCOPE_SQL = `
  SELECT o.id
  FROM orders o
  INNER JOIN users u ON u.id = o.user_id
  WHERE o.id = ?
    AND (
      u.admin_id = ?
      OR o.seller_admin_id = ?
      OR o.product_owner_admin_id = ?
    )
  LIMIT 1
`;

/**
 * admin_1 / admin_2: chỉ thao tác đơn thuộc phạm vi shop (khớp danh sách đơn).
 * admin_0: bỏ qua. Role khác: bỏ qua — route phải đã giới hạn (vd. assertShopManagementRole).
 */
export async function assertOrderVisibleToShopAdmin(
  orderId: number,
  role: string,
  adminUserId: number,
  conn?: PoolConnection,
  options?: { statusMessage?: string },
): Promise<void> {
  if (role === "admin_0") return;
  if (role !== "admin_1" && role !== "admin_2") return;

  const q = conn ?? pool;
  let params: [number, number, number, number];
  if (role === "admin_1") {
    params = [orderId, adminUserId, adminUserId, adminUserId];
  } else {
    const shopId = await resolveShopAdminId(adminUserId, role, conn);
    params = [orderId, shopId, adminUserId, shopId];
  }
  const [[row]]: any = await q.query(ORDER_SHOP_SCOPE_SQL, params);
  if (!row) {
    throw createError({
      statusCode: 403,
      statusMessage:
        options?.statusMessage ?? "Bạn không có quyền thao tác đơn hàng này",
    });
  }
}

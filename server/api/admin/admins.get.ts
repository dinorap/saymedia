import pool from "../../utils/db";
import { ensureAdminHierarchySchema } from "../../utils/adminHierarchy";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAdminHierarchySchema();

  if (currentUser.role === "admin_0") {
    const [admins]: any = await pool.query(
      `
        SELECT id, username, role, ref_code, is_active, parent_admin_id, created_at
        FROM admins
        ORDER BY id
      `,
    );
    return { success: true, data: admins };
  }

  if (currentUser.role === "admin_1") {
    const [admins]: any = await pool.query(
      `
        SELECT id, username, role, ref_code, is_active, parent_admin_id, created_at
        FROM admins
        WHERE parent_admin_id = ? OR id = ?
        ORDER BY id
      `,
      [currentUser.id, currentUser.id],
    );
    return { success: true, data: admins };
  }

  throw createError({
    statusCode: 403,
    statusMessage: "Không có quyền xem danh sách admin",
  });
});

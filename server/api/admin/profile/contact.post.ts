import { ensureAdminContactSchema } from "../../../utils/adminContact";
import pool from "../../../utils/db";
import { assertShopManagementRole } from "../../../utils/authHelpers";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);

  await ensureAdminContactSchema();

  const body = await readBody(event).catch(() => ({}));
  const raw = String(body?.contact || "").trim();
  const contact = raw.slice(0, 1000);

  await pool.query("UPDATE admins SET contact_info = ? WHERE id = ? LIMIT 1", [
    contact || null,
    currentUser.id,
  ]);

  return {
    success: true,
    message: "Đã lưu thông tin liên hệ",
  };
});


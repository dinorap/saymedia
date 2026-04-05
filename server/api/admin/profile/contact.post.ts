import { ensureAdminContactSchema } from "../../../utils/adminContact";
import pool from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  if (
    currentUser.role !== "admin_0" &&
    currentUser.role !== "admin_1" &&
    currentUser.role !== "admin_2"
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ tài khoản quản trị mới được cập nhật thông tin liên hệ",
    });
  }

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


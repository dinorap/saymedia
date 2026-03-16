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
      statusMessage: "Chỉ tài khoản quản trị mới được cập nhật chủ đề giao diện",
    });
  }

  await ensureAdminContactSchema();

  const body = await readBody(event).catch(() => ({}));
  const raw = String(body?.theme || "").trim();
  const allowed = new Set(["default", "spring", "summer", "autumn", "winter"]);
  const theme = allowed.has(raw) ? raw : "default";

  await pool.query("UPDATE admins SET ui_theme = ? WHERE id = ? LIMIT 1", [
    theme === "default" ? null : theme,
    currentUser.id,
  ]);

  return {
    success: true,
    theme,
  };
});


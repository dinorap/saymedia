import pool from "../../../utils/db";
import { ensureAnnouncementsSchema } from "../../../utils/announcements";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAnnouncementsSchema();

  const id = Number(event.context.params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  await pool.query("DELETE FROM announcements WHERE id = ?", [id]);

  return { success: true };
});


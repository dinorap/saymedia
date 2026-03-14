import pool from "../../utils/db";
import { ensureAnnouncementsSchema } from "../../utils/announcements";

const MAX_TITLE = 255;
const MAX_CONTENT = 4000;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAnnouncementsSchema();

  const body = await readBody(event);
  const id = body?.id ? Number(body.id) : null;
  const rawTitle = String(body?.title || "").trim();
  const rawContent = String(body?.content || "").trim();
  const isPopupRequested =
    body?.is_popup === true ||
    body?.is_popup === 1 ||
    body?.is_popup === "1";

  const title = rawTitle.slice(0, MAX_TITLE);
  const content = rawContent.slice(0, MAX_CONTENT);
  const authorName =
    String(currentUser.username || "Admin").slice(0, 120) || "Admin";

  if (!title || !content) {
    throw createError({
      statusCode: 400,
      statusMessage: "Tiêu đề và nội dung là bắt buộc",
    });
  }

  const allowPopup = currentUser.role === "admin_0";
  const finalIsPopup = allowPopup && isPopupRequested;

  if (id && Number.isFinite(id) && id > 0) {
    await pool.query(
      `
        UPDATE announcements
        SET title = ?, content = ?, author_name = ?, is_popup = ?
        WHERE id = ?
      `,
      [title, content, authorName, finalIsPopup ? 1 : 0, id],
    );

    return { success: true, id };
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO announcements (title, content, author_name, is_popup)
      VALUES (?, ?, ?, ?)
    `,
    [title, content, authorName, finalIsPopup ? 1 : 0],
  );

  return {
    success: true,
    id: result.insertId,
  };
});


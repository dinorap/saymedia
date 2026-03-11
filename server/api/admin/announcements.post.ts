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

  if (id && Number.isFinite(id) && id > 0) {
    await pool.query(
      `
        UPDATE announcements
        SET title = ?, content = ?, author_name = ?
        WHERE id = ?
      `,
      [title, content, authorName, id],
    );

    return { success: true, id };
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO announcements (title, content, author_name)
      VALUES (?, ?, ?)
    `,
    [title, content, authorName],
  );

  return {
    success: true,
    id: result.insertId,
  };
});


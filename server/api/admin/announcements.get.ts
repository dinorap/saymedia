import pool from "../../utils/db";
import { ensureAnnouncementsSchema } from "../../utils/announcements";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAnnouncementsSchema();

  const query = getQuery(event);
  let page = parseInt(String(query.page || 1), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(String(query.limit || 10), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  limit = Math.min(50, Math.max(5, limit));
  const offset = (page - 1) * limit;

  const [[{ total }]]: any = await pool.query(
    "SELECT COUNT(*) AS total FROM announcements",
  );

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        title,
        content,
        author_name AS authorName,
        is_popup AS isPopup,
        created_at AS createdAt
      FROM announcements
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [limit, offset],
  );

  return {
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
});


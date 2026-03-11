import pool from "../utils/db";
import { ensureAnnouncementsSchema } from "../utils/announcements";

export default defineEventHandler(async () => {
  await ensureAnnouncementsSchema();

  const [rows]: any = await pool.query(
    `
      SELECT id, title, content, author_name AS authorName, created_at AS createdAt
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );

  return {
    success: true,
    data: rows,
  };
});


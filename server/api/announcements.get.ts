import pool from "../utils/db";
import { ensureAnnouncementsSchema } from "../utils/announcements";

export default defineEventHandler(async (event) => {
  await ensureAnnouncementsSchema();

  const query = getQuery(event);
  const popupOnly = String(query?.popup || "") === "1";

  if (popupOnly) {
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
        WHERE is_popup = 1
        ORDER BY created_at DESC
        LIMIT 1
      `,
    );

    return {
      success: true,
      data: rows,
    };
  }

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
      LIMIT 100
    `,
  );

  return {
    success: true,
    data: rows,
  };
});


import pool from "../utils/db";
import {
  ensureAboutIntroductionsSchema,
  normalizeCanvasEmbedUrl,
} from "../utils/aboutIntroductions";

export default defineEventHandler(async () => {
  await ensureAboutIntroductionsSchema();

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        topic,
        description,
        canvas_embed_url AS canvasEmbedUrlRaw,
        sort_order AS sortOrder,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM about_introductions
      ORDER BY sort_order ASC, id ASC
      LIMIT 100
    `,
  );

  const data = (Array.isArray(rows) ? rows : [])
    .map((r: any) => {
      const canvasEmbedUrl = normalizeCanvasEmbedUrl(r.canvasEmbedUrlRaw || "");
      return {
        id: r.id,
        topic: r.topic,
        description: r.description || "",
        canvasEmbedUrl,
        sortOrder: Math.max(1, Number(r.sortOrder) || 1),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt || r.createdAt,
      };
    })
    .filter((row) => !!row.canvasEmbedUrl && /^https:\/\//i.test(row.canvasEmbedUrl));

  return { success: true, data };
});

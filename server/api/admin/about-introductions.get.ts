import pool from "../../utils/db";
import {
  ensureAboutIntroductionsSchema,
  normalizeCanvasEmbedUrl,
} from "../../utils/aboutIntroductions";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới quản lý giới thiệu",
    });
  }

  await ensureAboutIntroductionsSchema();

  const query = getQuery(event);
  let page = parseInt(String(query.page || 1), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(String(query.limit || 50), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  limit = Math.min(100, Math.max(5, limit));
  const offset = (page - 1) * limit;
  const search = String(query.search || "").trim();

  const where: string[] = [];
  const params: any[] = [];
  if (search) {
    where.push("(topic LIKE ? OR description LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM about_introductions ${whereSql}`,
    params,
  );

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
      ${whereSql}
      ORDER BY sort_order ASC, id ASC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );

  const data = (Array.isArray(rows) ? rows : []).map((r: any) => ({
    id: r.id,
    topic: r.topic,
    description: r.description || "",
    canvasEmbedUrl: normalizeCanvasEmbedUrl(r.canvasEmbedUrlRaw || ""),
    sortOrder: Math.max(1, Number(r.sortOrder) || 1),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt || r.createdAt,
  }));

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
});

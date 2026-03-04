import pool from "../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const query = getQuery(event);
  const search = query.search ? String(query.search).trim() : "";

  const where: string[] = [];
  const params: any[] = [];

  if (search) {
    where.push("(p.name LIKE ? OR p.description LIKE ?)");
    const keyword = `%${search}%`;
    params.push(keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `
      SELECT
        p.id,
        p.admin_id,
        p.name,
        p.description,
        p.long_description,
        p.price,
        p.type,
        p.is_active,
        p.download_url,
        p.thumbnail_url,
        p.images_json,
        p.created_at,
        p.updated_at,
        a.username AS admin_username
      FROM products p
      LEFT JOIN admins a ON p.admin_id = a.id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT 300
    `,
    params,
  );

  return {
    success: true,
    data: rows,
  };
});


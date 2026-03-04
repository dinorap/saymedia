import pool from "../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const query = getQuery(event);
  const search = query.search ? String(query.search).trim() : "";
  const type = query.type ? String(query.type).trim() : "";
  const status = query.status ? String(query.status).trim() : "";

  let page = parseInt(String(query.page || 1), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(String(query.limit || 10), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  limit = Math.min(50, Math.max(5, limit));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: any[] = [];

  if (search) {
    where.push("(p.name LIKE ? OR p.description LIKE ?)");
    const keyword = `%${search}%`;
    params.push(keyword, keyword);
  }

  if (type) {
    where.push("p.type = ?");
    params.push(type);
  }

  if (status === "active") {
    where.push("p.is_active = 1");
  } else if (status === "inactive") {
    where.push("p.is_active = 0");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [[{ total }]]: any = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN admins a ON p.admin_id = a.id
      ${whereSql}
    `,
    params,
  );

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
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
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


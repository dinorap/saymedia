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
  const adminIdFilterRaw = query.admin_id ? parseInt(String(query.admin_id), 10) : null;
  const sortFieldRaw = String(query.sort_field || "").trim();
  const sortDirRaw = String(query.sort_dir || "").trim().toLowerCase();

  let page = parseInt(String(query.page || 1), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(String(query.limit || 10), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  limit = Math.min(50, Math.max(5, limit));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: any[] = [];

  if (currentUser.role === "admin_1") {
    where.push("p.admin_id = ?");
    params.push(currentUser.id);
  } else if (
    currentUser.role === "admin_0" &&
    adminIdFilterRaw &&
    Number.isFinite(adminIdFilterRaw)
  ) {
    where.push("p.admin_id = ?");
    params.push(adminIdFilterRaw);
  }

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

  const allowedSortFields = new Set([
    "created_at",
    "price",
    "name",
    "is_active",
  ]);
  const sortField = allowedSortFields.has(sortFieldRaw)
    ? sortFieldRaw
    : "created_at";
  const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

  const orderExpression =
    sortField === "price"
      ? "p.price"
      : sortField === "name"
        ? "p.name"
        : sortField === "is_active"
          ? "p.is_active"
          : "p.created_at";

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
        p.platform_fee_percent,
        p.name,
        p.description,
        p.youtube_url,
        p.long_description,
        p.type,
        p.is_active,
        p.download_url,
        p.thumbnail_url,
        p.images_json,
        p.created_at,
        p.updated_at,
        a.username AS admin_username,
        a.role AS admin_role
      FROM products p
      LEFT JOIN admins a ON p.admin_id = a.id
      ${whereSql}
      ORDER BY ${orderExpression} ${sortDir}, p.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );

  // Tổng đã bán theo sản phẩm (tổng credit + tổng key)
  // Lưu ý: "tổng key" được suy ra từ orders.note theo format:
  // - "Số lượng: X" (nếu không có thì mặc định 1)
  const productIds = (rows || []).map((r: any) => Number(r.id)).filter((n: number) => Number.isFinite(n) && n > 0);
  const soldMap = new Map<number, { total_sold_credit: number; total_sold_keys: number }>();
  for (const pid of productIds) {
    soldMap.set(pid, { total_sold_credit: 0, total_sold_keys: 0 });
  }

  if (productIds.length) {
    const placeholders = productIds.map(() => "?").join(",");
    const adminIdFilter =
      currentUser.role === "admin_0" && adminIdFilterRaw && Number.isFinite(adminIdFilterRaw)
        ? adminIdFilterRaw
        : null;
    const directOwnerOnly =
      currentUser.role === "admin_0" && adminIdFilter != null && adminIdFilter > 0;
    const [orderRows]: any = await pool.query(
      `
        SELECT o.product_id, o.amount, o.note
        FROM orders o
        WHERE o.status = 'completed'
          AND o.product_id IN (${placeholders})
          ${directOwnerOnly ? "AND COALESCE(o.product_owner_admin_id, o.admin_id) = ? AND COALESCE(o.seller_admin_id, o.admin_id) = COALESCE(o.product_owner_admin_id, o.admin_id)" : ""}
      `,
      directOwnerOnly ? [...productIds, adminIdFilter] : productIds,
    );

    for (const o of orderRows || []) {
      const pid = Number(o.product_id);
      const agg = soldMap.get(pid);
      if (!agg) continue;
      const amount = Number(o.amount || 0);
      agg.total_sold_credit += Number.isFinite(amount) ? amount : 0;

      let qty = 1;
      const note = o.note ? String(o.note) : "";
      if (note) {
        // tìm dòng "Số lượng: X"
        const m = note.match(/số lượng:\s*(\d+)/i);
        if (m && m[1]) {
          const q = parseInt(m[1], 10);
          if (Number.isFinite(q) && q > 0) qty = q;
        }
      }
      agg.total_sold_keys += qty;
    }
  }

  const enriched = (rows || []).map((r: any) => {
    const agg = soldMap.get(Number(r.id));
    return {
      ...r,
      total_sold_credit: agg ? agg.total_sold_credit : 0,
      total_sold_keys: agg ? agg.total_sold_keys : 0,
    };
  });

  return {
    success: true,
    data: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
});


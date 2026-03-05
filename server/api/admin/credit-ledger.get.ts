import pool from "../../utils/db";
import { ensureCreditLedgerSchema } from "../../utils/creditLedger";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureCreditLedgerSchema();

  const query = getQuery(event);
  const type = query.type ? String(query.type).trim() : "";
  const userId = query.user_id ? parseInt(String(query.user_id), 10) : null;

  let page = parseInt(String(query.page || 1), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = parseInt(String(query.limit || 20), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  limit = Math.min(100, Math.max(10, limit));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (currentUser.role === "admin_1") {
    conditions.push("u.admin_id = ?");
    params.push(currentUser.id);
  }
  if (Number.isFinite(userId) && userId) {
    conditions.push("l.user_id = ?");
    params.push(userId);
  }
  if (type) {
    conditions.push("l.transaction_type = ?");
    params.push(type);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [[{ total }]]: any = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM credit_ledger l
      JOIN users u ON l.user_id = u.id
      ${whereClause}
    `,
    params,
  );

  const [rows]: any = await pool.query(
    `
      SELECT
        l.id, l.user_id, l.delta, l.balance_before, l.balance_after, l.transaction_type,
        l.reference_type, l.reference_id, l.note, l.actor_type, l.actor_id, l.created_at,
        u.username AS user_username, u.email AS user_email, u.admin_id, a.username AS admin_username
      FROM credit_ledger l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN admins a ON u.admin_id = a.id
      ${whereClause}
      ORDER BY l.created_at DESC
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

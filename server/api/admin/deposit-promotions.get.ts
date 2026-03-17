import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensurePaymentSchema } from "../../utils/payment";
import { getJwtSecret } from "../../utils/jwt";

const JWT_SECRET = getJwtSecret();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "auth_token");
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  let decoded: { id: number; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Phiên đăng nhập hết hạn",
    });
  }

  if (decoded.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 mới quản lý mã khuyến mại nạp tiền.",
    });
  }

  await ensurePaymentSchema();

  const query = getQuery(event);
  const sortFieldRaw = String(query.sort_field || "").trim();
  const sortDirRaw = String(query.sort_dir || "").trim().toLowerCase();
  const allowedSortFields = new Set(["created_at", "code", "min_amount"]);
  const sortField = allowedSortFields.has(sortFieldRaw)
    ? sortFieldRaw
    : "created_at";
  const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

  const orderExpression =
    sortField === "code"
      ? "code"
      : sortField === "min_amount"
        ? "min_amount"
        : "created_at";

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        code,
        bonus_percent,
        bonus_credit,
        max_total_uses,
        max_uses_per_user,
        min_amount,
        starts_at,
        ends_at,
        daily_start_time,
        daily_end_time,
        created_at
      FROM deposit_promotions
      ORDER BY ${orderExpression} ${sortDir}, id DESC
    `,
  );

  return {
    success: true,
    data: rows || [],
  };
});


import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensurePaymentSchema } from "../../utils/payment";

const JWT_SECRET =
  process.env.JWT_SECRET || "chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456";

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

  let rows: any[] = [];

  try {
    await ensurePaymentSchema();
    const [result]: any = await pool.query(
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
        ORDER BY created_at DESC, id DESC
      `,
    );
    rows = result || [];
  } catch (e: any) {
    // Nếu DB cũ chưa có cột daily_* thì fallback: query không dùng 2 cột đó.
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      const [result]: any = await pool.query(
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
            NULL AS daily_start_time,
            NULL AS daily_end_time,
            created_at
          FROM deposit_promotions
          ORDER BY created_at DESC, id DESC
        `,
      );
      rows = result || [];
    } else {
      throw e;
    }
  }

  return {
    success: true,
    data: rows,
  };
});


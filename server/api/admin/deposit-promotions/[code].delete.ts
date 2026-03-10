import jwt from "jsonwebtoken";
import pool from "../../../utils/db";
import { ensurePaymentSchema } from "../../../utils/payment";

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
      statusMessage: "Chỉ admin_0 mới xóa mã khuyến mại nạp tiền.",
    });
  }

  const codeParam = getRouterParam(event, "code");
  const code = String(codeParam || "").trim().toUpperCase();
  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: "Thiếu mã khuyến mại để xóa.",
    });
  }

  await ensurePaymentSchema();

  const [result]: any = await pool.query(
    "DELETE FROM deposit_promotions WHERE code = ? LIMIT 1",
    [code],
  );

  return {
    success: true,
    code,
    affected: result?.affectedRows || 0,
  };
});


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
      statusMessage: "Chỉ admin_0 mới tạo / sửa mã khuyến mại nạp tiền.",
    });
  }

  const body = await readBody(event);
  const rawCode = String(body?.code || "").trim().toUpperCase();
  if (!rawCode) {
    throw createError({
      statusCode: 400,
      statusMessage: "Mã khuyến mại không được để trống.",
    });
  }

  const bonusPercent = body?.bonus_percent
    ? Number(body.bonus_percent)
    : null;
  const bonusCredit = body?.bonus_credit ? Number(body.bonus_credit) : null;
  const maxTotalUses = body?.max_total_uses
    ? Number(body.max_total_uses)
    : null;
  const maxUsesPerUser = body?.max_uses_per_user
    ? Number(body.max_uses_per_user)
    : null;
  const minAmount = body?.min_amount ? Number(body.min_amount) : null;
  const startsAt = body?.starts_at ? new Date(body.starts_at) : null;
  const endsAt = body?.ends_at ? new Date(body.ends_at) : null;
  const dailyStartTime = body?.daily_start_time
    ? String(body.daily_start_time)
    : null;
  const dailyEndTime = body?.daily_end_time
    ? String(body.daily_end_time)
    : null;

  if (!bonusPercent && !bonusCredit) {
    throw createError({
      statusCode: 400,
      statusMessage: "Phải cấu hình ít nhất 1 trong bonus_percent hoặc bonus_credit.",
    });
  }

  await ensurePaymentSchema();

  // Upsert đơn giản: nếu code đã tồn tại thì cập nhật, chưa có thì tạo mới
  await pool.query(
    `
      INSERT INTO deposit_promotions
        (code, bonus_percent, bonus_credit, max_total_uses, max_uses_per_user, min_amount, starts_at, ends_at, daily_start_time, daily_end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bonus_percent = VALUES(bonus_percent),
        bonus_credit = VALUES(bonus_credit),
        max_total_uses = VALUES(max_total_uses),
        max_uses_per_user = VALUES(max_uses_per_user),
        min_amount = VALUES(min_amount),
        starts_at = VALUES(starts_at),
        ends_at = VALUES(ends_at),
        daily_start_time = VALUES(daily_start_time),
        daily_end_time = VALUES(daily_end_time)
    `,
    [
      rawCode,
      bonusPercent,
      bonusCredit,
      maxTotalUses,
      maxUsesPerUser,
      minAmount,
      startsAt ? startsAt.toISOString().slice(0, 19).replace("T", " ") : null,
      endsAt ? endsAt.toISOString().slice(0, 19).replace("T", " ") : null,
      dailyStartTime,
      dailyEndTime,
    ],
  );

  return {
    success: true,
    code: rawCode,
  };
});


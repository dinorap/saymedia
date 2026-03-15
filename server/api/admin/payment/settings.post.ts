import pool from "../../../utils/db";
import { ensurePaymentSchema, setVndPerCreditCache, DEFAULT_VND_PER_CREDIT } from "../../../utils/payment";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 mới được phép chỉnh tỷ lệ quy đổi",
    });
  }

  await ensurePaymentSchema();

  const body = await readBody(event).catch(() => ({}));
  const raw = Number(body?.vnd_per_credit);
  let value = Math.round(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Giá trị quy đổi không hợp lệ",
    });
  }

  // Giới hạn trong khoảng hợp lý để tránh cấu hình nhầm
  if (value < 10) value = 10;
  if (value > 10_000_000) {
    throw createError({
      statusCode: 400,
      statusMessage: "Tỷ lệ quy đổi quá lớn (tối đa 10.000.000 VND / credit)",
    });
  }

  await pool.query(
    `
      INSERT INTO payment_settings (id, vnd_per_credit)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE vnd_per_credit = VALUES(vnd_per_credit)
    `,
    [value],
  );

  setVndPerCreditCache(value);

  return {
    success: true,
    vnd_per_credit: value || DEFAULT_VND_PER_CREDIT,
  };
});


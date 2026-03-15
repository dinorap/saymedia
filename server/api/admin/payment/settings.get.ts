import pool from "../../../utils/db";
import { DEFAULT_VND_PER_CREDIT, ensurePaymentSchema, getVndPerCredit } from "../../../utils/payment";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 mới được xem cấu hình thanh toán",
    });
  }

  await ensurePaymentSchema();

  let value = getVndPerCredit();
  try {
    const [[row]]: any = await pool.query(
      "SELECT vnd_per_credit FROM payment_settings WHERE id = 1 LIMIT 1",
    );
    if (row && Number(row.vnd_per_credit) > 0) {
      value = Math.round(Number(row.vnd_per_credit));
    }
  } catch {
    // ignore, fallback to getVndPerCredit
  }

  return {
    success: true,
    vnd_per_credit: value || DEFAULT_VND_PER_CREDIT,
  };
});


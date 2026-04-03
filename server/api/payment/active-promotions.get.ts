import pool from "../../utils/db";
import { ensurePaymentSchema } from "../../utils/payment";

function formatDateTimeVi(value: any) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function formatDateOnlyVi(value: any) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatTimeVi(value: any) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  return v.slice(0, 5);
}

export default defineEventHandler(async () => {
  await ensurePaymentSchema();

  const [rows]: any = await pool.query(
    `
      SELECT
        p.code,
        p.bonus_percent,
        p.bonus_credit,
        p.min_amount,
        p.max_total_uses,
        p.max_uses_per_user,
        p.starts_at,
        p.ends_at,
        p.daily_start_time,
        p.daily_end_time,
        (
          SELECT COUNT(*)
          FROM payment_transactions tx
          WHERE tx.promo_code = p.code
            AND tx.status = 'success'
        ) AS used_count
      FROM deposit_promotions p
      WHERE (p.starts_at IS NULL OR p.starts_at <= NOW())
        AND (p.ends_at IS NULL OR p.ends_at >= NOW())
        AND (
          p.daily_start_time IS NULL
          OR p.daily_end_time IS NULL
          OR (TIME(NOW()) BETWEEN p.daily_start_time AND p.daily_end_time)
        )
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 20
    `,
  );

  const data = (rows || [])
    .filter((r: any) => {
      const maxTotalUses = Number(r.max_total_uses || 0);
      const usedCount = Number(r.used_count || 0);
      return !maxTotalUses || usedCount < maxTotalUses;
    })
    .map((r: any) => {
      const parts: string[] = [];
      const bonusPercent = Number(r.bonus_percent || 0);
      const bonusCredit = Number(r.bonus_credit || 0);
      const minAmount = Number(r.min_amount || 0);
      const maxTotalUses = Number(r.max_total_uses || 0);
      const usedCount = Number(r.used_count || 0);
      const remainingUses = maxTotalUses > 0 ? Math.max(0, maxTotalUses - usedCount) : null;
      const maxUsesPerUser = Number(r.max_uses_per_user || 0);
      const startsAt = formatDateOnlyVi(r.starts_at);
      const expiresAt = formatDateTimeVi(r.ends_at);
      const dailyStartTime = formatTimeVi(r.daily_start_time);
      const dailyEndTime = formatTimeVi(r.daily_end_time);

      if (bonusPercent > 0) parts.push(`ưu đãi: tặng thêm ${bonusPercent}% credit`);
      if (bonusCredit > 0)
        parts.push(`ưu đãi cố định: cộng ${bonusCredit.toLocaleString("vi-VN")} credit`);
      if (minAmount > 0)
        parts.push(`điều kiện: nạp từ ${minAmount.toLocaleString("vi-VN")}đ`);
      if (maxUsesPerUser > 0)
        parts.push(`giới hạn mỗi tài khoản: tối đa ${maxUsesPerUser} lần`);
      if (maxTotalUses > 0)
        parts.push(
          `tổng lượt dùng: ${usedCount}/${maxTotalUses} (còn ${remainingUses} lượt)`,
        );
      if (startsAt) parts.push(`bắt đầu áp dụng: ${startsAt}`);
      if (dailyStartTime && dailyEndTime)
        parts.push(`khung giờ áp dụng hằng ngày: ${dailyStartTime} - ${dailyEndTime}`);
      if (expiresAt) parts.push(`hết hạn: ${expiresAt}`);

      return {
        code: String(r.code || "").toUpperCase(),
        hint:
          parts.join(" | ") ||
          "Mã ưu đãi nạp tiền đang hoạt động, áp dụng theo điều kiện hệ thống",
      };
    })
    .filter((r: any) => !!r.code);

  return { success: true, data };
});

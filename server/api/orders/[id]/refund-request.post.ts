import pool from "../../../utils/db";
import { ensureOrderRefundSchema } from "../../../utils/orderRefund";
import { addAuditLog } from "../../../utils/audit";
import { requireUser } from "../../../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../../../utils/rateLimit";

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event);

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID đơn hàng không hợp lệ" });
  }

  const body = await readBody(event).catch(() => ({}));
  const reason = String(body?.reason || "").trim().slice(0, 1000);
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: "Vui lòng nhập lý do hoàn tiền" });
  }

  checkRateLimit({
    key: rateLimitKey(["refund_request", decoded.id, id]),
    max: 3,
    windowMs: 10 * 60_000,
    statusMessage: "Bạn gửi yêu cầu hoàn tiền quá nhanh, vui lòng thử lại sau.",
    auditAction: "rate_limited_refund_request",
    auditMetadata: { order_id: id, user_id: decoded.id },
  });

  await ensureOrderRefundSchema();

  const MAX_DAYS =
    Number(process.env.REFUND_REQUEST_MAX_DAYS || 3) || 3;

  const [[order]]: any = await pool.query(
    `
      SELECT id, user_id, status, refunded_at, refund_request_status, created_at
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!order || Number(order.user_id) !== Number(decoded.id)) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy đơn hàng" });
  }
  if (order.refunded_at) {
    throw createError({ statusCode: 400, statusMessage: "Đơn hàng đã được hoàn tiền" });
  }
  if (String(order.status || "") !== "completed") {
    throw createError({
      statusCode: 400,
      statusMessage: "Chỉ có thể yêu cầu hoàn tiền cho đơn hàng đã hoàn thành",
    });
  }
  if (String(order.refund_request_status || "") === "pending") {
    throw createError({ statusCode: 400, statusMessage: "Đơn hàng đã gửi yêu cầu hoàn tiền" });
  }

  const createdAt = new Date(order.created_at);
  const ageMs = Date.now() - createdAt.getTime();
  const maxMs = MAX_DAYS * 24 * 60 * 60 * 1000;
  if (ageMs > maxMs) {
    throw createError({
      statusCode: 400,
      statusMessage: `Đơn hàng đã quá thời hạn ${MAX_DAYS} ngày để yêu cầu hoàn tiền`,
    });
  }

  await pool.query(
    `
      UPDATE orders
      SET refund_request_reason = ?, refund_requested_at = NOW(), refund_request_status = 'pending'
      WHERE id = ?
    `,
    [reason, id],
  );

  await addAuditLog({
    actorType: "user",
    actorId: decoded.id,
    action: "order_refund_requested",
    targetType: "order",
    targetId: id,
    metadata: { reason },
  });

  return { success: true };
});

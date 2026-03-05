import jwt from "jsonwebtoken";
import pool from "../../../utils/db";
import { ensureOrderRefundSchema } from "../../../utils/orderRefund";
import { addAuditLog } from "../../../utils/audit";

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
    throw createError({ statusCode: 401, statusMessage: "Phiên đăng nhập hết hạn" });
  }

  if (decoded.role !== "user") {
    throw createError({ statusCode: 403, statusMessage: "Không có quyền" });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID đơn hàng không hợp lệ" });
  }

  const body = await readBody(event).catch(() => ({}));
  const reason = String(body?.reason || "").trim().slice(0, 1000);
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: "Vui lòng nhập lý do hoàn tiền" });
  }

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

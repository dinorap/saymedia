import pool from "../../../../utils/db";
import { addAuditLog } from "../../../../utils/audit";
import {
  applyRefundCredit,
  ensureCreditLedgerSchema,
} from "../../../../utils/creditLedger";
import { ensureOrderRefundSchema } from "../../../../utils/orderRefund";
import { ensureAdminWalletSchema } from "../../../../utils/adminWallet";
import { ensureCommerceSchema } from "../../../../utils/commerce";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
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

  await ensureCreditLedgerSchema();
  await ensureOrderRefundSchema();
  await ensureAdminWalletSchema();
  await ensureCommerceSchema();

  const conn = await pool.getConnection();
  let resultCredit = 0;
  let orderUserId = 0;
  try {
    await conn.beginTransaction();

    const [[order]]: any = await conn.query(
      `
        SELECT id, user_id, admin_id, amount, amount_credit, paid_part, bonus_part, status, refunded_at
        FROM orders
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [id],
    );
    if (!order) {
      throw createError({ statusCode: 404, statusMessage: "Không tìm thấy đơn hàng" });
    }

    if (currentUser.role === "admin_1" && Number(order.admin_id) !== Number(currentUser.id)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Bạn chỉ được hoàn tiền đơn hàng do mình phụ trách",
      });
    }

    if (order.refunded_at) {
      throw createError({ statusCode: 400, statusMessage: "Đơn hàng này đã được hoàn tiền" });
    }
    if (String(order.status || "") !== "completed") {
      throw createError({
        statusCode: 400,
        statusMessage: "Chỉ có thể hoàn tiền cho đơn hàng đã hoàn thành",
      });
    }

    const amount = Math.trunc(
      Number(
        order.amount_credit != null
          ? order.amount_credit
          : Math.round(Number(order.amount || 0)),
      ),
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createError({ statusCode: 400, statusMessage: "Số tiền đơn hàng không hợp lệ" });
    }

    const creditResult = await applyRefundCredit(conn, {
      userId: Number(order.user_id),
      amount,
      paidPart: order.paid_part != null ? Number(order.paid_part) : null,
      bonusPart: order.bonus_part != null ? Number(order.bonus_part) : null,
      referenceType: "order",
      referenceId: id,
      note: `Hoàn tiền đơn #${id}: ${reason}`,
      actorType: "admin",
      actorId: currentUser.id,
    });
    resultCredit = creditResult.afterBalance;
    orderUserId = Number(order.user_id);

    await conn.query(
      `
        UPDATE orders
        SET status = 'cancelled', refund_reason = ?, refunded_at = NOW(), refunded_by_admin_id = ?, refund_request_status = 'approved'
        WHERE id = ?
      `,
      [reason, currentUser.id, id],
    );

    // Hoàn lại doanh thu/hoa hồng cho shop/chủ: ghi bút toán âm vào admin_wallet theo order_id
    const [walletRows]: any = await conn.query(
      `
        SELECT admin_id, amount_credit, wallet_type, note
        FROM admin_wallet
        WHERE order_id = ?
      `,
      [id],
    );
    for (const w of walletRows || []) {
      const amt = Number(w.amount_credit || 0);
      if (!amt) continue;
      await conn.query(
        `
          INSERT INTO admin_wallet (admin_id, amount_credit, wallet_type, order_id, reference_type, reference_id, note)
          VALUES (?, ?, ?, ?, 'order_refund', ?, ?)
        `,
        [
          w.admin_id,
          -amt,
          w.wallet_type,
          id,
          String(id),
          `Hoàn lại ${amt} credit từ đơn #${id}: ${reason}`,
        ],
      );
    }

    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }

  await addAuditLog({
    actorType: "admin",
    actorId: currentUser.id,
    action: "order_refund",
    targetType: "order",
    targetId: id,
    metadata: { reason, user_id: orderUserId },
  });

  return {
    success: true,
    order_id: id,
    new_credit: resultCredit,
  };
});

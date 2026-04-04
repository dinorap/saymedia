import type { PoolConnection } from "mysql2/promise";
import { applyDepositCredit } from "./creditLedger";

export async function insertPendingPartnerCommission(
  conn: PoolConnection,
  payload: {
    orderId: number;
    partnerUserId: number;
    amountCredit: number;
  },
) {
  const amt = Math.trunc(Number(payload.amountCredit || 0));
  if (!Number.isFinite(amt) || amt <= 0) return;
  await conn.query(
    `
      INSERT INTO partner_commission_payouts (order_id, partner_user_id, amount_credit, status)
      VALUES (?, ?, ?, 'pending')
    `,
    [payload.orderId, payload.partnerUserId, amt],
  );
}

/**
 * Super admin duyệt → cộng bonus credit vào ví đối tác (một lần / bản ghi).
 */
export async function approvePartnerCommissionPayout(
  conn: PoolConnection,
  payoutId: number,
  adminId: number,
) {
  const [[row]]: any = await conn.query(
    `
      SELECT pcp.id, pcp.order_id, pcp.partner_user_id, pcp.amount_credit, pcp.status,
             o.status AS order_status
      FROM partner_commission_payouts pcp
      INNER JOIN orders o ON o.id = pcp.order_id
      WHERE pcp.id = ?
      FOR UPDATE
    `,
    [payoutId],
  );
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Không tìm thấy bản ghi hoa hồng",
    });
  }
  if (String(row.status) !== "pending") {
    throw createError({
      statusCode: 400,
      statusMessage: "Bản ghi không còn ở trạng thái chờ duyệt",
    });
  }
  if (String(row.order_status) !== "completed") {
    throw createError({
      statusCode: 400,
      statusMessage: "Đơn hàng không còn hoàn thành, không thể duyệt hoa hồng",
    });
  }

  const amount = Math.trunc(Number(row.amount_credit || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Số tiền hoa hồng không hợp lệ",
    });
  }

  const oid = Number(row.order_id);
  await applyDepositCredit(conn, {
    userId: Number(row.partner_user_id),
    paidCredit: 0,
    bonusCredit: amount,
    transactionType: "partner_commission",
    referenceType: "order",
    referenceId: oid,
    note: `Hoa hồng giới thiệu đơn #${oid} (đã duyệt)`,
    actorType: "system",
    actorId: null,
  });

  await conn.query(
    `
      UPDATE partner_commission_payouts
      SET status = 'approved',
          approved_by_admin_id = ?,
          approved_at = NOW()
      WHERE id = ?
    `,
    [adminId, payoutId],
  );
}

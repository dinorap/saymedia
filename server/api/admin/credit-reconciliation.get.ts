import pool from "../../utils/db";
import { getVndPerCredit } from "../../utils/payment";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ chủ hệ thống mới được xem đối soát tổng",
    });
  }

  const vndPerCredit = getVndPerCredit();

  // 1) Tổng tiền nạp thực tế (VNĐ)
  const [[depositsRow]]: any = await pool.query(
    `
      SELECT
        COALESCE(SUM(COALESCE(pt.actual_amount, pt.amount, 0)), 0) AS total_deposit_vnd
      FROM payment_transactions pt
      WHERE pt.status = 'success'
    `,
  );
  const totalDepositVnd = Number(depositsRow?.total_deposit_vnd || 0);

  // 2) Tổng CREDIT sinh ra từ nạp trong ledger
  const [[ledgerDepositRow]]: any = await pool.query(
    `
      SELECT COALESCE(SUM(l.delta), 0) AS total_deposit_credit
      FROM credit_ledger l
      WHERE l.transaction_type = 'deposit'
    `,
  );
  const totalDepositCredit = Number(
    ledgerDepositRow?.total_deposit_credit || 0,
  );

  const expectedCreditFromVnd = vndPerCredit > 0
    ? Math.round(totalDepositVnd / vndPerCredit)
    : 0;
  const diffDepositCredit =
    totalDepositCredit - expectedCreditFromVnd;

  // 3) Tổng credit đang nằm trên users vs tổng delta ledger
  const [[usersCreditRow]]: any = await pool.query(
    `
      SELECT COALESCE(SUM(u.credit), 0) AS total_users_credit
      FROM users u
    `,
  );
  const totalUsersCredit = Number(usersCreditRow?.total_users_credit || 0);

  const [[ledgerNetRow]]: any = await pool.query(
    `
      SELECT COALESCE(SUM(l.delta), 0) AS net_ledger_delta
      FROM credit_ledger l
    `,
  );
  const netLedgerDelta = Number(ledgerNetRow?.net_ledger_delta || 0);
  const diffUsersVsLedger = totalUsersCredit - netLedgerDelta;

  // 4) Tổng credit treo cho shop trong admin_wallet
  const [[walletRow]]: any = await pool.query(
    `
      SELECT
        (
          COALESCE(SUM(
            CASE
              WHEN w.wallet_type IN ('sale_commission','product_revenue')
                THEN CASE WHEN o.id IS NULL OR o.status = 'completed' THEN w.amount_credit ELSE 0 END
              WHEN w.wallet_type = 'payout' THEN -w.amount_credit
              ELSE 0
            END
          ), 0)
          -
          COALESCE((
            SELECT SUM(
              CASE
                WHEN owner.role = 'admin_1'
                  AND COALESCE(oo.seller_admin_id, oo.admin_id) = COALESCE(oo.product_owner_admin_id, oo.admin_id)
                  AND COALESCE(p.platform_fee_percent, 0) > 0
                THEN ROUND(oo.amount * p.platform_fee_percent / 100)
                ELSE 0
              END
            )
            FROM orders oo
            JOIN products p ON oo.product_id = p.id
            JOIN admins owner ON COALESCE(oo.product_owner_admin_id, oo.admin_id) = owner.id
            WHERE oo.status = 'completed'
          ), 0)
        ) AS pending_shop_credit
      FROM admin_wallet w
      JOIN admins a ON w.admin_id = a.id
      LEFT JOIN orders o ON w.order_id = o.id
      WHERE a.role = 'admin_1'
    `,
  );
  const pendingShopCredit = Number(walletRow?.pending_shop_credit || 0);

  // 5) Cảnh báo
  const alerts: string[] = [];

  if (Math.abs(diffDepositCredit) > 1) {
    alerts.push(
      `Lệch giữa CREDIT nạp trong ledger và tiền nạp VNĐ quy đổi: ${diffDepositCredit} credit`,
    );
  }

  if (Math.abs(diffUsersVsLedger) > 1) {
    alerts.push(
      `Lệch giữa tổng CREDIT trên users và tổng delta credit_ledger: ${diffUsersVsLedger} credit`,
    );
  }

  return {
    success: true,
    data: {
      vnd_per_credit: vndPerCredit,
      total_deposit_vnd: totalDepositVnd,
      total_deposit_credit: totalDepositCredit,
      expected_credit_from_vnd: expectedCreditFromVnd,
      diff_deposit_credit: diffDepositCredit,
      total_users_credit: totalUsersCredit,
      net_ledger_delta: netLedgerDelta,
      diff_users_vs_ledger: diffUsersVsLedger,
      pending_shop_credit: pendingShopCredit,
      alerts,
    },
  };
});


import pool from "../../utils/db";
import { requireAuth } from "../../utils/authHelpers";
import { ensurePartnerSchema } from "../../utils/partner";
import { ensureCreditLedgerSchema } from "../../utils/creditLedger";

export default defineEventHandler(async (event) => {
  const decoded = requireAuth(event);
  if (decoded.role !== "admin_3") {
    throw createError({ statusCode: 403, statusMessage: "Chỉ dành cho đối tác giới thiệu" });
  }

  await ensurePartnerSchema();
  await ensureCreditLedgerSchema();

  const userId = decoded.id;

  const [refs]: any = await pool.query(
    `
      SELECT
        ppr.product_id,
        ppr.ref_code,
        ppr.commission_percent,
        p.name AS product_name
      FROM partner_product_refs ppr
      INNER JOIN products p ON p.id = ppr.product_id
      WHERE ppr.user_id = ? AND ppr.is_active = 1
      ORDER BY p.name ASC
    `,
    [userId],
  );

  const [orderAgg]: any = await pool.query(
    `
      SELECT
        product_id,
        COUNT(*) AS order_count,
        COALESCE(SUM(amount_credit), 0) AS volume_credit
      FROM orders
      WHERE partner_user_id = ? AND status = 'completed'
      GROUP BY product_id
    `,
    [userId],
  );
  const byProduct: Record<number, { order_count: number; volume_credit: number }> = {};
  for (const r of orderAgg || []) {
    byProduct[Number(r.product_id)] = {
      order_count: Number(r.order_count || 0),
      volume_credit: Number(r.volume_credit || 0),
    };
  }

  const [[sumOrders]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(amount_credit), 0) AS total_volume_credit
      FROM orders
      WHERE partner_user_id = ? AND status = 'completed'
    `,
    [userId],
  );

  const [[ledgerSum]]: any = await pool.query(
    `
      SELECT COALESCE(SUM(bonus_delta), 0) AS total_commission_credit
      FROM credit_ledger
      WHERE user_id = ? AND transaction_type = 'partner_commission'
    `,
    [userId],
  );

  const list = (refs || []).map((r: any) => {
    const pid = Number(r.product_id);
    const agg = byProduct[pid] || { order_count: 0, volume_credit: 0 };
    return {
      product_id: pid,
      product_name: r.product_name,
      ref_code: r.ref_code,
      commission_percent: Number(r.commission_percent ?? 15),
      order_count: agg.order_count,
      volume_credit: agg.volume_credit,
    };
  });

  return {
    success: true,
    summary: {
      total_orders: Number(sumOrders?.total_orders || 0),
      total_volume_credit: Number(sumOrders?.total_volume_credit || 0),
      total_commission_credit: Number(ledgerSum?.total_commission_credit || 0),
    },
    refs: list,
  };
});

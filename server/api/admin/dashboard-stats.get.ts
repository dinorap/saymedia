import pool from "../../utils/db";
import { ensureAdminWalletSchema } from "../../utils/adminWallet";
import { ensureCommerceSchema } from "../../utils/commerce";
import { resolveShopAdminId } from "../../utils/adminHierarchy";
import { assertShopManagementRole } from "../../utils/authHelpers";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);
  await ensureCommerceSchema();

  const isSuperAdmin = currentUser.role === "admin_0";
  const shopScopeId =
    !isSuperAdmin && currentUser.role === "admin_2"
      ? await resolveShopAdminId(currentUser.id, currentUser.role)
      : currentUser.id;

  // ----- Users -----
  // User mới hôm nay / 7 ngày qua
  const userScopeWhere = isSuperAdmin
    ? "WHERE 1 = 1"
    : "WHERE u.admin_id = ?";
  const userScopeParams: any[] = isSuperAdmin ? [] : [shopScopeId];

  const [[userTodayRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS new_users_today
      FROM users u
      ${userScopeWhere}
        AND DATE(u.created_at) = CURDATE()
    `,
    userScopeParams,
  );

  const [[user7dRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS new_users_last7d
      FROM users u
      ${userScopeWhere}
        AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    `,
    userScopeParams,
  );

  // ----- Orders (CREDIT) -----
  const orderFromSql = isSuperAdmin
    ? "FROM orders o"
    : `
      FROM orders o
      INNER JOIN users uo ON uo.id = o.user_id
    `;
  const orderScopeWhere = isSuperAdmin
    ? "WHERE o.status = 'completed'"
    : `
      WHERE o.status = 'completed'
        AND (
          uo.admin_id = ?
          OR o.seller_admin_id = ?
          OR o.product_owner_admin_id = ?
        )
    `;
  const orderScopeParams: any[] = isSuperAdmin
    ? []
    : [shopScopeId, currentUser.id, shopScopeId];

  const [[ordersTodayRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS completed_orders_today,
        COALESCE(SUM(COALESCE(o.amount_credit, ROUND(o.amount))), 0) AS completed_amount_today
      ${orderFromSql}
      ${orderScopeWhere}
        AND DATE(o.created_at) = CURDATE()
    `,
    orderScopeParams,
  );

  const [[ordersMonthRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS completed_orders_month,
        COALESCE(SUM(COALESCE(o.amount_credit, ROUND(o.amount))), 0) AS completed_amount_month
      ${orderFromSql}
      ${orderScopeWhere}
        AND YEAR(o.created_at) = YEAR(CURDATE())
        AND MONTH(o.created_at) = MONTH(CURDATE())
    `,
    orderScopeParams,
  );

  // ----- Deposits (VNĐ) -----
  const depositWhereBase = isSuperAdmin
    ? "WHERE pt.status = 'success'"
    : "WHERE pt.status = 'success' AND u.admin_id = ?";
  const depositParamsBase: any[] = isSuperAdmin ? [] : [shopScopeId];

  const [[depositsTodayRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS deposits_today_count,
        COALESCE(SUM(COALESCE(pt.actual_amount, pt.amount, 0)), 0) AS deposits_today_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhereBase}
        AND DATE(pt.created_at) = CURDATE()
    `,
    depositParamsBase,
  );

  const [[depositsMonthRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS deposits_month_count,
        COALESCE(SUM(COALESCE(pt.actual_amount, pt.amount, 0)), 0) AS deposits_month_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhereBase}
        AND YEAR(pt.created_at) = YEAR(CURDATE())
        AND MONTH(pt.created_at) = MONTH(CURDATE())
    `,
    depositParamsBase,
  );

  // ----- Admin wallet (credit "treo" cho shop) -----
  await ensureAdminWalletSchema();
  const walletScopeWhere = isSuperAdmin
    ? "AND a.role = 'admin_1'"
    : "AND w.admin_id = ? AND a.role = 'admin_1'";
  const walletParams: any[] = isSuperAdmin ? [] : [shopScopeId];

  const [[walletRow]]: any = await pool.query(
    `
      SELECT
        (
          COALESCE(SUM(
            CASE
              WHEN w.wallet_type IN ('sale_commission','subordinate_commission','product_revenue')
                THEN CASE WHEN o.id IS NULL OR o.status = 'completed' THEN w.amount_credit ELSE 0 END
              WHEN w.wallet_type = 'payout' THEN -w.amount_credit
              ELSE 0
            END
          ), 0)
          -
          COALESCE((
            SELECT SUM(
              CASE
                -- Phí sàn chỉ áp vào đơn shop tự bán (không qua ref) và chỉ tính cho admin_1
                WHEN owner.role = 'admin_1'
                  AND COALESCE(oo.seller_admin_id, oo.admin_id) = COALESCE(oo.product_owner_admin_id, oo.admin_id)
                  AND COALESCE(p.platform_fee_percent, 0) > 0
                  ${isSuperAdmin ? "" : "AND COALESCE(oo.product_owner_admin_id, oo.admin_id) = ?"}
                THEN ROUND(COALESCE(oo.amount_credit, ROUND(oo.amount)) * p.platform_fee_percent / 100)
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
      WHERE 1 = 1
      ${walletScopeWhere}
    `,
    isSuperAdmin ? walletParams : [...walletParams, shopScopeId],
  );

  return {
    success: true,
    data: {
      new_users_today: Number(userTodayRow?.new_users_today || 0),
      new_users_last7d: Number(user7dRow?.new_users_last7d || 0),
      completed_orders_today: Number(
        ordersTodayRow?.completed_orders_today || 0,
      ),
      completed_orders_month: Number(
        ordersMonthRow?.completed_orders_month || 0,
      ),
      completed_amount_today: Number(
        ordersTodayRow?.completed_amount_today || 0,
      ),
      completed_amount_month: Number(
        ordersMonthRow?.completed_amount_month || 0,
      ),
      deposits_today_count: Number(depositsTodayRow?.deposits_today_count || 0),
      deposits_today_amount: Number(
        depositsTodayRow?.deposits_today_amount || 0,
      ),
      deposits_month_count: Number(
        depositsMonthRow?.deposits_month_count || 0,
      ),
      deposits_month_amount: Number(
        depositsMonthRow?.deposits_month_amount || 0,
      ),
      pending_shop_credit: Number(walletRow?.pending_shop_credit || 0),
    },
  };
});


import pool from "../../utils/db";
import { ensureCreditLedgerSchema } from "../../utils/creditLedger";
import { resolveShopAdminId } from "../../utils/adminHierarchy";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (
    currentUser.role !== "admin_0" &&
    currentUser.role !== "admin_1" &&
    currentUser.role !== "admin_2"
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền truy cập",
    });
  }

  await ensureCreditLedgerSchema();

  const isSuperAdmin = currentUser.role === "admin_0";
  const shopScopeId =
    currentUser.role === "admin_2"
      ? await resolveShopAdminId(currentUser.id, currentUser.role)
      : currentUser.id;

  const userWhere = isSuperAdmin ? "" : "WHERE u.admin_id = ?";
  const userParams: any[] = isSuperAdmin ? [] : [shopScopeId];

  const ledgerJoin = isSuperAdmin
    ? ""
    : " INNER JOIN users u ON u.id = l.user_id ";
  const ledgerShopWhere = isSuperAdmin ? "" : " AND u.admin_id = ? ";
  const ledgerParam: any[] = isSuperAdmin ? [] : [shopScopeId];

  const [[totalUserBalance]]: any = await pool.query(
    `
      SELECT
        COALESCE(SUM(u.credit), 0) AS total_balance
      FROM users u
      ${userWhere}
    `,
    userParams,
  );

  let paidBonus = { total_paid_credit: 0, total_bonus_credit: 0 };
  try {
    const [[row]]: any = await pool.query(
      `
        SELECT
          COALESCE(SUM(u.paid_credit), 0) AS total_paid_credit,
          COALESCE(SUM(u.bonus_credit), 0) AS total_bonus_credit
        FROM users u
        ${userWhere}
      `,
      userParams,
    );
    paidBonus = {
      total_paid_credit: Number(row?.total_paid_credit || 0),
      total_bonus_credit: Number(row?.total_bonus_credit || 0),
    };
  } catch {
    paidBonus = { total_paid_credit: 0, total_bonus_credit: 0 };
  }

  const [[totalFromDeposit]]: any = await pool.query(
    `
      SELECT
        COALESCE(SUM(l.delta), 0) AS total_deposit_credit
      FROM credit_ledger l
      ${ledgerJoin}
      WHERE l.transaction_type = 'deposit'
      ${ledgerShopWhere}
    `,
    ledgerParam,
  );

  const [[totalFromPromotion]]: any = await pool.query(
    `
      SELECT
        COALESCE(SUM(l.delta), 0) AS total_promotion_credit
      FROM credit_ledger l
      ${ledgerJoin}
      WHERE l.transaction_type = 'promotion'
      ${ledgerShopWhere}
    `,
    ledgerParam,
  );

  let forcedUserCount = 0;
  try {
    const [[row]]: any = await pool.query(
      `
        SELECT
          COALESCE(COUNT(u.id), 0) AS forced_user_count
        FROM users u
        WHERE u.is_forced_created = 1
        ${isSuperAdmin ? "" : "AND u.admin_id = ?"}
      `,
      isSuperAdmin ? [] : [shopScopeId],
    );
    forcedUserCount = Number(row?.forced_user_count || 0);
  } catch {
    forcedUserCount = 0;
  }

  const [[depositStats]]: any = await pool.query(
    `
      SELECT
        COALESCE(COUNT(DISTINCT l.user_id), 0) AS deposit_user_count,
        COALESCE(SUM(l.delta), 0) AS deposit_credit_sum
      FROM credit_ledger l
      ${ledgerJoin}
      WHERE l.transaction_type = 'deposit'
      ${ledgerShopWhere}
    `,
    ledgerParam,
  );

  const [[todayDeposit]]: any = await pool.query(
    `
      SELECT
        COALESCE(COUNT(*), 0) AS today_deposit_tx_count,
        COALESCE(SUM(l.delta), 0) AS today_deposit_credit
      FROM credit_ledger l
      ${ledgerJoin}
      WHERE l.transaction_type = 'deposit'
        AND DATE(l.created_at) = CURDATE()
      ${ledgerShopWhere}
    `,
    ledgerParam,
  );

  const [[monthDeposit]]: any = await pool.query(
    `
      SELECT
        COALESCE(COUNT(*), 0) AS month_deposit_tx_count,
        COALESCE(SUM(l.delta), 0) AS month_deposit_credit
      FROM credit_ledger l
      ${ledgerJoin}
      WHERE l.transaction_type = 'deposit'
        AND YEAR(l.created_at) = YEAR(CURDATE())
        AND MONTH(l.created_at) = MONTH(CURDATE())
      ${ledgerShopWhere}
    `,
    ledgerParam,
  );

  const [[userCountRow]]: any = await pool.query(
    `
      SELECT COALESCE(COUNT(*), 0) AS total_users
      FROM users u
      ${userWhere}
    `,
    userParams,
  );

  let totalShops = 0;
  if (isSuperAdmin) {
    const [[adminCountRow]]: any = await pool.query(
      `
      SELECT COALESCE(COUNT(*), 0) AS total_shops
      FROM admins a
      WHERE a.role = 'admin_1'
    `,
    );
    totalShops = Number(adminCountRow?.total_shops || 0);
  } else {
    totalShops = 1;
  }

  return {
    success: true,
    data: {
      total_balance: Number(totalUserBalance?.total_balance || 0),
      total_paid_credit: paidBonus.total_paid_credit,
      total_bonus_credit: paidBonus.total_bonus_credit,
      total_deposit_credit: Number(totalFromDeposit?.total_deposit_credit || 0),
      total_promotion_credit: Number(
        totalFromPromotion?.total_promotion_credit || 0,
      ),
      forced_user_count: forcedUserCount,
      deposit_user_count: Number(depositStats?.deposit_user_count || 0),
      deposit_credit_sum: Number(depositStats?.deposit_credit_sum || 0),
      today_deposit_tx_count: Number(
        todayDeposit?.today_deposit_tx_count || 0,
      ),
      today_deposit_credit: Number(todayDeposit?.today_deposit_credit || 0),
      month_deposit_tx_count: Number(
        monthDeposit?.month_deposit_tx_count || 0,
      ),
      month_deposit_credit: Number(monthDeposit?.month_deposit_credit || 0),
      total_users: Number(userCountRow?.total_users || 0),
      total_shops: totalShops,
    },
  };
});

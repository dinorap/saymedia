import pool from "../../utils/db";

interface RevenueBucket {
  period: string;
  totalOrders: number;
  completedOrders: number;
  completedAmount: number;
  totalDepositAmount: number;
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const isSuperAdmin = currentUser.role === "admin_0";
  const scopeWhere = isSuperAdmin ? "" : " WHERE o.admin_id = ?";
  const scopeParams = isSuperAdmin ? [] : [currentUser.id];

  const userWhere = isSuperAdmin ? "" : " WHERE admin_id = ?";
  const userParams = isSuperAdmin ? [] : [currentUser.id];

  const [[usersRow]]: any = await pool.query(
    `SELECT COUNT(*) AS total_users FROM users${userWhere}`,
    userParams,
  );
  const [[adminsRow]]: any = await pool.query(
    "SELECT COUNT(*) AS total_admins FROM admins WHERE role = 'admin_1'",
  );

  const [[ordersRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_amount
      FROM orders o
      ${scopeWhere}
    `,
    scopeParams,
  );

  const depositWhere = isSuperAdmin
    ? " WHERE pt.status = 'success'"
    : " WHERE pt.status = 'success' AND u.admin_id = ?";
  const depositParams = isSuperAdmin ? [] : [currentUser.id];
  const [[depositRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS successful_deposits,
        SUM(COALESCE(pt.actual_amount, pt.amount, 0)) AS total_deposit_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhere}
    `,
    depositParams,
  );

  const [recentOrders]: any = await pool.query(
    `
      SELECT o.id, o.amount, o.status, o.created_at, u.username AS user_username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${scopeWhere}
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
    scopeParams,
  );

  const recentDepositWhere = isSuperAdmin ? "" : " WHERE u.admin_id = ?";
  const [recentDeposits]: any = await pool.query(
    `
      SELECT
        pt.id,
        pt.amount,
        pt.actual_amount,
        pt.status,
        pt.created_at,
        u.username AS user_username
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${recentDepositWhere}
      ORDER BY pt.created_at DESC
      LIMIT 5
    `,
    isSuperAdmin ? [] : [currentUser.id],
  );

  // ===== Aggregations by day / month / year =====
  const byDayMap = new Map<string, RevenueBucket>();
  const byMonthMap = new Map<string, RevenueBucket>();
  const byYearMap = new Map<string, RevenueBucket>();

  function ensureBucket(map: Map<string, RevenueBucket>, period: string) {
    if (!map.has(period)) {
      map.set(period, {
        period,
        totalOrders: 0,
        completedOrders: 0,
        completedAmount: 0,
        totalDepositAmount: 0,
      });
    }
    return map.get(period)!;
  }

  // Orders by day (last 7 days), month (last 6 months), year (last 3 years)
  const [ordersByDay]: any = await pool.query(
    `
      SELECT
        DATE(o.created_at) AS period,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount
      FROM orders o
      ${scopeWhere}
        ${scopeWhere ? "AND" : "WHERE"} o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(o.created_at)
      ORDER BY period ASC
    `,
    scopeParams,
  );

  for (const row of ordersByDay || []) {
    const key = row.period instanceof Date ? row.period.toISOString().slice(0, 10) : String(row.period);
    const bucket = ensureBucket(byDayMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
  }

  const [ordersByMonth]: any = await pool.query(
    `
      SELECT
        DATE_FORMAT(o.created_at, '%Y-%m') AS period,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount
      FROM orders o
      ${scopeWhere}
        ${scopeWhere ? "AND" : "WHERE"} o.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY period ASC
    `,
    scopeParams,
  );

  for (const row of ordersByMonth || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byMonthMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
  }

  const [ordersByYear]: any = await pool.query(
    `
      SELECT
        YEAR(o.created_at) AS period,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount
      FROM orders o
      ${scopeWhere}
        ${scopeWhere ? "AND" : "WHERE"} YEAR(o.created_at) >= YEAR(CURDATE()) - 2
      GROUP BY YEAR(o.created_at)
      ORDER BY period ASC
    `,
    scopeParams,
  );

  for (const row of ordersByYear || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byYearMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
  }

  // Deposits by day / month / year (success only, same scope)
  const [depositsByDay]: any = await pool.query(
    `
      SELECT
        DATE(pt.created_at) AS period,
        SUM(COALESCE(pt.actual_amount, pt.amount, 0)) AS total_deposit_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhere}
        AND pt.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(pt.created_at)
      ORDER BY period ASC
    `,
    depositParams,
  );

  for (const row of depositsByDay || []) {
    const key =
      row.period instanceof Date ? row.period.toISOString().slice(0, 10) : String(row.period);
    const bucket = ensureBucket(byDayMap, key);
    bucket.totalDepositAmount += Number(row.total_deposit_amount || 0);
  }

  const [depositsByMonth]: any = await pool.query(
    `
      SELECT
        DATE_FORMAT(pt.created_at, '%Y-%m') AS period,
        SUM(COALESCE(pt.actual_amount, pt.amount, 0)) AS total_deposit_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhere}
        AND pt.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      GROUP BY DATE_FORMAT(pt.created_at, '%Y-%m')
      ORDER BY period ASC
    `,
    depositParams,
  );

  for (const row of depositsByMonth || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byMonthMap, key);
    bucket.totalDepositAmount += Number(row.total_deposit_amount || 0);
  }

  const [depositsByYear]: any = await pool.query(
    `
      SELECT
        YEAR(pt.created_at) AS period,
        SUM(COALESCE(pt.actual_amount, pt.amount, 0)) AS total_deposit_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhere}
        AND YEAR(pt.created_at) >= YEAR(CURDATE()) - 2
      GROUP BY YEAR(pt.created_at)
      ORDER BY period ASC
    `,
    depositParams,
  );

  for (const row of depositsByYear || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byYearMap, key);
    bucket.totalDepositAmount += Number(row.total_deposit_amount || 0);
  }

  const byDay = Array.from(byDayMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
  const byMonth = Array.from(byMonthMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
  const byYear = Array.from(byYearMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  return {
    success: true,
    data: {
      totalUsers: Number(usersRow?.total_users || 0),
      totalAdmins: Number(adminsRow?.total_admins || 0),
      totalOrders: Number(ordersRow?.total_orders || 0),
      completedOrders: Number(ordersRow?.completed_orders || 0),
      completedAmount: Number(ordersRow?.completed_amount || 0),
      successfulDeposits: Number(depositRow?.successful_deposits || 0),
      totalDepositAmount: Number(depositRow?.total_deposit_amount || 0),
      recentOrders,
      recentDeposits,
      isSuperAdmin,
      byDay,
      byMonth,
      byYear,
    },
  };
});


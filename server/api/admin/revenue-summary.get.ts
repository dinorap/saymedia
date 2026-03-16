import pool from "../../utils/db";

interface RevenueBucket {
  period: string;
  totalOrders: number;
  completedOrders: number;
  completedAmount: number;
  selfAmount?: number;
  affiliateAmount?: number;
  ownerAmount?: number;
  shopSelfAmount?: number;
  platformFeeAmount?: number;
  totalDepositAmount: number;
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const isSuperAdmin = currentUser.role === "admin_0";
  // Scope orders:
  // - admin_0: toàn hệ thống
  // - admin_1: đơn được ghi nhận doanh số cho mình (orders.admin_id)
  //            + đơn của sản phẩm mình sở hữu (orders.product_owner_admin_id)
  const scopeWhere = isSuperAdmin
    ? ""
    : " WHERE (o.admin_id = ? OR o.product_owner_admin_id = ?)";
  const scopeParams = isSuperAdmin ? [] : [currentUser.id, currentUser.id];

  const userWhere = isSuperAdmin ? "" : " WHERE admin_id = ?";
  const userParams = isSuperAdmin ? [] : [currentUser.id];

  const [[usersRow]]: any = await pool.query(
    `SELECT COUNT(*) AS total_users FROM users${userWhere}`,
    userParams,
  );
  let totalAdmins = 0;
  if (isSuperAdmin) {
    const [[adminsRow]]: any = await pool.query(
      "SELECT COUNT(*) AS total_admins FROM admins WHERE role = 'admin_1'",
    );
    totalAdmins = Number(adminsRow?.total_admins || 0);
  } else {
    // Với admin_1 chỉ cần quan tâm tới chính shop của mình
    totalAdmins = 1;
  }

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
      SELECT
        o.id,
        o.amount,
        o.status,
        o.created_at,
        u.username AS user_username,
        o.seller_ref,
        sa.username AS seller_username,
        p.name AS product_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN admins sa ON o.seller_admin_id = sa.id
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
        selfAmount: 0,
        affiliateAmount: 0,
        ownerAmount: 0,
        shopSelfAmount: 0,
        platformFeeAmount: 0,
        totalDepositAmount: 0,
      });
    }
    return map.get(period)!;
  }

  // Orders by day (last 7 days), month (last 6 months), year (last 3 years)
  const [ordersByDay]: any = await pool.query(
    isSuperAdmin
      ? `
        SELECT
          DATE(o.created_at) AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          -- Doanh thu "chủ": chỉ tính đơn trực tiếp (không qua ref/bán hộ)
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_0' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS owner_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS shop_self_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN ROUND(o.amount * COALESCE(p.platform_fee_percent,0) / 100) ELSE 0 END) AS platform_fee_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.seller_admin_id IS NOT NULL AND o.admin_id <> o.product_owner_admin_id THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        JOIN admins owner ON o.product_owner_admin_id = owner.id
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY period ASC
      `
      : `
        SELECT
          DATE(o.created_at) AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.product_owner_admin_id = ? AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS self_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.admin_id = ? AND o.product_owner_admin_id <> ? THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        ${scopeWhere}
          AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY period ASC
      `,
    isSuperAdmin ? [] : [currentUser.id, currentUser.id, currentUser.id, ...scopeParams],
  );

  for (const row of ordersByDay || []) {
    const key = row.period instanceof Date ? row.period.toISOString().slice(0, 10) : String(row.period);
    const bucket = ensureBucket(byDayMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
    if (isSuperAdmin) {
      bucket.ownerAmount += Number(row.owner_amount || 0);
      bucket.shopSelfAmount += Number(row.shop_self_amount || 0);
      bucket.platformFeeAmount += Number(row.platform_fee_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    } else {
      bucket.selfAmount += Number(row.self_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    }
  }

  const [ordersByMonth]: any = await pool.query(
    isSuperAdmin
      ? `
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          -- Doanh thu "chủ": chỉ tính đơn trực tiếp (không qua ref/bán hộ)
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_0' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS owner_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS shop_self_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN ROUND(o.amount * COALESCE(p.platform_fee_percent,0) / 100) ELSE 0 END) AS platform_fee_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.seller_admin_id IS NOT NULL AND o.admin_id <> o.product_owner_admin_id THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        JOIN admins owner ON o.product_owner_admin_id = owner.id
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
        ORDER BY period ASC
      `
      : `
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.product_owner_admin_id = ? AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS self_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.admin_id = ? AND o.product_owner_admin_id <> ? THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        ${scopeWhere}
          AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
        ORDER BY period ASC
      `,
    isSuperAdmin ? [] : [currentUser.id, currentUser.id, currentUser.id, ...scopeParams],
  );

  for (const row of ordersByMonth || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byMonthMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
    if (isSuperAdmin) {
      bucket.ownerAmount += Number(row.owner_amount || 0);
      bucket.shopSelfAmount += Number(row.shop_self_amount || 0);
      bucket.platformFeeAmount += Number(row.platform_fee_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    } else {
      bucket.selfAmount += Number(row.self_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    }
  }

  const [ordersByYear]: any = await pool.query(
    isSuperAdmin
      ? `
        SELECT
          YEAR(o.created_at) AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          -- Doanh thu "chủ": chỉ tính đơn trực tiếp (không qua ref/bán hộ)
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_0' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS owner_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS shop_self_amount,
          SUM(CASE WHEN o.status = 'completed' AND owner.role = 'admin_1' AND o.admin_id = o.product_owner_admin_id THEN ROUND(o.amount * COALESCE(p.platform_fee_percent,0) / 100) ELSE 0 END) AS platform_fee_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.seller_admin_id IS NOT NULL AND o.admin_id <> o.product_owner_admin_id THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        JOIN admins owner ON o.product_owner_admin_id = owner.id
        LEFT JOIN products p ON o.product_id = p.id
        WHERE YEAR(o.created_at) >= YEAR(CURDATE()) - 2
        GROUP BY YEAR(o.created_at)
        ORDER BY period ASC
      `
      : `
        SELECT
          YEAR(o.created_at) AS period,
          COUNT(*) AS total_orders,
          SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
          SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END) AS completed_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.product_owner_admin_id = ? AND o.admin_id = o.product_owner_admin_id THEN o.amount ELSE 0 END) AS self_amount,
          SUM(CASE WHEN o.status = 'completed' AND o.admin_id = ? AND o.product_owner_admin_id <> ? THEN o.amount ELSE 0 END) AS affiliate_amount
        FROM orders o
        ${scopeWhere}
          AND YEAR(o.created_at) >= YEAR(CURDATE()) - 2
        GROUP BY YEAR(o.created_at)
        ORDER BY period ASC
      `,
    isSuperAdmin ? [] : [currentUser.id, currentUser.id, currentUser.id, ...scopeParams],
  );

  for (const row of ordersByYear || []) {
    const key = String(row.period);
    const bucket = ensureBucket(byYearMap, key);
    bucket.totalOrders += Number(row.total_orders || 0);
    bucket.completedOrders += Number(row.completed_orders || 0);
    bucket.completedAmount += Number(row.completed_amount || 0);
    if (isSuperAdmin) {
      bucket.ownerAmount += Number(row.owner_amount || 0);
      bucket.shopSelfAmount += Number(row.shop_self_amount || 0);
      bucket.platformFeeAmount += Number(row.platform_fee_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    } else {
      bucket.selfAmount += Number(row.self_amount || 0);
      bucket.affiliateAmount += Number(row.affiliate_amount || 0);
    }
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
      totalAdmins,
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


import pool from "../../utils/db";
import { ensureUserStatsSchema } from "../../utils/userStats";
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
    throw createError({ statusCode: 403, statusMessage: "Không có quyền truy cập" });
  }

  await ensureUserStatsSchema();

  const isSuperAdmin = currentUser.role === "admin_0";
  const shopScopeId = isSuperAdmin
    ? null
    : currentUser.role === "admin_2"
      ? await resolveShopAdminId(currentUser.id, currentUser.role)
      : currentUser.id;

  const userScopeSql = isSuperAdmin ? "" : " AND u.admin_id = ?";
  const userScopeParam: any[] = isSuperAdmin ? [] : [shopScopeId];

  // 1) ID nạp nhiều nhất (tính theo actual_amount nếu có, không thì amount), chỉ giao dịch thành công
  const [topDepositors]: any = await pool.query(
    `
      SELECT
        pt.user_id AS userId,
        u.username,
        SUM(COALESCE(pt.actual_amount, pt.amount)) AS totalAmount
      FROM payment_transactions pt
      JOIN users u ON u.id = pt.user_id
      WHERE pt.status = 'success'
      ${userScopeSql}
      GROUP BY pt.user_id, u.username
      ORDER BY totalAmount DESC
      LIMIT 1
    `,
    userScopeParam,
  );

  // 2) ID từ ngày tạo đến nay chưa đăng nhập (last_login IS NULL)
  const [neverLoggedIn]: any = await pool.query(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.created_at
      FROM users u
      WHERE u.last_login IS NULL
      ${isSuperAdmin ? "" : "AND u.admin_id = ?"}
      ORDER BY u.created_at ASC
      LIMIT 200
    `,
    userScopeParam,
  );

  // 3) ID từ ngày tạo đến nay chưa nạp (không có giao dịch nạp thành công)
  const [neverDeposited]: any = await pool.query(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.created_at
      FROM users u
      LEFT JOIN payment_transactions pt
        ON pt.user_id = u.id
       AND pt.status = 'success'
      WHERE pt.id IS NULL
      ${isSuperAdmin ? "" : "AND u.admin_id = ?"}
      ORDER BY u.created_at ASC
      LIMIT 200
    `,
    userScopeParam,
  );

  return {
    success: true,
    topDepositor: topDepositors[0] || null,
    neverLoggedIn,
    neverDeposited,
  };
});

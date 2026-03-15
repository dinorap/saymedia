import pool from "../../../utils/db";
import { ensureAdminWalletSchema } from "../../../utils/adminWallet";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAdminWalletSchema();

  const query = getQuery(event);
  const adminIdRaw = query.admin_id ? parseInt(String(query.admin_id), 10) : null;
  const fromDate = query.from ? String(query.from).trim() : null;
  const toDate = query.to ? String(query.to).trim() : null;

  const isSuperAdmin = currentUser.role === "admin_0";
  const targetAdminId = isSuperAdmin && adminIdRaw && Number.isFinite(adminIdRaw) ? adminIdRaw : currentUser.id;
  if (!isSuperAdmin && targetAdminId !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: "Không có quyền xem doanh thu shop khác" });
  }

  const dateConditions: string[] = [];
  const dateParams: any[] = [];
  if (fromDate) {
    dateConditions.push(" AND o.created_at >= ?");
    dateParams.push(fromDate + " 00:00:00");
  }
  if (toDate) {
    dateConditions.push(" AND o.created_at <= ?");
    dateParams.push(toDate + " 23:59:59");
  }

  const [rows]: any = await pool.query(
    `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      COUNT(DISTINCT o.id) AS order_count,
      COALESCE(SUM(o.paid_part), 0) AS total_paid_part,
      COALESCE(SUM(o.amount), 0) AS total_amount
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE COALESCE(o.seller_admin_id, o.admin_id) = ? AND o.status = 'completed'${dateConditions.join("")}
    GROUP BY p.id, p.name
    ORDER BY total_paid_part DESC, order_count DESC
    `,
    [targetAdminId, ...dateParams]
  );

  return {
    admin_id: targetAdminId,
    by_product: rows || [],
  };
});

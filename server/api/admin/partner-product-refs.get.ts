import pool from "../../utils/db";
import { ensurePartnerSchema } from "../../utils/partner";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser || currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới xem cấu hình ref đối tác",
    });
  }

  await ensurePartnerSchema();

  const query = getQuery(event);
  const productId = query.product_id ? parseInt(String(query.product_id), 10) : null;
  const userId = query.user_id ? parseInt(String(query.user_id), 10) : null;

  const hasProduct = productId != null && Number.isFinite(productId) && productId > 0;
  const hasUser = userId != null && Number.isFinite(userId) && userId > 0;
  if (!hasProduct && !hasUser) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cần tham số product_id hoặc user_id",
    });
  }

  let sql = `
    SELECT
      ppr.id,
      ppr.user_id,
      ppr.product_id,
      ppr.ref_code,
      ppr.commission_percent,
      ppr.is_active,
      ppr.created_at,
      u.username AS user_username,
      u.email AS user_email,
      p.name AS product_name
    FROM partner_product_refs ppr
    INNER JOIN users u ON u.id = ppr.user_id
    INNER JOIN products p ON p.id = ppr.product_id
    WHERE 1 = 1
  `;
  const params: number[] = [];
  if (hasProduct) {
    sql += " AND ppr.product_id = ?";
    params.push(productId!);
  }
  if (hasUser) {
    sql += " AND ppr.user_id = ?";
    params.push(userId!);
  }
  sql += " ORDER BY p.name ASC, u.username ASC, ppr.id ASC";

  const [rows]: any = await pool.query(sql, params);

  return { success: true, data: rows || [] };
});

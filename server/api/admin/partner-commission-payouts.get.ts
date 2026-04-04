import pool from "../../utils/db";
import { ensurePartnerSchema } from "../../utils/partner";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser || currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới xem hoa hồng đối tác chờ duyệt",
    });
  }

  await ensurePartnerSchema();

  const query = getQuery(event);
  const status = query.status ? String(query.status).trim() : "pending";

  const [rows]: any = await pool.query(
    `
      SELECT
        pcp.id,
        pcp.order_id,
        pcp.partner_user_id,
        pcp.amount_credit,
        pcp.status,
        pcp.created_at,
        u.username AS partner_username,
        u.email AS partner_email,
        o.user_id AS buyer_user_id,
        bu.username AS buyer_username,
        o.product_id,
        pr.name AS product_name,
        o.amount_credit AS order_amount_credit
      FROM partner_commission_payouts pcp
      INNER JOIN users u ON u.id = pcp.partner_user_id
      INNER JOIN orders o ON o.id = pcp.order_id
      INNER JOIN users bu ON bu.id = o.user_id
      LEFT JOIN products pr ON pr.id = o.product_id
      WHERE pcp.status = ?
      ORDER BY pcp.created_at ASC, pcp.id ASC
    `,
    [status],
  );

  return { success: true, data: rows || [] };
});

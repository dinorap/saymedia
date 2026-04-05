import pool from "../../utils/db";
import { ensurePartnerSchema } from "../../utils/partner";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser || currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin xem danh sách đối tác user (admin_3)",
    });
  }
  await ensurePartnerSchema();

  const [rows]: any = await pool.query(
    `
      SELECT
        u.id,
        u.username,
        u.email,
        u.partner_role,
        u.created_at,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.amount_credit), 0) AS volume_credit
      FROM users u
      LEFT JOIN orders o ON o.partner_user_id = u.id AND o.status = 'completed'
      WHERE u.partner_role = 'admin_3'
      GROUP BY u.id, u.username, u.email, u.partner_role, u.created_at
      ORDER BY u.id DESC
    `,
  );

  const out = (rows || []).map((r: any) => ({
    user_id: Number(r.id),
    username: r.username,
    email: r.email,
    order_count: Number(r.order_count || 0),
    volume_credit: Number(r.volume_credit || 0),
  }));

  return { success: true, data: out };
});

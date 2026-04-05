import pool from "../../utils/db";
import { ensureAdminWalletSchema } from "../../utils/adminWallet";
import { ensureCommerceSchema } from "../../utils/commerce";

/**
 * Hoa hồng admin_2 theo từng đại lý (admin_1):
 * - commission_credit: tổng sale_commission trên ví admin_2 (đại lý trả tiền mặt cho cấp dưới)
 * - Cùng số tiền được ghi subordinate_commission trên ví admin_1 (đối soát khi admin_0 trả đại lý)
 */
export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  await ensureCommerceSchema();
  await ensureAdminWalletSchema();

  const query = getQuery(event);
  const shopAdminIdRaw = query.shop_admin_id
    ? parseInt(String(query.shop_admin_id), 10)
    : null;
  const fromDate = query.from ? String(query.from).trim() : null;
  const toDate = query.to ? String(query.to).trim() : null;

  const dateConds: string[] = [];
  const dateParams: any[] = [];
  if (fromDate) {
    dateConds.push("w.created_at >= ?");
    dateParams.push(fromDate + " 00:00:00");
  }
  if (toDate) {
    dateConds.push("w.created_at <= ?");
    dateParams.push(toDate + " 23:59:59");
  }
  const dateSql = dateConds.length ? `AND ${dateConds.join(" AND ")}` : "";

  const where: string[] = ["sub.role = 'admin_2'", "sub.parent_admin_id IS NOT NULL"];
  const params: any[] = [...dateParams];

  if (currentUser.role === "admin_1") {
    where.push("sub.parent_admin_id = ?");
    params.push(currentUser.id);
  } else if (currentUser.role === "admin_0") {
    if (
      shopAdminIdRaw != null &&
      Number.isFinite(shopAdminIdRaw) &&
      shopAdminIdRaw > 0
    ) {
      where.push("sub.parent_admin_id = ?");
      params.push(shopAdminIdRaw);
    }
  } else {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 / admin_1 xem được báo cáo cấp dưới",
    });
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows]: any = await pool.query(
    `
    SELECT
      shop.id AS shop_admin_id,
      shop.username AS shop_username,
      sub.id AS subordinate_admin_id,
      sub.username AS subordinate_username,
      sub.ref_code AS subordinate_ref_code,
      COALESCE(SUM(w.amount_credit), 0) AS commission_credit,
      COUNT(DISTINCT w.order_id) AS order_count
    FROM admins sub
    INNER JOIN admins shop ON shop.id = sub.parent_admin_id
    LEFT JOIN admin_wallet w ON w.admin_id = sub.id AND w.wallet_type = 'sale_commission'
      ${dateSql}
    ${whereSql}
    GROUP BY shop.id, shop.username, sub.id, sub.username, sub.ref_code
    ORDER BY shop.id, sub.id
    `,
    params,
  );

  const out = (rows || []).map((r: any) => ({
    shop_admin_id: Number(r.shop_admin_id),
    shop_username: String(r.shop_username || ""),
    subordinate_admin_id: Number(r.subordinate_admin_id),
    subordinate_username: String(r.subordinate_username || ""),
    subordinate_ref_code: String(r.subordinate_ref_code || ""),
    commission_credit: Number(r.commission_credit || 0),
    rollup_credit: Number(r.commission_credit || 0),
    order_count: Number(r.order_count || 0),
  }));

  let shop_totals: {
    shop_admin_id: number;
    shop_username: string;
    rollup_credit: number;
  }[] = [];

  if (currentUser.role === "admin_0") {
    const wc: string[] = ["w.wallet_type = 'subordinate_commission'", "a.role = 'admin_1'"];
    const wp: any[] = [];
    if (fromDate) {
      wc.push("w.created_at >= ?");
      wp.push(fromDate + " 00:00:00");
    }
    if (toDate) {
      wc.push("w.created_at <= ?");
      wp.push(toDate + " 23:59:59");
    }
    if (
      shopAdminIdRaw != null &&
      Number.isFinite(shopAdminIdRaw) &&
      shopAdminIdRaw > 0
    ) {
      wc.push("w.admin_id = ?");
      wp.push(shopAdminIdRaw);
    }
    const [tot]: any = await pool.query(
      `
      SELECT
        a.id AS shop_admin_id,
        a.username AS shop_username,
        COALESCE(SUM(w.amount_credit), 0) AS rollup_credit
      FROM admin_wallet w
      INNER JOIN admins a ON a.id = w.admin_id
      WHERE ${wc.join(" AND ")}
      GROUP BY a.id, a.username
      ORDER BY a.id
      `,
      wp,
    );
    shop_totals = (tot || []).map((r: any) => ({
      shop_admin_id: Number(r.shop_admin_id),
      shop_username: String(r.shop_username || ""),
      rollup_credit: Number(r.rollup_credit || 0),
    }));
  }

  return {
    success: true,
    data: out,
    shop_totals: currentUser.role === "admin_0" ? shop_totals : undefined,
  };
});

import pool from "../../../utils/db";
import { ensureAdminWalletSchema } from "../../../utils/adminWallet";
import { getVndPerCredit } from "../../../utils/payment";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  await ensureAdminWalletSchema();

  const query = getQuery(event);
  const fromDate = query.from ? String(query.from).trim() : null;
  const toDate = query.to ? String(query.to).trim() : null;

  const isSuperAdmin = currentUser.role === "admin_0";
  const adminIdFilter = query.admin_id ? parseInt(String(query.admin_id), 10) : null;

  let adminIds: number[] = [];
  if (isSuperAdmin) {
    if (adminIdFilter && Number.isFinite(adminIdFilter)) {
      adminIds = [adminIdFilter];
    } else {
      const [rows]: any = await pool.query(
        "SELECT id FROM admins WHERE role = 'admin_1' ORDER BY id"
      );
      adminIds = (rows || []).map((r: any) => r.id);
      const [[owner]]: any = await pool.query("SELECT id FROM admins WHERE role = 'admin_0' LIMIT 1");
      if (owner) adminIds = [owner.id, ...adminIds];
    }
  } else {
    adminIds = [currentUser.id];
  }

  if (!adminIds.length) {
    return { partners: [], vndPerCredit: 1000 };
  }

  const placeholders = adminIds.map(() => "?").join(",");
  const params: any[] = [...adminIds];
  let dateWhere = "";
  if (fromDate) {
    dateWhere += " AND w.created_at >= ?";
    params.push(fromDate + " 00:00:00");
  }
  if (toDate) {
    dateWhere += " AND w.created_at <= ?";
    params.push(toDate + " 23:59:59");
  }

  const [walletRows]: any = await pool.query(
    `
    SELECT
      w.admin_id,
      SUM(w.amount_credit) AS balance_credit,
      SUM(CASE WHEN w.wallet_type IN ('sale_commission','product_revenue') THEN w.amount_credit ELSE 0 END) AS total_earned,
      SUM(CASE WHEN w.wallet_type = 'payout' THEN w.amount_credit ELSE 0 END) AS total_payout
    FROM admin_wallet w
    WHERE w.admin_id IN (${placeholders}) ${dateWhere}
    GROUP BY w.admin_id
    `,
    params
  );

  const orderDateConditions: string[] = [];
  const orderDateParams: any[] = [...adminIds];
  if (fromDate) {
    orderDateConditions.push(" AND o.created_at >= ?");
    orderDateParams.push(fromDate + " 00:00:00");
  }
  if (toDate) {
    orderDateConditions.push(" AND o.created_at <= ?");
    orderDateParams.push(toDate + " 23:59:59");
  }
  const [orderCountRows]: any = await pool.query(
    `
    SELECT COALESCE(o.seller_admin_id, o.admin_id) AS admin_id, COUNT(*) AS order_count
    FROM orders o
    WHERE o.status = 'completed' AND COALESCE(o.seller_admin_id, o.admin_id) IN (${placeholders})${orderDateConditions.join("")}
    GROUP BY COALESCE(o.seller_admin_id, o.admin_id)
    `,
    orderDateParams
  );

  const orderCountMap = new Map<number, number>();
  for (const r of orderCountRows || []) {
    orderCountMap.set(Number(r.admin_id), Number(r.order_count || 0));
  }

  const [admins]: any = await pool.query(
    `SELECT id, username, role FROM admins WHERE id IN (${placeholders})`,
    adminIds
  );
  const adminMap = new Map<number, any>();
  for (const a of admins || []) {
    adminMap.set(a.id, a);
  }

  const walletMap = new Map<number, { balance_credit: number; total_earned: number; total_payout: number }>();
  for (const w of walletRows || []) {
    walletMap.set(Number(w.admin_id), {
      balance_credit: Number(w.balance_credit || 0),
      total_earned: Number(w.total_earned || 0),
      total_payout: Number(w.total_payout || 0),
    });
  }

  const vndPerCredit = getVndPerCredit();

  const partners = adminIds.map((id) => {
    const admin = adminMap.get(id);
    const wallet = walletMap.get(id) || { balance_credit: 0, total_earned: 0, total_payout: 0 };
    return {
      admin_id: id,
      username: admin?.username || "",
      role: admin?.role || "",
      balance_credit: wallet.balance_credit,
      total_earned: wallet.total_earned,
      total_payout: wallet.total_payout,
      balance_vnd: wallet.balance_credit * vndPerCredit,
      order_count: orderCountMap.get(id) || 0,
    };
  });

  return {
    partners,
    vnd_per_credit: vndPerCredit,
  };
});

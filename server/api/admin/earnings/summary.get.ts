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
  let platformAdminId: number | null = null;
  if (isSuperAdmin) {
    if (adminIdFilter && Number.isFinite(adminIdFilter)) {
      adminIds = [adminIdFilter];
    } else {
      const [rows]: any = await pool.query(
        "SELECT id FROM admins WHERE role = 'admin_1' ORDER BY id"
      );
      adminIds = (rows || []).map((r: any) => r.id);
      const [[owner]]: any = await pool.query("SELECT id FROM admins WHERE role = 'admin_0' LIMIT 1");
      if (owner) {
        platformAdminId = owner.id;
        adminIds = [owner.id, ...adminIds];
      }
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
    SELECT
      COALESCE(o.seller_admin_id, o.admin_id) AS admin_id,
      COUNT(*) AS order_count,
      SUM(o.amount) AS total_gross_amount
    FROM orders o
    WHERE o.status = 'completed' AND COALESCE(o.seller_admin_id, o.admin_id) IN (${placeholders})${orderDateConditions.join("")}
    GROUP BY COALESCE(o.seller_admin_id, o.admin_id)
    `,
    orderDateParams
  );

  const orderCountMap = new Map<number, number>();
  const orderAmountMap = new Map<number, number>();
  for (const r of orderCountRows || []) {
    const id = Number(r.admin_id);
    orderCountMap.set(id, Number(r.order_count || 0));
    orderAmountMap.set(id, Number(r.total_gross_amount || 0));
  }

  const platformFeeByOwner = new Map<number, number>();
  let totalPlatformFeeForPlatformAdmin = 0;
  if (platformAdminId) {
    const feeParams: any[] = [];
    const feeWhere: string[] = [];
    if (fromDate) {
      feeWhere.push("AND o.created_at >= ?");
      feeParams.push(fromDate + " 00:00:00");
    }
    if (toDate) {
      feeWhere.push("AND o.created_at <= ?");
      feeParams.push(toDate + " 23:59:59");
    }

    const [feeRows]: any = await pool.query(
      `
        SELECT
          o.admin_id AS owner_admin_id,
          SUM(
            CASE
              WHEN owner.role = 'admin_1'
                   AND COALESCE(o.seller_admin_id, o.admin_id) = o.admin_id
                   AND COALESCE(p.platform_fee_percent, 0) > 0
              THEN ROUND(o.amount * p.platform_fee_percent / 100)
              ELSE 0
            END
          ) AS total_platform_fee
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN admins owner ON o.admin_id = owner.id
        WHERE o.status = 'completed'
          AND owner.role = 'admin_1'
          ${feeWhere.join(" ")}
        GROUP BY o.admin_id
      `,
      feeParams,
    );

    for (const r of feeRows || []) {
      const ownerId = Number(r.owner_admin_id);
      const fee = Number(r.total_platform_fee || 0);
      if (!fee) continue;
      platformFeeByOwner.set(ownerId, fee);
      totalPlatformFeeForPlatformAdmin += fee;
    }
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
    const grossAmount = orderAmountMap.get(id) || 0;
    let balanceCredit = wallet.balance_credit;
    const ownerPlatformFee = platformFeeByOwner.get(id) || 0;
    if (ownerPlatformFee && id !== platformAdminId) {
      balanceCredit = Math.max(0, balanceCredit - ownerPlatformFee);
    }
    if (platformAdminId && id === platformAdminId && totalPlatformFeeForPlatformAdmin) {
      balanceCredit += totalPlatformFeeForPlatformAdmin;
    }
    return {
      admin_id: id,
      username: admin?.username || "",
      role: admin?.role || "",
      balance_credit: balanceCredit,
      // Doanh thu (credit): tổng giá trị đơn (chưa trừ hoa hồng)
      total_earned: grossAmount,
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

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
      SUM(CASE WHEN w.wallet_type IN ('sale_commission','product_revenue') THEN CASE WHEN o.id IS NULL OR o.status = 'completed' THEN w.amount_credit ELSE 0 END ELSE 0 END) AS total_earned,
      SUM(CASE WHEN w.wallet_type = 'payout' THEN w.amount_credit ELSE 0 END) AS total_payout,
      SUM(CASE WHEN w.wallet_type = 'sale_commission' THEN CASE WHEN o.id IS NULL OR o.status = 'completed' THEN w.amount_credit ELSE 0 END ELSE 0 END) AS affiliate_received_credit
    FROM admin_wallet w
    LEFT JOIN orders o ON w.order_id = o.id
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

  // ===== Tách doanh thu tự bán vs bán hộ (theo orders) =====
  // - self: o.admin_id = shop AND (seller_admin_id IS NULL OR seller_admin_id = o.admin_id)
  // - affiliate: o.seller_admin_id = shop AND o.admin_id != o.seller_admin_id
  const selfOrderCountMap = new Map<number, number>();
  const selfGrossMap = new Map<number, number>();
  const affiliateOrderCountMap = new Map<number, number>();
  const affiliateGrossMap = new Map<number, number>();

  if (adminIds.length) {
    const placeholders2 = adminIds.map(() => "?").join(",");
    const params2: any[] = [...adminIds, ...adminIds];
    let dateSql = "";
    if (fromDate) {
      dateSql += " AND o.created_at >= ?";
      params2.push(fromDate + " 00:00:00");
    }
    if (toDate) {
      dateSql += " AND o.created_at <= ?";
      params2.push(toDate + " 23:59:59");
    }

    const [splitRows]: any = await pool.query(
      `
        SELECT
          COALESCE(o.product_owner_admin_id, o.admin_id) AS owner_admin_id,
          COALESCE(o.seller_admin_id, o.admin_id) AS report_admin_id,
          COUNT(*) AS order_count,
          COALESCE(SUM(o.amount), 0) AS total_gross_amount
        FROM orders o
        WHERE o.status = 'completed'
          AND (COALESCE(o.product_owner_admin_id, o.admin_id) IN (${placeholders2}) OR COALESCE(o.seller_admin_id, o.admin_id) IN (${placeholders2}))
          ${dateSql}
        GROUP BY COALESCE(o.product_owner_admin_id, o.admin_id), COALESCE(o.seller_admin_id, o.admin_id)
      `,
      params2,
    );

    for (const r of splitRows || []) {
      const ownerId = Number(r.owner_admin_id);
      const reportId = Number(r.report_admin_id);
      const cnt = Number(r.order_count || 0);
      const amt = Number(r.total_gross_amount || 0);

      // Self sale: đơn được ghi nhận cho chính owner (không qua ref)
      if (reportId === ownerId) {
        // self sale for owner
        if (adminIds.includes(ownerId)) {
          selfOrderCountMap.set(
            ownerId,
            (selfOrderCountMap.get(ownerId) || 0) + cnt,
          );
          selfGrossMap.set(ownerId, (selfGrossMap.get(ownerId) || 0) + amt);
        }
      } else {
        // affiliate sale for report admin (seller)
        if (adminIds.includes(reportId) && reportId !== ownerId) {
          affiliateOrderCountMap.set(
            reportId,
            (affiliateOrderCountMap.get(reportId) || 0) + cnt,
          );
          affiliateGrossMap.set(
            reportId,
            (affiliateGrossMap.get(reportId) || 0) + amt,
          );
        }
      }
    }
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
          COALESCE(o.product_owner_admin_id, o.admin_id) AS owner_admin_id,
          SUM(
            CASE
              WHEN owner.role = 'admin_1'
                   AND COALESCE(o.seller_admin_id, o.admin_id) = COALESCE(o.product_owner_admin_id, o.admin_id)
                   AND COALESCE(p.platform_fee_percent, 0) > 0
              THEN ROUND(o.amount * p.platform_fee_percent / 100)
              ELSE 0
            END
          ) AS total_platform_fee
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN admins owner ON COALESCE(o.product_owner_admin_id, o.admin_id) = owner.id
        WHERE o.status = 'completed'
          AND owner.role = 'admin_1'
          ${feeWhere.join(" ")}
        GROUP BY COALESCE(o.product_owner_admin_id, o.admin_id)
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

  const walletMap = new Map<
    number,
    { balance_credit: number; total_earned: number; total_payout: number; affiliate_received_credit: number }
  >();
  for (const w of walletRows || []) {
    walletMap.set(Number(w.admin_id), {
      balance_credit: Number(w.balance_credit || 0),
      total_earned: Number(w.total_earned || 0),
      total_payout: Number(w.total_payout || 0),
      affiliate_received_credit: Number(w.affiliate_received_credit || 0),
    });
  }

  const vndPerCredit = getVndPerCredit();

  const partners = adminIds.map((id) => {
    const admin = adminMap.get(id);
    const wallet =
      walletMap.get(id) || {
        balance_credit: 0,
        total_earned: 0,
        total_payout: 0,
        affiliate_received_credit: 0,
      };
    const grossAmount = orderAmountMap.get(id) || 0;
    let balanceCredit = wallet.balance_credit;
    const ownerPlatformFee = platformFeeByOwner.get(id) || 0;
    if (ownerPlatformFee && id !== platformAdminId) {
      balanceCredit = Math.max(0, balanceCredit - ownerPlatformFee);
    }
    if (platformAdminId && id === platformAdminId && totalPlatformFeeForPlatformAdmin) {
      balanceCredit += totalPlatformFeeForPlatformAdmin;
    }

    const selfOrderCount = selfOrderCountMap.get(id) || 0;
    const selfGrossAmount = selfGrossMap.get(id) || 0;
    const selfPlatformFee = ownerPlatformFee || 0;
    const selfNetAmount = Math.max(0, selfGrossAmount - selfPlatformFee);
    const affiliateOrderCount = affiliateOrderCountMap.get(id) || 0;
    const affiliateGrossAmount = affiliateGrossMap.get(id) || 0;

    return {
      admin_id: id,
      username: admin?.username || "",
      role: admin?.role || "",
      balance_credit: balanceCredit,
      // Doanh thu (credit): tổng giá trị đơn (chưa trừ hoa hồng)
      total_earned: grossAmount,
      total_payout: wallet.total_payout,
      affiliate_received_credit: wallet.affiliate_received_credit,
      balance_vnd: balanceCredit * vndPerCredit,
      order_count: orderCountMap.get(id) || 0,

      // split fields for UI
      self_order_count: selfOrderCount,
      self_gross_amount: selfGrossAmount,
      self_platform_fee: selfPlatformFee,
      self_net_amount: selfNetAmount,
      affiliate_order_count: affiliateOrderCount,
      affiliate_gross_amount: affiliateGrossAmount,
    };
  });

  return {
    partners,
    vnd_per_credit: vndPerCredit,
  };
});

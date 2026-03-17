import pool from "../../../utils/db";
import { ensureAdminWalletSchema } from "../../../utils/adminWallet";
import { ensureCommerceSchema } from "../../../utils/commerce";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  await ensureCommerceSchema();

  await ensureAdminWalletSchema();

  const query = getQuery(event);
  const adminIdRaw = query.admin_id ? parseInt(String(query.admin_id), 10) : null;
  const fromDate = query.from ? String(query.from).trim() : null;
  const toDate = query.to ? String(query.to).trim() : null;

  const isSuperAdmin = currentUser.role === "admin_0";
  const targetAdminId =
    isSuperAdmin && adminIdRaw && Number.isFinite(adminIdRaw) ? adminIdRaw : currentUser.id;
  if (!isSuperAdmin && targetAdminId !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: "Không có quyền xem doanh thu shop khác" });
  }

  const [[platformAdmin]]: any = await pool.query(
    "SELECT id FROM admins WHERE role = 'admin_0' LIMIT 1",
  );
  const platformAdminId: number | null = platformAdmin?.id || null;

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
      o.id,
      o.product_id,
      COALESCE(o.amount_credit, ROUND(o.amount)) AS amount,
      o.amount_credit,
      COALESCE(o.product_owner_admin_id, o.admin_id) AS owner_admin_id,
      COALESCE(o.seller_admin_id, o.admin_id) AS report_admin_id,
      p.name AS product_name,
      COALESCE(p.platform_fee_percent, 0) AS platform_fee_percent,
      owner.role AS owner_role,
      COALESCE(w.amount_credit, 0) AS wallet_credit
    FROM orders o
    JOIN products p ON o.product_id = p.id
    JOIN admins owner ON COALESCE(o.product_owner_admin_id, o.admin_id) = owner.id
    LEFT JOIN admin_wallet w
      ON w.order_id = o.id
     AND w.admin_id = ?
     AND w.wallet_type IN ('sale_commission','product_revenue')
    WHERE o.status = 'completed'
      AND COALESCE(o.seller_admin_id, o.admin_id) = ?
      ${dateConditions.join("")}
    `,
    [targetAdminId, targetAdminId, ...dateParams],
  );

  const productMap = new Map<
    number,
    {
      product_id: number;
      product_name: string;
      owner_admin_id: number;
      order_count: number;
      total_gross_amount: number;
      total_credit_share: number;
      total_platform_fee: number;
    }
  >();

  for (const row of rows || []) {
    const productId = Number(row.product_id);
    if (!productId) continue;
    const productName = row.product_name || "";
    const amount = Number(row.amount || 0);
    const walletCredit = Number(row.wallet_credit || 0);
    const ownerId = Number(row.owner_admin_id);
    const reportAdminId = Number(row.report_admin_id);
    const ownerRole = String(row.owner_role || "");
    const platformFeePercent = Number(row.platform_fee_percent || 0);

    const isSelfSale = reportAdminId === ownerId;

    let creditShare = 0;
    let platformFeeForRow = 0;
    if (
      ownerRole === "admin_1" &&
      isSelfSale &&
      platformFeePercent > 0 &&
      ownerId === targetAdminId
    ) {
      creditShare = Math.round((amount * (100 - platformFeePercent)) / 100);
      platformFeeForRow = Math.round((amount * platformFeePercent) / 100);
    } else if (
      ownerRole === "admin_1" &&
      isSelfSale &&
      platformFeePercent > 0 &&
      platformAdminId &&
      targetAdminId === platformAdminId
    ) {
      const platformPart = Math.round((amount * platformFeePercent) / 100);
      creditShare = walletCredit + platformPart;
      platformFeeForRow = platformPart;
    } else {
      creditShare = walletCredit;
    }

    let agg = productMap.get(productId);
    if (!agg) {
      agg = {
        product_id: productId,
        product_name: productName,
        owner_admin_id: ownerId,
        order_count: 0,
        total_gross_amount: 0,
        total_credit_share: 0,
        total_platform_fee: 0,
      };
      productMap.set(productId, agg);
    }

    agg.order_count += 1;
    agg.total_gross_amount += amount;
    agg.total_credit_share += creditShare;
    agg.total_platform_fee += platformFeeForRow;
  }

  const result = Array.from(productMap.values()).sort(
    (a, b) =>
      b.total_gross_amount - a.total_gross_amount || b.order_count - a.order_count,
  );

  return {
    admin_id: targetAdminId,
    by_product: result,
  };
});

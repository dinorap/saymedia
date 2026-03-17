import pool from "../../../utils/db";
import { ensureAdminWalletSchema } from "../../../utils/adminWallet";
import { ensureCommerceSchema } from "../../../utils/commerce";

type KeyStats = {
  duration: string;
  total_keys: number;
  total_credit_share: number;
  total_gross_amount: number;
  unit_price: number;
  total_platform_fee: number;
};

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  await ensureCommerceSchema();

  await ensureAdminWalletSchema();

  const query = getQuery(event);
  const adminIdRaw = query.admin_id ? parseInt(String(query.admin_id), 10) : null;
  const productIdRaw = query.product_id ? parseInt(String(query.product_id), 10) : null;
  const fromDate = query.from ? String(query.from).trim() : null;
  const toDate = query.to ? String(query.to).trim() : null;

  if (!productIdRaw || !Number.isFinite(productIdRaw) || productIdRaw <= 0) {
    throw createError({ statusCode: 400, statusMessage: "product_id không hợp lệ" });
  }

  const isSuperAdmin = currentUser.role === "admin_0";
  const targetAdminId =
    isSuperAdmin && adminIdRaw && Number.isFinite(adminIdRaw) ? adminIdRaw : currentUser.id;
  if (!isSuperAdmin && targetAdminId !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền xem doanh thu shop khác",
    });
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
      COALESCE(o.amount_credit, ROUND(o.amount)) AS amount,
      o.amount_credit,
      o.paid_part,
      o.bonus_part,
      o.note,
      COALESCE(o.product_owner_admin_id, o.admin_id) AS owner_admin_id,
      COALESCE(o.seller_admin_id, o.admin_id) AS report_admin_id,
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
    WHERE o.product_id = ?
      AND o.status = 'completed'${dateConditions.join("")}
      AND COALESCE(o.seller_admin_id, o.admin_id) = ?
    ORDER BY o.created_at DESC
    `,
    [targetAdminId, productIdRaw, ...dateParams, targetAdminId],
  );

  const statsMap = new Map<string, KeyStats>();

  for (const row of rows || []) {
    const note: string = row.note ? String(row.note) : "";
    if (!note) continue;

    const lines = note.split(/\r?\n/);
    let duration: string | null = null;
    let quantity: number | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!duration && trimmed.toLowerCase().startsWith("loại key:")) {
        duration = trimmed.replace(/^loại key:/i, "").trim();
      } else if (!quantity && trimmed.toLowerCase().startsWith("số lượng:")) {
        const rawQty = trimmed.replace(/^số lượng:/i, "").trim();
        const q = parseInt(rawQty, 10);
        if (Number.isFinite(q) && q > 0) {
          quantity = q;
        }
      }
    }

    if (!duration) continue;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0) {
      quantity = 1;
    }

    const amount = Number(row.amount || 0);
    const walletCredit = Number(row.wallet_credit || 0);
    const ownerId = Number(row.owner_admin_id);
    const reportAdminId = Number(row.report_admin_id);
    const ownerRole = String(row.owner_role || "");
    const platformFeePercent = Number(row.platform_fee_percent || 0);

    const isSelfSale = reportAdminId === ownerId;

    let share = 0;
    let platformFeeForRow = 0;
    if (
      ownerRole === "admin_1" &&
      isSelfSale &&
      platformFeePercent > 0 &&
      ownerId === targetAdminId
    ) {
      share = Math.round((amount * (100 - platformFeePercent)) / 100);
      platformFeeForRow = Math.round((amount * platformFeePercent) / 100);
    } else if (
      ownerRole === "admin_1" &&
      isSelfSale &&
      platformFeePercent > 0 &&
      platformAdminId &&
      targetAdminId === platformAdminId
    ) {
      const platformPart = Math.round((amount * platformFeePercent) / 100);
      share = walletCredit + platformPart;
      platformFeeForRow = platformPart;
    } else {
      share = walletCredit;
    }

    const key = duration;
    let item = statsMap.get(key);
    if (!item) {
      item = {
        duration: key,
        total_keys: 0,
        total_credit_share: 0,
        total_gross_amount: 0,
        unit_price: 0,
        total_platform_fee: 0,
      };
      statsMap.set(key, item);
    }

    item.total_keys += quantity;
    item.total_credit_share += share;
    item.total_gross_amount += amount;
    item.total_platform_fee += platformFeeForRow;
  }

  const items: KeyStats[] = Array.from(statsMap.values()).map((it) => {
    const totalKeys = it.total_keys > 0 ? it.total_keys : 1;
    return {
      ...it,
      unit_price: Math.round(it.total_gross_amount / totalKeys),
    };
  });

  items.sort(
    (a, b) =>
      b.total_credit_share - a.total_credit_share ||
      b.total_gross_amount - a.total_gross_amount,
  );

  return {
    admin_id: targetAdminId,
    product_id: productIdRaw,
    from: fromDate,
    to: toDate,
    items,
  };
});


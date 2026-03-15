import pool from "../../../utils/db";
import { ensureAdminWalletSchema } from "../../../utils/adminWallet";

type KeyStats = {
  duration: string;
  total_keys: number;
  total_paid_part: number;
  total_amount: number;
  unit_price: number;
};

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

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
      o.amount,
      o.paid_part,
      o.bonus_part,
      o.note
    FROM orders o
    WHERE COALESCE(o.seller_admin_id, o.admin_id) = ?
      AND o.product_id = ?
      AND o.status = 'completed'${dateConditions.join("")}
    ORDER BY o.created_at DESC
    `,
    [targetAdminId, productIdRaw, ...dateParams],
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
    const paidPart = Number(row.paid_part || 0);

    const key = duration;
    let item = statsMap.get(key);
    if (!item) {
      item = {
        duration: key,
        total_keys: 0,
        total_paid_part: 0,
        total_amount: 0,
        unit_price: 0,
      };
      statsMap.set(key, item);
    }

    item.total_keys += quantity;
    item.total_paid_part += paidPart;
    item.total_amount += amount;
  }

  const items: KeyStats[] = Array.from(statsMap.values()).map((it) => {
    const totalKeys = it.total_keys > 0 ? it.total_keys : 1;
    return {
      ...it,
      unit_price: Math.round(it.total_amount / totalKeys),
    };
  });

  items.sort((a, b) => b.total_paid_part - a.total_paid_part || b.total_amount - a.total_amount);

  return {
    admin_id: targetAdminId,
    product_id: productIdRaw,
    from: fromDate,
    to: toDate,
    items,
  };
});


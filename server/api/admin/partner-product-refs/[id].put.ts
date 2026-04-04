import pool from "../../../utils/db";
import { ensurePartnerSchema } from "../../../utils/partner";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser || currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới sửa % hoa hồng đối tác",
    });
  }

  await ensurePartnerSchema();

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const body = await readBody(event).catch(() => ({}));
  const raw = (body as any)?.commission_percent;
  const commissionPercent =
    raw != null ? parseInt(String(raw), 10) : null;

  if (
    commissionPercent === null ||
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "commission_percent phải từ 0 đến 100",
    });
  }

  const [[row]]: any = await pool.query(
    "SELECT id, user_id, product_id FROM partner_product_refs WHERE id = ? LIMIT 1",
    [id],
  );
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Không tìm thấy bản ghi ref đối tác",
    });
  }

  await pool.query(
    "UPDATE partner_product_refs SET commission_percent = ? WHERE id = ?",
    [commissionPercent, id],
  );

  return {
    success: true,
    id,
    user_id: Number(row.user_id),
    product_id: Number(row.product_id),
    commission_percent: commissionPercent,
  };
});

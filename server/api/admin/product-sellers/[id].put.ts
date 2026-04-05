import pool from "../../../utils/db";
import { assertShopManagementRole } from "../../../utils/authHelpers";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền sửa % hoa hồng đối tác",
    });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const body = await readBody(event).catch(() => ({}));
  const commissionPercentRaw = body?.commission_percent;
  const commissionPercent =
    commissionPercentRaw != null
      ? parseInt(String(commissionPercentRaw), 10)
      : null;

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
    `
      SELECT ps.id, ps.product_id, ps.seller_admin_id, p.admin_id AS product_owner_id
      FROM product_sellers ps
      JOIN products p ON p.id = ps.product_id
      WHERE ps.id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Không tìm thấy bản ghi đối tác",
    });
  }

  if (
    currentUser.role === "admin_1" &&
    Number(row.product_owner_id) !== Number(currentUser.id)
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ sửa hoa hồng trên sản phẩm của bạn",
    });
  }

  await pool.query(
    "UPDATE product_sellers SET commission_percent = ? WHERE id = ?",
    [commissionPercent, id],
  );

  return {
    success: true,
    id,
    commission_percent: commissionPercent,
  };
});

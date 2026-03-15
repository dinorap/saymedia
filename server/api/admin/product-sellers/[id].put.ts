import pool from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ chủ (admin_0) mới được sửa % hoa hồng đối tác",
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
    "SELECT id, product_id, seller_admin_id FROM product_sellers WHERE id = ? LIMIT 1",
    [id],
  );
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Không tìm thấy bản ghi đối tác",
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


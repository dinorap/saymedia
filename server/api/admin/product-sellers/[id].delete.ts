import pool from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ chủ (admin_0) mới được xóa đối tác sản phẩm",
    });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const [rows]: any = await pool.query(
    "SELECT id FROM product_sellers WHERE id = ? LIMIT 1",
    [id],
  );
  if (!rows || rows.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Không tìm thấy bản ghi đối tác",
    });
  }

  await pool.query("DELETE FROM product_sellers WHERE id = ? LIMIT 1", [id]);

  return {
    success: true,
    id,
  };
});


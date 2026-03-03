import pool from "../../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const [[product]]: any = await pool.query(
    "SELECT admin_id FROM products WHERE id = ? LIMIT 1",
    [id],
  );
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }
  if (currentUser.role === "admin_1" && product.admin_id !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Bạn chỉ được xóa sản phẩm do mình tạo",
    });
  }

  const [result]: any = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  if (!result?.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  return { success: true };
});


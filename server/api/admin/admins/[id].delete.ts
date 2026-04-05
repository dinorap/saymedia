import pool from "../../../utils/db";
import { ensureAdminHierarchySchema } from "../../../utils/adminHierarchy";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền xóa admin",
    });
  }

  await ensureAdminHierarchySchema();

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Thiếu id" });

  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId) || numId <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }
  if (numId === Number(currentUser.id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không thể xóa chính tài khoản đang đăng nhập.",
    });
  }
  if (numId === 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không thể xóa Super Admin gốc",
    });
  }

  const [[target]]: any = await pool.query(
    "SELECT id, parent_admin_id, role FROM admins WHERE id = ? LIMIT 1",
    [numId],
  );
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy" });
  }

  if (currentUser.role === "admin_1") {
    if (Number(target.parent_admin_id) !== Number(currentUser.id)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Chỉ được xóa tài khoản cấp dưới của bạn.",
      });
    }
  }

  const [users]: any = await pool.query(
    "SELECT id FROM users WHERE admin_id = ?",
    [numId],
  );
  if (users.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Admin này đang có người dùng. Chuyển người dùng sang admin khác trước khi xóa.",
    });
  }

  const [[ps]]: any = await pool.query(
    "SELECT id FROM product_sellers WHERE seller_admin_id = ? LIMIT 1",
    [numId],
  );
  if (ps) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Còn sản phẩm gán bán hộ cho tài khoản này. Gỡ trong đối tác sản phẩm trước.",
    });
  }

  await pool.query("DELETE FROM admins WHERE id = ?", [numId]);
  return { success: true, message: "Đã xóa admin" };
});

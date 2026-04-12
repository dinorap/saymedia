import pool from "../../../../utils/db";
import { ensureProductKeySchema } from "../../../../utils/productKeys";
import { assertShopManagementRole } from "../../../../utils/authHelpers";
import { resolveShopAdminId } from "../../../../utils/adminHierarchy";

/**
 * Danh sách loại key (valid_duration) đang có trong kho cho sản phẩm — dùng admin bảng giá.
 */
export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);

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
  if (currentUser.role === "admin_1" && Number(product.admin_id) !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Bạn chỉ được xem sản phẩm do mình tạo",
    });
  }
  if (currentUser.role === "admin_2") {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role);
    if (Number(product.admin_id) !== shopId) {
      throw createError({
        statusCode: 403,
        statusMessage: "Bạn chỉ được xem sản phẩm trong hệ thống đại lý",
      });
    }
  }

  await ensureProductKeySchema();
  const [rows]: any = await pool.query(
    `
      SELECT DISTINCT valid_duration AS d
      FROM product_keys
      WHERE product_id = ?
      ORDER BY d ASC
    `,
    [id],
  );

  const durations = (rows || [])
    .map((r: { d?: string }) => String(r?.d || "").trim())
    .filter(Boolean);

  return {
    success: true,
    data: { durations },
  };
});

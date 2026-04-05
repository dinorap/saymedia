import pool from "../../utils/db";
import { ensureAdminHierarchySchema } from "../../utils/adminHierarchy";
import { assertShopManagementRole } from "../../utils/authHelpers";

function generateRefCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "PS-";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin chủ hoặc đại lý mới thêm đối tác bán sản phẩm",
    });
  }

  await ensureAdminHierarchySchema();

  const body = await readBody(event);
  const productId = Number(body?.product_id);
  const sellerAdminId = Number(body?.seller_admin_id);
  const commissionPercent =
    body?.commission_percent != null
      ? Math.min(100, Math.max(0, parseInt(String(body.commission_percent), 10) || 20))
      : 20;

  if (!Number.isFinite(productId) || productId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "product_id không hợp lệ",
    });
  }
  if (!Number.isFinite(sellerAdminId) || sellerAdminId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "seller_admin_id không hợp lệ",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[product]]: any = await conn.query(
      `SELECT id, admin_id, name FROM products WHERE id = ? LIMIT 1`,
      [productId],
    );
    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: "Không tìm thấy sản phẩm",
      });
    }

    if (currentUser.role === "admin_1") {
      if (Number(product.admin_id) !== Number(currentUser.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: "Chỉ gán bán hộ cho sản phẩm của chính bạn",
        });
      }
    }

    const [[seller]]: any = await conn.query(
      `
        SELECT id, username, role, is_active, parent_admin_id
        FROM admins
        WHERE id = ?
        LIMIT 1
      `,
      [sellerAdminId],
    );
    if (!seller) {
      throw createError({
        statusCode: 404,
        statusMessage: "Không tìm thấy admin/shop",
      });
    }
    if (!seller.is_active) {
      throw createError({
        statusCode: 400,
        statusMessage: "Tài khoản này đang bị khóa, không thể thêm làm đối tác",
      });
    }

    if (currentUser.role === "admin_1") {
      if (String(seller.role) !== "admin_2") {
        throw createError({
          statusCode: 400,
          statusMessage: "Chỉ được gán cấp dưới (admin_2) làm đối tác bán hộ",
        });
      }
      if (Number(seller.parent_admin_id) !== Number(currentUser.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: "Người bán phải là tài khoản cấp dưới do bạn tạo",
        });
      }
    }

    const [[existing]]: any = await conn.query(
      `
        SELECT id, ref_code, is_active
        FROM product_sellers
        WHERE product_id = ? AND seller_admin_id = ?
        LIMIT 1
      `,
      [productId, sellerAdminId],
    );
    if (existing) {
      await conn.query(
        "UPDATE product_sellers SET commission_percent = ? WHERE id = ?",
        [commissionPercent, existing.id],
      );
      await conn.commit();
      return {
        success: true,
        id: existing.id,
        ref_code: existing.ref_code,
        commission_percent: commissionPercent,
        is_active: !!existing.is_active,
        existed: true,
      };
    }

    let refCode = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = generateRefCode();
      const [[dup]]: any = await conn.query(
        "SELECT id FROM product_sellers WHERE ref_code = ? LIMIT 1",
        [candidate],
      );
      if (!dup) {
        refCode = candidate;
        break;
      }
    }

    const [result]: any = await conn.query(
      `
        INSERT INTO product_sellers (product_id, seller_admin_id, ref_code, commission_percent, is_active)
        VALUES (?, ?, ?, ?, 1)
      `,
      [productId, sellerAdminId, refCode, commissionPercent],
    );

    await conn.commit();

    return {
      success: true,
      id: result.insertId,
      ref_code: refCode,
      existed: false,
    };
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
});

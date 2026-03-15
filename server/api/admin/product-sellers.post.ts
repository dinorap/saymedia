import pool from "../../utils/db";

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
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin chủ mới được thêm đối tác bán sản phẩm",
    });
  }

  const body = await readBody(event);
  const productId = Number(body?.product_id);
  const sellerAdminId = Number(body?.seller_admin_id);

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
      `
        SELECT id, admin_id, name
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productId],
    );
    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: "Không tìm thấy sản phẩm",
      });
    }

    const [[seller]]: any = await conn.query(
      `
        SELECT id, username, role, is_active
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
        statusMessage: "Shop này đang bị khóa, không thể thêm làm đối tác",
      });
    }

    // Nếu đã tồn tại quan hệ, trả về luôn (id + ref_code cũ)
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
      await conn.commit();
      return {
        success: true,
        id: existing.id,
        ref_code: existing.ref_code,
        is_active: !!existing.is_active,
        existed: true,
      };
    }

    // Sinh ref_code unique
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
        INSERT INTO product_sellers (product_id, seller_admin_id, ref_code, is_active)
        VALUES (?, ?, ?, 1)
      `,
      [productId, sellerAdminId, refCode],
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


import pool from "../../utils/db";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const query = getQuery(event);
  const productIdRaw = query.product_id ? Number(query.product_id) : null;

  // admin_0: xem danh sách shop bán theo từng sản phẩm (lọc theo product_id nếu có)
  if (currentUser.role === "admin_0") {
    if (!productIdRaw || !Number.isFinite(productIdRaw) || productIdRaw <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "product_id không hợp lệ",
      });
    }

    // Đảm bảo sản phẩm thuộc về chủ (admin_0) hoặc cho phép xem mọi sản phẩm nếu cần
    const [[product]]: any = await pool.query(
      `
        SELECT id, name, admin_id
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productIdRaw],
    );
    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: "Không tìm thấy sản phẩm",
      });
    }

    const [rows]: any = await pool.query(
      `
        SELECT
          ps.id,
          ps.product_id,
          ps.seller_admin_id,
          ps.ref_code,
          COALESCE(ps.commission_percent, 20) AS commission_percent,
          ps.is_active,
          ps.created_at,
          a.username AS seller_username,
          a.role AS seller_role
        FROM product_sellers ps
        JOIN admins a ON ps.seller_admin_id = a.id
        WHERE ps.product_id = ?
        ORDER BY ps.created_at DESC, ps.id DESC
      `,
      [productIdRaw],
    );

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        admin_id: product.admin_id,
      },
      sellers: rows,
    };
  }

  // admin_1: xem danh sách sản phẩm mình đang bán (cho chủ hoặc admin khác)
  if (currentUser.role === "admin_1") {
    const [rows]: any = await pool.query(
      `
        SELECT
          ps.id,
          ps.product_id,
          ps.ref_code,
          COALESCE(ps.commission_percent, 20) AS commission_percent,
          ps.is_active,
          ps.created_at,
          p.name AS product_name,
          p.thumbnail_url,
          owner.username AS owner_username,
          owner.id AS owner_admin_id
        FROM product_sellers ps
        JOIN products p ON ps.product_id = p.id
        JOIN admins owner ON p.admin_id = owner.id
        WHERE ps.seller_admin_id = ?
        ORDER BY ps.created_at DESC, ps.id DESC
      `,
      [currentUser.id],
    );

    return {
      success: true,
      data: rows,
    };
  }

  // Các role khác tạm thời không hỗ trợ
  throw createError({
    statusCode: 403,
    statusMessage: "Không có quyền xem danh sách đối tác sản phẩm",
  });
});


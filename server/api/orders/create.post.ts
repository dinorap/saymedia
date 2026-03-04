import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { checkOrderCreateRateLimit } from "../../utils/orderRateLimit";

const JWT_SECRET =
  process.env.JWT_SECRET || "chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "auth_token");
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  let decoded: { id: number; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Phiên đăng nhập hết hạn",
    });
  }

  if (decoded.role !== "user") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ người dùng mới được mua sản phẩm",
    });
  }

  checkOrderCreateRateLimit(decoded.id);

  const body = await readBody(event);
  const productId = Number(body?.product_id || 0);
  if (!Number.isFinite(productId) || productId <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Sản phẩm không hợp lệ" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[product]]: any = await conn.query(
      `
        SELECT id, name, price, type, is_active, download_url
        FROM products
        WHERE id = ? AND is_active = 1
        LIMIT 1
      `,
      [productId],
    );
    if (!product) {
      throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
    }

    const [[user]]: any = await conn.query(
      `
        SELECT id, credit, admin_id
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [decoded.id],
    );
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "Không tìm thấy người dùng" });
    }

    const price = Number(product.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Giá sản phẩm không hợp lệ",
      });
    }

    if (user.credit < price) {
      throw createError({
        statusCode: 400,
        statusMessage: "Số dư không đủ, vui lòng nạp thêm",
      });
    }

    await conn.query(
      "UPDATE users SET credit = credit - ? WHERE id = ?",
      [price, user.id],
    );

    const initialStatus = "completed";
    const note = null;

    const [result]: any = await conn.query(
      `
        INSERT INTO orders (user_id, product_id, admin_id, amount, status, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user.id, product.id, user.admin_id, price, initialStatus, note],
    );

    const [[updatedUser]]: any = await conn.query(
      "SELECT credit FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );

    await conn.commit();

    return {
      success: true,
      orderId: result.insertId,
      newCredit: Number(updatedUser?.credit ?? user.credit - price),
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


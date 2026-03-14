import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { checkOrderCreateRateLimit } from "../../utils/orderRateLimit";
import {
  applyCreditChange,
  ensureCreditLedgerSchema,
} from "../../utils/creditLedger";
import { addSocialProofItem } from "../../utils/socialProof";
import { orderCreateSchema, parseBodyOrThrow } from "../../utils/schemas";
import { VALID_KEY_DURATIONS } from "../../utils/productKeys";

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
  await ensureCreditLedgerSchema();

  const body = parseBodyOrThrow(await readBody(event), orderCreateSchema);
  const productId = body.product_id;
  const rawDuration =
    typeof body.duration === "string" ? body.duration.trim() : "";
  const duration = VALID_KEY_DURATIONS.includes(rawDuration as any)
    ? rawDuration
    : null;

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
        SELECT id, username, credit, admin_id
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

    const initialStatus = "pending";
    const note = duration ? `duration=${duration}` : null;

    const [result]: any = await conn.query(
      `
        INSERT INTO orders (user_id, product_id, admin_id, amount, status, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user.id, product.id, user.admin_id, price, initialStatus, note],
    );
    const creditResult = await applyCreditChange(conn, {
      userId: user.id,
      delta: -Math.round(price),
      transactionType: "purchase",
      referenceType: "order",
      referenceId: result.insertId,
      note: `Mua sản phẩm #${product.id}: ${product.name}`,
      actorType: "user",
      actorId: user.id,
    });

    await conn.commit();

    // Thêm vào feed "Đơn hàng gần đây" với tên sản phẩm thật từ bảng products
    try {
      const rawName = String(user.username || "").trim();
      let displayName = "Khách hàng";
      if (rawName) {
        if (rawName.length <= 3) {
          displayName = `${rawName[0]}***`;
        } else {
          displayName = `${rawName[0]}***${rawName[rawName.length - 1]}`;
        }
      }
      await addSocialProofItem(displayName, product.name, false);
    } catch {
      // Không làm hỏng luồng mua hàng nếu social-proof lỗi
    }

    return {
      success: true,
      orderId: result.insertId,
      newCredit: creditResult.afterBalance,
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


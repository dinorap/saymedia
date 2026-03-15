import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { checkOrderCreateRateLimit } from "../../utils/orderRateLimit";
import {
  applyCreditChange,
  ensureCreditLedgerSchema,
} from "../../utils/creditLedger";
import { addSocialProofItem } from "../../utils/socialProof";
import { orderCreateSchema, parseBodyOrThrow } from "../../utils/schemas";
import { VALID_KEY_DURATIONS, ensureProductKeySchema } from "../../utils/productKeys";

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
  await ensureProductKeySchema();

  const body = parseBodyOrThrow(await readBody(event), orderCreateSchema);
  const productId = body.product_id;
  const quantityRaw = (body as any).quantity ?? 1;
  let quantity = Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;
  quantity = Math.min(100, Math.max(1, Math.round(quantity)));
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

    // Xác định đơn giá và auto phát key nếu là sản phẩm dạng key
    let unitPrice = Number(product.price || 0);
    let deliveredKeys: string[] = [];

    if (duration) {
      // Lấy đủ số lượng key đúng loại, khóa hàng để tránh race condition
      const [keyRows]: any = await conn.query(
        `
          SELECT id, \`key\`, price
          FROM product_keys
          WHERE product_id = ? AND valid_duration = ?
          ORDER BY created_at ASC
          LIMIT ?
          FOR UPDATE
        `,
        [productId, duration, quantity],
      );

      if (!keyRows || keyRows.length < quantity) {
        const remaining = keyRows ? keyRows.length : 0;
        throw createError({
          statusCode: 400,
          statusMessage:
            remaining > 0
              ? `Không đủ key cho loại ${duration}, chỉ còn ${remaining} key`
              : `Hiện tại đã hết key cho loại ${duration}`,
        });
      }

      const firstPrice = Number(keyRows[0].price);
      if (!Number.isFinite(firstPrice) || firstPrice <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Giá key không hợp lệ",
        });
      }
      unitPrice = firstPrice;
      deliveredKeys = keyRows.map((r: any) => String(r.key));

      // Xóa các key đã phát khỏi DB
      const keyIds = keyRows.map((r: any) => r.id);
      if (keyIds.length) {
        await conn.query(
          `
            DELETE FROM product_keys
            WHERE id IN (${keyIds.map(() => "?").join(",")})
          `,
          keyIds,
        );
      }
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Giá sản phẩm không hợp lệ",
      });
    }

    const amount = unitPrice * quantity;

    const initialStatus = "completed"; // tự duyệt luôn
    const noteParts: string[] = [];
    if (duration) noteParts.push(`duration=${duration}`);
    if (quantity && quantity !== 1) noteParts.push(`qty=${quantity}`);
    if (deliveredKeys.length) {
      noteParts.push(`keys=${deliveredKeys.join(",")}`);
    }
    const note = noteParts.length ? noteParts.join(";") : null;

    const [result]: any = await conn.query(
      `
        INSERT INTO orders (user_id, product_id, admin_id, amount, status, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user.id, product.id, user.admin_id, amount, initialStatus, note],
    );
    const creditResult = await applyCreditChange(conn, {
      userId: user.id,
      delta: -Math.round(amount),
      transactionType: "purchase",
      referenceType: "order",
      referenceId: result.insertId,
      note: `Mua ${quantity}x sản phẩm #${product.id}: ${product.name}`,
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


import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { checkOrderCreateRateLimit } from "../../utils/orderRateLimit";
import {
  applyPurchaseCreditDeduction,
  ensureCreditLedgerSchema,
} from "../../utils/creditLedger";
import { ensureAdminWalletSchema, recordOrderEarnings } from "../../utils/adminWallet";
import { ensureCommerceSchema } from "../../utils/commerce";
import { addSocialProofItem } from "../../utils/socialProof";
import { orderCreateSchema, parseBodyOrThrow } from "../../utils/schemas";
import { VALID_KEY_DURATIONS, ensureProductKeySchema } from "../../utils/productKeys";
import { getJwtSecret } from "../../utils/jwt";

const JWT_SECRET = getJwtSecret();

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
  await ensureCommerceSchema();

  const body = parseBodyOrThrow(await readBody(event), orderCreateSchema);
  const productId = body.product_id;
  const sellerRef = (body as any).seller_ref ? String((body as any).seller_ref).trim() : null;
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
        SELECT id, name, type, is_active, download_url, admin_id
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
        SELECT id, username, credit, paid_credit, bonus_credit, admin_id
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [decoded.id],
    );
    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "Không tìm thấy người dùng" });
    }

    const productOwnerAdminId = product.admin_id ? Number(product.admin_id) : null;
    if (!productOwnerAdminId || !Number.isFinite(productOwnerAdminId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sản phẩm chưa gắn chủ sở hữu (admin_id)",
      });
    }

    // Seller chỉ được set khi có ref hợp lệ (bán hộ). Không có ref => coi là tự bán của owner.
    let sellerAdminId: number | null = null;
    let sellerRefUsed: string | null = null;
    if (sellerRef) {
      const [[ps]]: any = await conn.query(
        `
          SELECT seller_admin_id
          FROM product_sellers
          WHERE product_id = ? AND ref_code = ? AND is_active = 1
          LIMIT 1
        `,
        [productId, sellerRef],
      );
      if (ps?.seller_admin_id) {
        const sid = Number(ps.seller_admin_id);
        if (Number.isFinite(sid) && sid > 0 && sid !== productOwnerAdminId) {
          sellerAdminId = sid;
          sellerRefUsed = sellerRef;
        }
      }
    }

    // Hướng A: giá luôn lấy từ product_keys theo duration (không dùng products.price).
    if (!duration) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vui lòng chọn loại key (duration) để mua sản phẩm này",
      });
    }

    // Xác định đơn giá và auto phát key
    let unitPrice = 0;
    let deliveredKeys: string[] = [];

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

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Giá sản phẩm không hợp lệ",
      });
    }

    // Quy ước: giá/amount của order là "credit" nguyên.
    // Với sản phẩm key: unitPrice lấy từ product_keys.price (BIGINT) → luôn là số nguyên.
    // Với sản phẩm thường (nếu có): bắt buộc giá cũng phải là số nguyên.
    const unitPriceInt = Math.trunc(unitPrice);
    if (!Number.isFinite(unitPriceInt) || unitPriceInt <= 0 || unitPriceInt !== unitPrice) {
      throw createError({
        statusCode: 400,
        statusMessage: "Giá sản phẩm phải là số nguyên (credit)",
      });
    }
    const amountCredit = unitPriceInt * quantity;
    if (!Number.isFinite(amountCredit) || amountCredit <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Thành tiền không hợp lệ",
      });
    }

    const initialStatus = "completed"; // tự duyệt luôn
    let note: string | null = null;
    if (duration != null && duration !== "") {
      const lines: string[] = [
        `Loại key: ${duration}`,
        `Số lượng: ${quantity ?? 1}`,
        "Key:",
        ...deliveredKeys,
      ];
      note = lines.join("\n");
    }

    // Quy ước mới:
    // - orders.admin_id: admin "được ghi nhận doanh số/đối tác" (nếu có ref => seller; không có ref => owner)
    // - orders.product_owner_admin_id: chủ sở hữu sản phẩm (luôn là product.admin_id)
    const reportAdminId = sellerAdminId ?? productOwnerAdminId;

    const [result]: any = await conn.query(
      `
        INSERT INTO orders (user_id, product_id, admin_id, seller_admin_id, product_owner_admin_id, amount, amount_credit, paid_part, bonus_part, seller_ref, status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
      `,
      [
        user.id,
        product.id,
        reportAdminId,
        sellerAdminId,
        productOwnerAdminId,
        amountCredit,
        amountCredit,
        sellerRefUsed,
        initialStatus,
        note,
      ],
    );
    const orderId = result.insertId;

    const creditResult = await applyPurchaseCreditDeduction(conn, {
      userId: user.id,
      totalAmount: amountCredit,
      referenceType: "order",
      referenceId: orderId,
      note: `Mua ${quantity}x sản phẩm #${product.id}: ${product.name}`,
      actorType: "user",
      actorId: user.id,
    });

    await conn.query(
      "UPDATE orders SET paid_part = ?, bonus_part = ? WHERE id = ?",
      [creditResult.paidPart, creditResult.bonusPart, orderId],
    );

    const paidPartCredit = Number(creditResult.paidPart || 0);

    // Chỉ chia doanh thu/hoa hồng trên phần paid_part (tiền thật). Bonus không chia.
    if (paidPartCredit > 0 && productOwnerAdminId) {
      await ensureAdminWalletSchema();
      let commissionPercent: number | null = 20;
      if (sellerAdminId && sellerAdminId !== productOwnerAdminId) {
        const [[ps]]: any = await conn.query(
          "SELECT commission_percent FROM product_sellers WHERE product_id = ? AND seller_admin_id = ? LIMIT 1",
          [productId, sellerAdminId],
        );
        commissionPercent = ps?.commission_percent != null ? Number(ps.commission_percent) : 20;
      }
      await recordOrderEarnings(conn, {
        orderId,
        sellerAdminId: sellerAdminId ?? productOwnerAdminId,
        productOwnerAdminId,
        paidPartCredit,
        commissionPercent,
        productName: product.name,
      });
    }

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
      orderId,
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


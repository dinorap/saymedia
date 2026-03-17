import pool from "../../../utils/db";
import { ensureProductReviewsSchema } from "../../../utils/productReviews";
import { requireUser } from "../../../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../../../utils/rateLimit";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Sản phẩm không hợp lệ" });
  }

  const decoded = requireUser(event);
  checkRateLimit({
    key: rateLimitKey(["review", decoded.id, id]),
    max: 6,
    windowMs: 60_000,
    statusMessage: "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
    auditAction: "rate_limited_review",
    auditMetadata: { product_id: id, user_id: decoded.id },
  });

  await ensureProductReviewsSchema();

  const [[product]]: any = await pool.query(
    "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
    [id],
  );
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  // Chỉ cho phép đánh giá nếu user đã có đơn hàng hoàn thành với sản phẩm này
  const [[orderRow]]: any = await pool.query(
    `
      SELECT id
      FROM orders
      WHERE user_id = ? AND product_id = ? AND status = 'completed'
      LIMIT 1
    `,
    [decoded.id, id],
  );
  if (!orderRow) {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ khách đã mua sản phẩm mới được đánh giá",
    });
  }

  const body = await readBody(event);
  const ratingRaw = Number(body?.rating);
  const commentRaw = String(body?.comment ?? "").trim();

  if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: "Điểm đánh giá không hợp lệ",
    });
  }

  const rating = Math.round(ratingRaw);
  const comment = commentRaw || null;

  await pool.query(
    `
      INSERT INTO product_reviews (product_id, user_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        created_at = NOW()
    `,
    [id, decoded.id, rating, comment],
  );

  return {
    success: true,
    message: "Đã ghi nhận đánh giá của bạn",
  };
});


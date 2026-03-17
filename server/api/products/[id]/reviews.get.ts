import jwt from "jsonwebtoken";
import pool from "../../../utils/db";
import {
  ensureProductReviewsSchema,
  maskDisplayName,
} from "../../../utils/productReviews";
import { getJwtSecret } from "../../../utils/jwt";

const JWT_SECRET = getJwtSecret();

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Sản phẩm không hợp lệ" });
  }

  await ensureProductReviewsSchema();

  const [[product]]: any = await pool.query(
    "SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1",
    [id],
  );
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  let currentUserId: number | null = null;
  let currentRole = "";
  const token = getCookie(event, "auth_token");
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: number;
        role: string;
      };
      currentUserId = decoded.id;
      currentRole = decoded.role;
    } catch {
      currentUserId = null;
      currentRole = "";
    }
  }

  const [[statsRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS review_count,
        AVG(rating) AS avg_rating
      FROM product_reviews
      WHERE product_id = ?
    `,
    [id],
  );

  const [ratingRows]: any = await pool.query(
    `
      SELECT rating, COUNT(*) AS c
      FROM product_reviews
      WHERE product_id = ?
      GROUP BY rating
    `,
    [id],
  );
  const ratingCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of ratingRows || []) {
    const k = String(r.rating);
    ratingCounts[k] = Number(r.c || 0);
  }

  const [[soldRow]]: any = await pool.query(
    `
      SELECT COUNT(*) AS sold_count
      FROM orders
      WHERE product_id = ? AND status = 'completed'
    `,
    [id],
  );

  const [rows]: any = await pool.query(
    `
      SELECT
        pr.id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u.username
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = ?
      ORDER BY pr.created_at DESC
      LIMIT 20
    `,
    [id],
  );

  const items = (rows || []).map((r: any) => ({
    id: r.id,
    rating: Number(r.rating || 0),
    comment: String(r.comment || "").trim(),
    created_at: r.created_at,
    user_display: maskDisplayName(r.username),
  }));

  let canReview = false;
  let userReview: any = null;
  if (currentUserId && currentRole === "user") {
    const [[orderRow]]: any = await pool.query(
      `
        SELECT id
        FROM orders
        WHERE user_id = ? AND product_id = ? AND status = 'completed'
        LIMIT 1
      `,
      [currentUserId, id],
    );
    if (orderRow) {
      canReview = true;
      const [[myRow]]: any = await pool.query(
        `
          SELECT id, rating, comment, created_at
          FROM product_reviews
          WHERE product_id = ? AND user_id = ?
          LIMIT 1
        `,
        [id, currentUserId],
      );
      if (myRow) {
        userReview = {
          id: myRow.id,
          rating: Number(myRow.rating || 0),
          comment: String(myRow.comment || "").trim(),
          created_at: myRow.created_at,
        };
      }
    }
  }

  return {
    success: true,
    data: {
      avgRating: Number(statsRow?.avg_rating || 0),
      reviewCount: Number(statsRow?.review_count || 0),
      ratingCounts,
      soldCount: Number(soldRow?.sold_count || 0),
      items,
      canReview,
      userReview,
    },
  };
});


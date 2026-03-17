import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";

let schemaReady = false;

export async function ensureProductReviewsSchema() {
  if (schemaReady) return;

  assertRuntimeMigrationsAllowed("productReviews");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_product_user (product_id, user_id),
      KEY idx_product_created (product_id, created_at),
      KEY idx_product_rating (product_id, rating)
    )
  `);

  schemaReady = true;
}

export function maskDisplayName(raw: string) {
  const name = String(raw || "").trim();
  if (!name) return "Khách hàng";
  if (name.length <= 3) return `${name[0]}***`;
  return `${name[0]}***${name[name.length - 1]}`;
}


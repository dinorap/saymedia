import pool from "../utils/db";

export default defineEventHandler(async () => {
  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        price,
        type
      FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 200
    `,
  );

  return {
    success: true,
    data: rows,
  };
});


import pool from "./db";

/**
 * `users.admin_id` phải trỏ tới `admins` đang hoạt động.
 * Ref cookie/OTP payload có thể chứa admin đã khóa hoặc ID không còn — fallback admin active đầu tiên.
 */
export async function resolveAssigneeAdminId(raw: unknown): Promise<number> {
  let id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) id = 1;

  const [[row]]: any = await pool.query(
    "SELECT id FROM admins WHERE id = ? AND is_active = 1 LIMIT 1",
    [id],
  );
  if (row?.id) return Number(row.id);

  const [[fb]]: any = await pool.query(
    "SELECT id FROM admins WHERE is_active = 1 ORDER BY id ASC LIMIT 1",
  );
  if (fb?.id) return Number(fb.id);

  throw createError({
    statusCode: 503,
    statusMessage: "Hệ thống chưa có tài khoản quản trị hoạt động.",
  });
}

import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { ensureAdminContactSchema } from "../../utils/adminContact";
import { getJwtSecret } from "../../utils/jwt";
import { isCustomerRole } from "../../utils/authHelpers";

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

  if (!isCustomerRole(decoded.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ người dùng mới xem thông tin liên hệ quản trị",
    });
  }

  await ensureAdminContactSchema();

  const [[row]]: any = await pool.query(
    `
      SELECT
        u.admin_id,
        a.username AS admin_name,
        a.contact_info
      FROM users u
      LEFT JOIN admins a ON u.admin_id = a.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [decoded.id],
  );

  if (!row || !row.admin_id || !row.admin_name) {
    return {
      success: true,
      data: null,
    };
  }

  return {
    success: true,
    data: {
      adminId: row.admin_id,
      adminName: row.admin_name,
      contact: row.contact_info || "",
    },
  };
});


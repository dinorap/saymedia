import pool from "../../utils/db";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../../utils/jwt";
import { isAdminStaffRole } from "../../utils/authHelpers";
import { resolveShopAdminId } from "../../utils/adminHierarchy";

const JWT_SECRET = getJwtSecret();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "auth_token");
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  let current: { id: number; role: string };
  try {
    current = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Phiên đăng nhập hết hạn",
    });
  }

  if (!isAdminStaffRole(current.role)) {
    throw createError({
      statusCode: 403,
      statusMessage:
        "Chỉ tài khoản quản trị mới xem được danh sách chat hỗ trợ.",
    });
  }

  await ensureSupportChatSchema();

  const q = getQuery(event);
  const status = q.status === "closed" ? "closed" : "open";
  /** admin_0: luôn xem mọi phiên (khớp canAdminAccessSupportThread); không lọc theo st.admin_id = id super admin. */
  const scopeAll = q.scope === "all" && current.role === "admin_0";

  // Khớp canAdminAccessSupportThread: admin_1 = mình + cấp dưới; admin_2 = shop hoặc mình.
  let listFilter = "st.admin_id = ?";
  const listParams: any[] = [status];
  if (!scopeAll) {
    if (current.role === "admin_0") {
      listFilter = "1=1";
    } else if (current.role === "admin_2") {
      const shopId = await resolveShopAdminId(current.id, current.role);
      listFilter = "(st.admin_id = ? OR st.admin_id = ?)";
      listParams.unshift(shopId, current.id);
    } else if (current.role === "admin_1") {
      listFilter =
        "(st.admin_id = ? OR st.admin_id IN (SELECT id FROM admins WHERE parent_admin_id = ?))";
      listParams.unshift(current.id, current.id);
    } else {
      listParams.unshift(current.id);
    }
  } else {
    listFilter = "1=1";
  }

  const [rows]: any = await pool.query(
    `
      SELECT
        st.id,
        st.user_id,
        u.username AS user_username,
        st.admin_id,
        a.username AS admin_username,
        st.product_id,
        p.name AS product_name,
        st.topic,
        st.status,
        st.last_message_at
      FROM support_threads st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN admins a ON st.admin_id = a.id
      LEFT JOIN products p ON st.product_id = p.id
      WHERE ${scopeAll ? "1=1" : listFilter}
        AND st.status = ?
      ORDER BY st.last_message_at DESC, st.id DESC
      LIMIT 100
    `,
    scopeAll ? [status] : listParams,
  );

  return {
    success: true,
    data: rows || [],
  };
});


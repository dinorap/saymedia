import pool from "../../utils/db";
import { ensureSupportChatSchema } from "../../utils/supportChat";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456";

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

  if (current.role !== "admin_0" && current.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 / admin_1 mới xem được danh sách chat hỗ trợ.",
    });
  }

  await ensureSupportChatSchema();

  const q = getQuery(event);
  const status = q.status === "closed" ? "closed" : "open";
  const scopeAll = q.scope === "all" && current.role === "admin_0";

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
      WHERE ${scopeAll ? "1=1" : "st.admin_id = ?"}
        AND st.status = ?
      ORDER BY st.last_message_at DESC, st.id DESC
      LIMIT 100
    `,
    scopeAll ? [status] : [current.id, status],
  );

  return {
    success: true,
    data: rows || [],
  };
});


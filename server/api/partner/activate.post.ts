import jwt from "jsonwebtoken";
import pool from "../../utils/db";
import { requireAuth } from "../../utils/authHelpers";
import { getPartnerInviteKey, ensurePartnerSchema, seedPartnerRefsForUser } from "../../utils/partner";
import { getJwtSecret } from "../../utils/jwt";

export default defineEventHandler(async (event) => {
  const decoded = requireAuth(event);
  if (decoded.role !== "user") {
    throw createError({
      statusCode: 400,
      statusMessage:
        decoded.role === "admin_3"
          ? "Tài khoản đã là đối tác giới thiệu"
          : "Chỉ tài khoản khách hàng mới kích hoạt được chương trình này",
    });
  }

  const body = await readBody(event).catch(() => ({}));
  const key = String((body as any)?.key ?? "").trim();
  if (!key || key !== getPartnerInviteKey()) {
    throw createError({ statusCode: 400, statusMessage: "Mã kích hoạt không đúng" });
  }

  await ensurePartnerSchema();
  const jwtSecret = getJwtSecret();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]]: any = await conn.query(
      "SELECT id, partner_role FROM users WHERE id = ? LIMIT 1 FOR UPDATE",
      [decoded.id],
    );
    if (!row) {
      throw createError({ statusCode: 404, statusMessage: "Không tìm thấy tài khoản" });
    }
    if (row.partner_role === "admin_3") {
      throw createError({ statusCode: 400, statusMessage: "Tài khoản đã là đối tác" });
    }

    await conn.query("UPDATE users SET partner_role = ? WHERE id = ?", ["admin_3", decoded.id]);
    await seedPartnerRefsForUser(conn, decoded.id);
    await conn.commit();
  } catch (e: any) {
    try {
      await conn.rollback();
    } catch {}
    if (e?.statusCode) throw e;
    throw e;
  } finally {
    conn.release();
  }

  const token = jwt.sign(
    {
      id: decoded.id,
      username: decoded.username,
      role: "admin_3",
      admin_id: (decoded as any).admin_id,
    },
    jwtSecret,
    { expiresIn: "30d" },
  );

  setCookie(event, "auth_token", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  setCookie(event, "user_role", "admin_3", {
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true, role: "admin_3", message: "Kích hoạt đối tác giới thiệu thành công" };
});

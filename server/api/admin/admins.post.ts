import bcrypt from "bcryptjs";
import pool from "../../utils/db";
import { ensureAdminSupportRoleMigration } from "../../utils/adminRoleMigration";
import {
  ensureAdminHierarchySchema,
  getMaxSubordinates,
} from "../../utils/adminHierarchy";

function randomRefCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền tạo tài khoản admin",
    });
  }

  await ensureAdminSupportRoleMigration();
  await ensureAdminHierarchySchema();

  const body = await readBody(event);
  const { username, password, role } = body;
  const parentAdminIdRaw = (body as any)?.parent_admin_id;

  if (!username?.trim() || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Thiếu username hoặc password",
    });
  }

  let r: "admin_0" | "admin_1" | "admin_2" | "admin_support";
  let parentId: number | null = null;

  if (currentUser.role === "admin_1") {
    r = "admin_2";
    parentId = currentUser.id;
    const [[cnt]]: any = await pool.query(
      "SELECT COUNT(*) AS c FROM admins WHERE parent_admin_id = ?",
      [currentUser.id],
    );
    const maxSub = getMaxSubordinates();
    if (Number(cnt?.c || 0) >= maxSub) {
      throw createError({
        statusCode: 400,
        statusMessage: `Đã đạt giới hạn ${maxSub} tài khoản cấp dưới.`,
      });
    }
  } else {
    if (role === "admin_0") {
      r = "admin_0";
    } else if (role === "admin_support") {
      r = "admin_support";
    } else if (role === "admin_2") {
      r = "admin_2";
      const pid = parentAdminIdRaw != null ? Number(parentAdminIdRaw) : NaN;
      if (!Number.isFinite(pid) || pid <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Tạo admin_2 cần parent_admin_id (admin_1 cấp trên).",
        });
      }
      const [[p]]: any = await pool.query(
        "SELECT id, role FROM admins WHERE id = ? LIMIT 1",
        [pid],
      );
      if (!p || String(p.role) !== "admin_1") {
        throw createError({
          statusCode: 400,
          statusMessage: "parent_admin_id phải là tài khoản admin_1.",
        });
      }
      parentId = pid;
    } else {
      r = "admin_1";
    }
  }

  const [byUsername]: any = await pool.query(
    "SELECT id FROM admins WHERE username = ?",
    [username.trim()],
  );
  if (byUsername.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Tên đăng nhập admin đã tồn tại!",
    });
  }

  let refCode = randomRefCode();
  for (let i = 0; i < 20; i++) {
    const [existing]: any = await pool.query(
      "SELECT id FROM admins WHERE ref_code = ?",
      [refCode],
    );
    if (existing.length === 0) break;
    refCode = randomRefCode();
    if (i === 19) {
      throw createError({
        statusCode: 500,
        statusMessage: "Không tạo được mã ref duy nhất. Thử lại!",
      });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO admins (username, password_hash, role, ref_code, parent_admin_id) VALUES (?, ?, ?, ?, ?)",
    [username.trim(), hashedPassword, r, refCode, parentId],
  );
  return { success: true, message: "Tạo admin thành công" };
});

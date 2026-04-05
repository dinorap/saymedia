import bcrypt from "bcryptjs";
import pool from "../../../utils/db";
import { addAuditLog } from "../../../utils/audit";
import { ensureAdminHierarchySchema } from "../../../utils/adminHierarchy";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Không có quyền sửa admin",
    });
  }

  await ensureAdminHierarchySchema();

  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Thiếu id" });

  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId) || numId <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const body = await readBody(event);
  const { role, is_active, password } = body;

  if (is_active !== undefined && !is_active) {
    if (numId === 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Không thể khóa tài khoản Super Admin gốc.",
      });
    }
    if (numId === Number(currentUser.id)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Không thể tự khóa tài khoản đang đăng nhập.",
      });
    }
  }

  const [[target]]: any = await pool.query(
    "SELECT id, parent_admin_id, role FROM admins WHERE id = ? LIMIT 1",
    [numId],
  );
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy admin" });
  }

  if (currentUser.role === "admin_1") {
    if (Number(target.parent_admin_id) !== Number(currentUser.id)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Chỉ được sửa tài khoản cấp dưới của bạn.",
      });
    }
    if (role !== undefined) {
      throw createError({
        statusCode: 403,
        statusMessage: "Không được đổi vai trò cấp dưới.",
      });
    }
  }

  const updates: string[] = [];
  const params: any[] = [];
  let didChangePassword = false;

  if (role !== undefined && currentUser.role === "admin_0") {
    let r: "admin_0" | "admin_1" | "admin_2" | "admin_support";
    if (role === "admin_0") {
      r = "admin_0";
    } else if (role === "admin_support") {
      r = "admin_support";
    } else if (role === "admin_2") {
      r = "admin_2";
    } else {
      r = "admin_1";
    }
    updates.push("role = ?");
    params.push(r);
  }
  if (is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (password !== undefined) {
    const pwd = String(password).trim();
    if (pwd.length > 0) {
      if (pwd.length < 6) {
        throw createError({
          statusCode: 400,
          statusMessage: "Mật khẩu mới tối thiểu 6 ký tự!",
        });
      }
      const hashedPassword = await bcrypt.hash(pwd, 10);
      updates.push("password_hash = ?");
      params.push(hashedPassword);
      didChangePassword = true;
    }
  }

  if (updates.length === 0) {
    return { success: true, message: "Không có thay đổi" };
  }

  params.push(numId);
  await pool.query(`UPDATE admins SET ${updates.join(", ")} WHERE id = ?`, params);

  if (didChangePassword) {
    await addAuditLog({
      actorType: "admin",
      actorId: currentUser.id,
      action: "admin_change_admin_password",
      targetType: "admin",
      targetId: String(numId),
    });
  }

  return { success: true, message: "Cập nhật thành công" };
});

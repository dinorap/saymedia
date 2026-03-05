import pool from "../../../../utils/db";
import { addAuditLog } from "../../../../utils/audit";
import { applyCreditChange, ensureCreditLedgerSchema } from "../../../../utils/creditLedger";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin_0 mới được phép điều chỉnh tín chỉ",
    });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID người dùng không hợp lệ" });
  }

  const body = await readBody(event).catch(() => ({}));
  const delta = Math.trunc(Number(body?.delta || 0));
  const reason = String(body?.reason || "").trim().slice(0, 1000);

  if (!Number.isFinite(delta) || delta === 0) {
    throw createError({ statusCode: 400, statusMessage: "Số tín chỉ điều chỉnh không hợp lệ" });
  }
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: "Vui lòng nhập lý do điều chỉnh" });
  }

  await ensureCreditLedgerSchema();

  const [[user]]: any = await pool.query(
    "SELECT id, admin_id FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy người dùng" });
  }

  const conn = await pool.getConnection();
  let newCredit = 0;
  try {
    await conn.beginTransaction();
    const creditResult = await applyCreditChange(conn, {
      userId: id,
      delta,
      transactionType: "admin_adjust",
      referenceType: "user",
      referenceId: id,
      note: reason,
      actorType: "admin",
      actorId: currentUser.id,
    });
    newCredit = creditResult.afterBalance;
    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }

  await addAuditLog({
    actorType: "admin",
    actorId: currentUser.id,
    action: "credit_adjust",
    targetType: "user",
    targetId: id,
    metadata: { delta, reason },
  });

  return {
    success: true,
    new_credit: newCredit,
  };
});

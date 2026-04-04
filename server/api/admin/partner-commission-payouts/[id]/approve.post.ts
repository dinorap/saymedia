import pool from "../../../../utils/db";
import { ensurePartnerSchema } from "../../../../utils/partner";
import { ensureCreditLedgerSchema } from "../../../../utils/creditLedger";
import { approvePartnerCommissionPayout } from "../../../../utils/partnerCommissionPayout";

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser || currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới duyệt hoa hồng đối tác",
    });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  await ensurePartnerSchema();
  await ensureCreditLedgerSchema();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await approvePartnerCommissionPayout(conn, id, currentUser.id);
    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }

  return { success: true, id };
});

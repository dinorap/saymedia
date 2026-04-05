import { addSocialProofItem } from "../utils/socialProof";
import { requireAuth } from "../utils/authHelpers";

/**
 * Thêm bản ghi vào feed "Đơn hàng gần đây" (thủ công / vận hành).
 * Chỉ super admin — endpoint không dùng trên UI công khai; trước đây mở nặc danh (spam).
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  if (user.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới được thêm bản ghi feed đơn hàng gần đây.",
    });
  }

  const body = await readBody(event);
  const name = String(body?.name || "").trim();
  const product = String(body?.product || "").trim();
  const isFake = Boolean(body?.isFake);

  if (!name || !product) {
    throw createError({
      statusCode: 400,
      statusMessage: "Thiếu tên hoặc sản phẩm",
    });
  }

  await addSocialProofItem(name, product, isFake);

  return { success: true };
});

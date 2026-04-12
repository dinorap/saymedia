import pool from "../../utils/db";
import {
  ensurePricingSetsSchema,
  coercePricingSetType,
  pricingSetDataSchema as pricingSetDataSchemaValidator,
} from "../../utils/pricing";
import { z } from "zod";

const bodySchema = z.object({
  type: z.string().min(1),
  data: pricingSetDataSchemaValidator,
});

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin (admin_0) mới được sửa bảng giá",
    });
  }

  await ensurePricingSetsSchema();

  const bodyRaw = await readBody(event);
  const parsed = bodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Dữ liệu bảng giá không hợp lệ" });
  }

  const body = parsed.data;
  const pricingType = coercePricingSetType(body.type);
  if (!pricingType) {
    throw createError({ statusCode: 400, statusMessage: "Loại bảng giá không hợp lệ" });
  }

  // Chỉ lưu nội dung; các trường còn lại (id/created_at...) do DB tự quản lý.
  const payload: Record<string, unknown> = {
    displayName: body.data.displayName || "",
    packages: Array.isArray(body.data.packages) ? body.data.packages : [],
  };
  if (pricingType === "youtube_long_video") {
    payload.linkedProductId =
      body.data.linkedProductId != null &&
      Number(body.data.linkedProductId) > 0
        ? Math.trunc(Number(body.data.linkedProductId))
        : null;
  }

  const json = JSON.stringify(payload);
  const [result]: any = await pool.query(
    `
      INSERT INTO pricing_sets (pricing_type, data)
      VALUES (?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE data = VALUES(data)
    `,
    [pricingType, json],
  );

  return {
    success: true,
    data: {
      type: pricingType,
      id: result?.insertId ?? null,
    },
  };
});


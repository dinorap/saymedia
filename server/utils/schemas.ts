import { z } from "zod";

/** Login: username/password hoặc email/otp */
export const loginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  otp: z.string().optional(),
});

export type LoginBody = z.infer<typeof loginSchema>;

/** Tạo đơn hàng */
export const orderCreateSchema = z.object({
  product_id: z.coerce.number().int().positive("Sản phẩm không hợp lệ"),
});

export type OrderCreateBody = z.infer<typeof orderCreateSchema>;

/** Nạp tiền / tạo QR */
export const paymentQrSchema = z.object({
  amount: z.coerce
    .number()
    .int()
    .min(10000, "Số tiền tối thiểu là 10.000 VND"),
  promo_code: z
    .string()
    .trim()
    .max(32, "Mã khuyến mại quá dài")
    .optional()
    .nullable(),
});

export type PaymentQrBody = z.infer<typeof paymentQrSchema>;

/**
 * Parse body với schema Zod, ném createError 400 nếu invalid.
 */
export function parseBodySafe<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; message: string } {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  // ZodError type in this version không có thuộc tính 'errors' public,
  // nên fallback dùng toString/message chung.
  const msg =
    (result.error as any)?.errors?.[0]?.message ||
    result.error?.message ||
    "Dữ liệu không hợp lệ";
  return { success: false, message: msg };
}

export function parseBodyOrThrow<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): T {
  const out = parseBodySafe(body, schema);
  if (out.success) return out.data;
  throw createError({ statusCode: 400, statusMessage: out.message });
}

import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import crypto from "node:crypto";
import { assertShopManagementRole } from "../../../utils/authHelpers";

// Admin-only upload nên cho phép lớn hơn một chút để thoải mái.
// Nếu cần hơn nữa thì chỉnh giá trị này.
const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES = 10;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  assertShopManagementRole(currentUser.role);

  const form = await readMultipartFormData(event);
  if (!form || !form.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không có file upload",
    });
  }
  if (form.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      statusMessage: `Tối đa ${MAX_FILES} file mỗi lần upload`,
    });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "products");
  await fs.mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];

  for (const part of form) {
    if (!part.filename || !part.data) continue;

    if (part.data.length > MAX_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: `Ảnh quá lớn, tối đa ${Math.round(MAX_SIZE / (1024 * 1024))}MB`,
      });
    }

    const originalExt = extname(part.filename || "").toLowerCase();
    if (!ALLOWED_EXT.has(originalExt)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Phần mở rộng file phải là .jpg/.jpeg/.png/.webp/.gif",
      });
    }

    // Admin-only upload: chỉ validate theo ext để đơn giản, tránh lỗi mismatch MIME trên client.
    const safeExt = originalExt;

    const fileName =
      crypto.randomBytes(16).toString("hex") +
      Date.now().toString(36) +
      safeExt;
    const filePath = join(uploadDir, fileName);

    await fs.writeFile(filePath, part.data);

    urls.push(`/uploads/products/${fileName}`);
  }

  if (!urls.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không có file ảnh hợp lệ",
    });
  }

  return {
    success: true,
    urls,
  };
});


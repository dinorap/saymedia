import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import crypto from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0" && currentUser.role !== "admin_1") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ admin mới được upload ảnh sản phẩm",
    });
  }

  const form = await readMultipartFormData(event);
  if (!form || !form.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Không có file upload",
    });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "products");
  await fs.mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];

  for (const part of form) {
    if (!part.filename || !part.data) continue;

    const mime = (part.type || "").toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIMES.has(mime)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF (đúng MIME)",
      });
    }

    if (part.data.length > MAX_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: "Ảnh quá lớn, tối đa 5MB",
      });
    }

    const originalExt = extname(part.filename || "").toLowerCase();
    if (!ALLOWED_EXT.has(originalExt)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Phần mở rộng file phải là .jpg, .jpeg, .png, .webp, .gif",
      });
    }
    const safeExt = originalExt || ".jpg";

    const fileName =
      crypto.randomBytes(16).toString("hex") + Date.now().toString(36) + safeExt;
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


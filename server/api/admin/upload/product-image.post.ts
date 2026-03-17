import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import crypto from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function detectImageExt(buf: Buffer): ".jpg" | ".png" | ".webp" | ".gif" | null {
  if (!buf || buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return ".png";
  }

  // GIF: "GIF87a" or "GIF89a"
  const header6 = buf.subarray(0, 6).toString("ascii");
  if (header6 === "GIF87a" || header6 === "GIF89a") return ".gif";

  // WEBP: "RIFF" .... "WEBP"
  const riff = buf.subarray(0, 4).toString("ascii");
  const webp = buf.subarray(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") return ".webp";

  return null;
}

function extToMime(ext: string): string {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "";
  }
}

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
    const detectedExt = detectImageExt(part.data as Buffer);
    if (!detectedExt) {
      throw createError({
        statusCode: 400,
        statusMessage: "File ảnh không hợp lệ (không đúng định dạng thực tế)",
      });
    }
    const detectedMime = extToMime(detectedExt);
    if (!detectedMime || detectedMime !== mime) {
      throw createError({
        statusCode: 400,
        statusMessage: "Định dạng ảnh không khớp MIME (file có thể bị giả mạo)",
      });
    }
    // Use detected extension to avoid spoofing.
    const safeExt = detectedExt;

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


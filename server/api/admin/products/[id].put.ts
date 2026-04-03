import pool from "../../../utils/db";

const ALLOWED_TYPES = new Set(["tool", "account", "service", "other"]);
const MAX_NAME = 200;
const MAX_DESCRIPTION = 2000;
const MAX_DOWNLOAD_URL = 2000;
const MAX_THUMBNAIL_URL = 512;
const MAX_LONG_DESCRIPTION = 8000;
const MAX_YOUTUBE_URL = 8000;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: "ID không hợp lệ" });
  }

  const [[product]]: any = await pool.query(
    "SELECT admin_id FROM products WHERE id = ? LIMIT 1",
    [id],
  );
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }
  if (currentUser.role === "admin_1" && product.admin_id !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: "Bạn chỉ được sửa sản phẩm do mình tạo",
    });
  }

  const body = await readBody(event);
  const name = String(body?.name || "").trim().slice(0, MAX_NAME);
  const description = (String(body?.description || "").trim() || null)?.slice(0, MAX_DESCRIPTION) || null;
  const youtubeUrl =
    (String(body?.youtube_url || "").trim() || null)?.slice(0, MAX_YOUTUBE_URL) || null;
  const downloadUrl = (String(body?.download_url || "").trim() || null)?.slice(0, MAX_DOWNLOAD_URL) || null;
  const thumbnailUrl = (String(body?.thumbnail_url || "").trim() || null)?.slice(0, MAX_THUMBNAIL_URL) || null;
  const longDescription =
    (String(body?.long_description || "").trim() || null)?.slice(0, MAX_LONG_DESCRIPTION) || null;
  const platformFeePercentRaw = body?.platform_fee_percent;
  let platformFeePercent: number | null = null;
  const canEditPlatformFee = currentUser.role === "admin_0";
  if (canEditPlatformFee) {
    const n = Number(platformFeePercentRaw);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      platformFeePercent = Math.round(n);
    }
  }

  let imagesJson: string | null = null;
  if (Array.isArray(body?.images)) {
    const urls = body.images
      .map((u: any) => String(u || "").trim())
      .filter((u: string) => !!u)
      .slice(0, 10)
      .map((u: string) => u.slice(0, 512));
    imagesJson = urls.length ? JSON.stringify(urls) : null;
  }

  const type = String(body?.type || "other").trim();
  const isActive = body?.is_active ? 1 : 0;

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Tên sản phẩm là bắt buộc" });
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw createError({ statusCode: 400, statusMessage: "Loại sản phẩm không hợp lệ" });
  }

  const sets: string[] = [
    "name = ?",
    "description = ?",
    "youtube_url = ?",
    "long_description = ?",
    "download_url = ?",
    "thumbnail_url = ?",
    "images_json = ?",
    "type = ?",
    "is_active = ?",
  ];
  const params: any[] = [
    name,
    description || null,
    youtubeUrl || null,
    longDescription || null,
    downloadUrl || null,
    thumbnailUrl || null,
    imagesJson,
    type,
    isActive,
  ];
  if (canEditPlatformFee) {
    sets.splice(sets.length - 1, 0, "platform_fee_percent = ?");
    params.splice(params.length - 1, 0, platformFeePercent);
  }

  const [result]: any = await pool.query(
    `
      UPDATE products
      SET
        ${sets.join(",\n        ")}
      WHERE id = ?
    `,
    [...params, id],
  );

  if (!result?.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: "Không tìm thấy sản phẩm" });
  }

  return { success: true };
});


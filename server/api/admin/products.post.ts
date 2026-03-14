import pool from "../../utils/db";

const ALLOWED_TYPES = new Set(["tool", "account", "service", "other"]);
const MAX_NAME = 200;
const MAX_DESCRIPTION = 2000;
const MAX_DOWNLOAD_URL = 2000;
const MAX_THUMBNAIL_URL = 512;
const MAX_LONG_DESCRIPTION = 8000;
const MAX_YOUTUBE_URL = 512;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
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

  let imagesJson: string | null = null;
  if (Array.isArray(body?.images)) {
    const urls = body.images
      .map((u: any) => String(u || "").trim())
      .filter((u: string) => !!u)
      .slice(0, 10)
      .map((u: string) => u.slice(0, 512));
    if (urls.length) {
      imagesJson = JSON.stringify(urls);
    }
  }

  const type = String(body?.type || "other").trim();
  const isActive = body?.is_active === false ? 0 : 1;

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Tên sản phẩm là bắt buộc" });
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw createError({ statusCode: 400, statusMessage: "Loại sản phẩm không hợp lệ" });
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO products (
        admin_id,
        name,
        description,
        youtube_url,
        long_description,
        download_url,
        thumbnail_url,
        images_json,
        type,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      currentUser.id,
      name,
      description || null,
      youtubeUrl || null,
      longDescription || null,
      downloadUrl || null,
      thumbnailUrl || null,
      imagesJson,
      type,
      isActive,
    ],
  );

  return {
    success: true,
    id: result.insertId,
  };
});


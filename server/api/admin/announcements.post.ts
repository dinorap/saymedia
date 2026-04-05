import pool from "../../utils/db";
import { ensureAnnouncementsSchema } from "../../utils/announcements";

const MAX_TITLE = 255;
const MAX_CONTENT = 4000;
const MAX_IMAGE_URL = 500;
const MAX_IMAGES = 10;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin được đăng hoặc sửa thông báo hệ thống",
    });
  }

  await ensureAnnouncementsSchema();

  const body = await readBody(event);
  const id = body?.id ? Number(body.id) : null;
  const rawTitle = String(body?.title || "").trim();
  const rawContent = String(body?.content || "").trim();
  const rawImageUrl = String(body?.image_url || "").trim();
  const rawImages = Array.isArray(body?.images) ? body.images : null;
  const isPopupRequested =
    body?.is_popup === true ||
    body?.is_popup === 1 ||
    body?.is_popup === "1";

  const title = rawTitle.slice(0, MAX_TITLE);
  const content = rawContent.slice(0, MAX_CONTENT);
  const imageUrl = rawImageUrl ? rawImageUrl.slice(0, MAX_IMAGE_URL) : null;
  const authorName =
    String(currentUser.username || "Admin").slice(0, 120) || "Admin";

  let imagesJson: string | null = null;
  if (rawImages) {
    const urls = rawImages
      .map((u: any) => String(u || "").trim())
      .filter((u: string) => !!u)
      .slice(0, MAX_IMAGES)
      .map((u: string) => u.slice(0, MAX_IMAGE_URL));
    imagesJson = urls.length ? JSON.stringify(urls) : null;
  }

  if (!title || !content) {
    throw createError({
      statusCode: 400,
      statusMessage: "Tiêu đề và nội dung là bắt buộc",
    });
  }

  const finalIsPopup = !!isPopupRequested;

  if (id && Number.isFinite(id) && id > 0) {
    await pool.query(
      `
        UPDATE announcements
        SET title = ?, content = ?, author_name = ?, is_popup = ?, image_url = ?, images_json = ?
        WHERE id = ?
      `,
      [
        title,
        content,
        authorName,
        finalIsPopup ? 1 : 0,
        imageUrl,
        imagesJson,
        id,
      ],
    );

    return { success: true, id };
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO announcements (title, content, author_name, is_popup, image_url, images_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [title, content, authorName, finalIsPopup ? 1 : 0, imageUrl, imagesJson],
  );

  return {
    success: true,
    id: result.insertId,
  };
});


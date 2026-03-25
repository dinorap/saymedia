import pool from "../../utils/db";
import {
  ensureAboutIntroductionsSchema,
  normalizeCanvasEmbedUrl,
} from "../../utils/aboutIntroductions";

const MAX_TOPIC = 255;
const MAX_DESC = 8000;
const MAX_URL = 2048;

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user;
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Chưa đăng nhập" });
  }
  if (currentUser.role !== "admin_0") {
    throw createError({
      statusCode: 403,
      statusMessage: "Chỉ super admin mới quản lý giới thiệu",
    });
  }

  await ensureAboutIntroductionsSchema();

  const body = await readBody(event);
  const id = body?.id ? Number(body.id) : null;
  const rawTopic = String(body?.topic || "").trim();
  const rawDesc =
    body?.description != null ? String(body.description).trim() : "";
  const rawUrl = String(body?.canvas_embed_url || body?.canvasEmbedUrl || "").trim();
  let sortOrder = Number(body?.sort_order ?? body?.sortOrder ?? 1);
  if (!Number.isFinite(sortOrder)) sortOrder = 1;
  sortOrder = Math.max(1, Math.trunc(sortOrder));

  const topic = rawTopic.slice(0, MAX_TOPIC);
  const description = rawDesc ? rawDesc.slice(0, MAX_DESC) : null;
  const canvasEmbedUrl = normalizeCanvasEmbedUrl(rawUrl).slice(0, MAX_URL);

  if (!topic) {
    throw createError({
      statusCode: 400,
      statusMessage: "Chủ đề là bắt buộc",
    });
  }
  if (!canvasEmbedUrl || !/^https:\/\//i.test(canvasEmbedUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Link Canva (embed) phải là URL https hợp lệ",
    });
  }

  if (id && Number.isFinite(id) && id > 0) {
    const [upd]: any = await pool.query(
      `
        UPDATE about_introductions
        SET topic = ?, description = ?, canvas_embed_url = ?, sort_order = ?
        WHERE id = ?
      `,
      [topic, description, canvasEmbedUrl, sortOrder, id],
    );
    const affected = Number(upd?.affectedRows ?? 0);
    if (!affected) {
      throw createError({
        statusCode: 404,
        statusMessage: "Không tìm thấy mục giới thiệu",
      });
    }
    return { success: true, id };
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO about_introductions (topic, description, canvas_embed_url, sort_order)
      VALUES (?, ?, ?, ?)
    `,
    [topic, description, canvasEmbedUrl, sortOrder],
  );
  const insertId = result?.insertId;
  return { success: true, id: insertId };
});

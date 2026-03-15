import pool from "../utils/db";
import { ensureAnnouncementsSchema } from "../utils/announcements";

export default defineEventHandler(async (event) => {
  await ensureAnnouncementsSchema();

  const query = getQuery(event);
  const popupOnly = String(query?.popup || "") === "1";

  if (popupOnly) {
    const [rows]: any = await pool.query(
      `
        SELECT
          id,
          title,
          content,
          author_name AS authorName,
          is_popup AS isPopup,
          image_url AS imageUrl,
          images_json AS imagesJson,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM announcements
        WHERE is_popup = 1
        ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
        LIMIT 20
      `,
    );

    const mapped = (Array.isArray(rows) ? rows : []).map((r: any) => {
      let images: string[] = [];
      if (r?.imagesJson) {
        try {
          const parsed = JSON.parse(r.imagesJson);
          if (Array.isArray(parsed)) {
            images = parsed
              .map((u: any) => String(u || "").trim())
              .filter((u: string) => !!u);
          }
        } catch {
          images = [];
        }
      }
      const imageUrl = r?.imageUrl || (images[0] || null);
      return {
        id: r.id,
        title: r.title,
        content: r.content,
        authorName: r.authorName,
        isPopup: !!r.isPopup,
        imageUrl,
        images,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt || r.createdAt,
      };
    });

    return {
      success: true,
      data: mapped,
    };
  }

  const [rows]: any = await pool.query(
    `
      SELECT
        id,
        title,
        content,
        author_name AS authorName,
        is_popup AS isPopup,
        image_url AS imageUrl,
        images_json AS imagesJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );

  const mapped = (Array.isArray(rows) ? rows : []).map((r: any) => {
    let images: string[] = [];
    if (r?.imagesJson) {
      try {
        const parsed = JSON.parse(r.imagesJson);
        if (Array.isArray(parsed)) {
          images = parsed
            .map((u: any) => String(u || "").trim())
            .filter((u: string) => !!u);
        }
      } catch {
        images = [];
      }
    }
    const imageUrl = r?.imageUrl || (images[0] || null);
    return {
      id: r.id,
      title: r.title,
      content: r.content,
      authorName: r.authorName,
      isPopup: !!r.isPopup,
      imageUrl,
      images,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt || r.createdAt,
    };
  });

  return {
    success: true,
    data: mapped,
  };
});


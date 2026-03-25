import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";

let schemaReady = false;

export function normalizeCanvasEmbedUrl(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  let u = s;
  if (!/^https:\/\//i.test(u)) {
    if (/^http:\/\//i.test(u)) {
      u = `https://${u.slice(7)}`;
    } else {
      u = `https://${u.replace(/^\/+/, "")}`;
    }
  }
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes("canva.com")) {
      const path = parsed.pathname || "";
      if (path.includes("/view") && !parsed.searchParams.has("embed")) {
        parsed.searchParams.set("embed", "");
      }
    }
    return parsed.toString();
  } catch {
    return s;
  }
}

export async function ensureAboutIntroductionsSchema() {
  if (schemaReady) return;

  assertRuntimeMigrationsAllowed("about_introductions");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS about_introductions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      topic VARCHAR(255) NOT NULL,
      description TEXT NULL,
      canvas_embed_url VARCHAR(2048) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_about_intro_sort (sort_order, id)
    )
  `);

  schemaReady = true;
}

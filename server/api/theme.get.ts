import pool from "../utils/db";
import { ensureAdminContactSchema } from "../utils/adminContact";

export default defineEventHandler(async () => {
  await ensureAdminContactSchema();

  try {
    const [rows]: any = await pool.query(
      "SELECT ui_theme, role FROM admins WHERE ui_theme IS NOT NULL ORDER BY CASE WHEN role = 'admin_0' THEN 0 ELSE 1 END, id ASC LIMIT 1",
    );
    if (rows && rows.length > 0) {
      const t = String(rows[0].ui_theme || "").trim();
      const allowed = new Set(["default", "spring", "summer", "autumn", "winter"]);
      const theme = allowed.has(t) ? t : "default";
      return { success: true, theme };
    }
  } catch {
    // ignore and fall back to default
  }

  return { success: true, theme: "default" };
});


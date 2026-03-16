export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const allowed = new Set(["default", "spring", "summer", "autumn", "winter"]);

  async function applyInitialTheme() {
    let theme: string | null = null;
    // Ưu tiên đọc theme toàn hệ thống từ server (áp dụng cho cả khách + admin)
    try {
      const res = await fetch("/api/theme", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const serverTheme = data?.theme;
        if (typeof serverTheme === "string" && serverTheme) {
          theme = serverTheme;
        }
      }
    } catch {
      // ignore, fallback bên dưới
    }
    // Fallback: localStorage (giữ cho khách / khi chưa đăng nhập)
    if (!theme) {
      try {
        theme = window.localStorage.getItem("site_theme");
      } catch {
        theme = null;
      }
    }
    const v = theme && typeof theme === "string" ? theme : "default";
    const finalTheme = allowed.has(v) ? v : "default";
    const el = document.documentElement;
    if (finalTheme === "default") {
      delete el.dataset.theme;
    } else {
      el.dataset.theme = finalTheme;
    }
  }

  applyInitialTheme();
})


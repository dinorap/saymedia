<template>
  <header class="site-header">
    <NuxtLink to="/" class="site-logo">
      <img src="/logo.png" alt="SayMedia AI" class="site-logo-img" />
    </NuxtLink>
    <nav class="site-nav-links">
      <NuxtLink to="/">{{ $t("nav.home") }}</NuxtLink>
      <NuxtLink to="/products">{{ $t("nav.services") }}</NuxtLink>
      <NuxtLink to="/pricing">{{ $t("nav.pricing") }}</NuxtLink>
      <NuxtLink to="/contact">{{ $t("nav.contact") }}</NuxtLink>
      <NuxtLink to="/announcements">{{ $t("admin.announcements") }}</NuxtLink>
    </nav>
    <div class="site-auth-buttons">
      <div class="site-lang-switcher">
        <button
          type="button"
          class="site-lang-btn"
          :class="{ active: locale === 'en' }"
          @click="setLocale('en')"
        >
          EN
        </button>
        <span class="site-lang-sep">|</span>
        <button
          type="button"
          class="site-lang-btn"
          :class="{ active: locale === 'vi' }"
          @click="setLocale('vi')"
        >
          VI
        </button>
      </div>
      <NuxtLink to="/cart" class="site-cart-btn">
        <span class="site-cart-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M7 7h14l-2 8H8L7 7Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path
              d="M7 7 6.4 4.8A2 2 0 0 0 4.47 3.3H3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M9 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span class="site-cart-text">{{ $t("cart.title") }}</span>
        <span v-if="cartCount" class="site-cart-badge">{{ cartCount }}</span>
      </NuxtLink>
      <template v-if="currentUser">
        <div
          class="site-user-dropdown"
          @mouseenter="
            cancelClose();
            openDropdown();
          "
          @mouseleave="scheduleClose()"
        >
          <button
            type="button"
            class="site-btn-user-name"
            @click="openDropdown()"
          >
            {{ currentUser.username }}
          </button>
          <div v-show="showDropdown" class="site-user-dropdown-menu">
            <div class="site-user-dropdown-menu-inner">
              <button
                type="button"
                class="site-dropdown-item"
                @click="goProfile"
              >
                {{ $t("auth.profile") }}
              </button>
              <button
                type="button"
                class="site-dropdown-item"
                @click="doLogout"
              >
                {{ $t("auth.logout") }}
              </button>
            </div>
          </div>
        </div>
      </template>
      <button v-else class="site-btn-login" @click="navigateTo('/login')">
        {{ $t("auth.login") }}
      </button>
    </div>
  </header>
  <Teleport to="body">
    <div
      v-if="showAnnouncementPopup && popupAnnouncements.length"
      class="announcement-popup-overlay"
      @click.self="closeAnnouncementPopup"
    >
      <div class="announcement-popup">
        <div v-if="popupAnnouncements.length > 1" class="announcement-popup-topnav">
          <button
            type="button"
            class="ann-nav-btn"
            :disabled="activeAnnouncementIndex <= 0"
            @click="prevAnnouncement"
          >
            ‹
          </button>
          <div class="ann-nav-dots" aria-label="ann-dots">
            <button
              v-for="(a, idx) in popupAnnouncements"
              :key="a.id"
              type="button"
              class="ann-dot"
              :class="{ active: idx === activeAnnouncementIndex }"
              @click="activeAnnouncementIndex = idx"
              :aria-label="`ann-${idx + 1}`"
            />
          </div>
          <button
            type="button"
            class="ann-nav-btn"
            :disabled="activeAnnouncementIndex >= popupAnnouncements.length - 1"
            @click="nextAnnouncement"
          >
            ›
          </button>
        </div>

        <h3 class="announcement-popup-title">
          {{ activeAnnouncement?.title }}
        </h3>
        <p class="announcement-popup-meta">
          <span>{{ activeAnnouncement?.authorName || $t("admin.profileName") }}</span>
          <span>•</span>
          <span>{{ formatPopupDate(activeAnnouncement?.updatedAt || activeAnnouncement?.createdAt) }}</span>
        </p>

        <div v-if="activeImages.length" class="announcement-popup-thumb-wrap">
          <button
            v-if="activeImages.length > 1"
            type="button"
            class="popup-image-nav popup-image-nav--left"
            @click.stop="prevPopupImage"
          >
            ‹
          </button>
          <NuxtImg
            :src="activeImages[activeImageIndex]"
            alt="Ảnh thông báo"
            class="announcement-popup-thumb"
          />
          <button
            v-if="activeImages.length > 1"
            type="button"
            class="popup-image-nav popup-image-nav--right"
            @click.stop="nextPopupImage"
          >
            ›
          </button>
        </div>

        <pre class="announcement-popup-content">{{ activeAnnouncement?.content }}</pre>
        <div class="announcement-popup-actions">
          <button type="button" class="announcement-popup-btn" @click="closeAnnouncementPopup">
            {{ $t("announcements.popupButton") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { locale, setLocale } = useI18n();
const { count, clear: clearCart } = useCart();
const cartCount = computed(() => Number(count.value || 0));
const showDropdown = ref(false);
const currentUser = ref(null);
let closeTimeout = null;

const popupAnnouncements = ref([]);
const showAnnouncementPopup = ref(false);
const activeAnnouncementIndex = ref(0);
const activeImageIndex = ref(0);

// Dùng chung cookie role cho menu; popup thông báo dùng /api/auth/me (vì auth_token là httpOnly, client không đọc được)
const roleCookie = useCookie("user_role", { path: "/" });

const activeAnnouncement = computed(() => {
  return popupAnnouncements.value[activeAnnouncementIndex.value] || null;
});

const activeImages = computed(() => {
  const a = activeAnnouncement.value;
  if (!a) return [];
  const imgs = Array.isArray(a.images) ? a.images : [];
  const legacy = a.imageUrl ? [a.imageUrl] : [];
  const merged = [...imgs, ...legacy].map((s) => String(s || "").trim()).filter((s) => !!s);
  // unique, keep order
  const out = [];
  for (const u of merged) {
    if (!out.includes(u)) out.push(u);
  }
  return out.slice(0, 10);
});

function openDropdown() {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  showDropdown.value = true;
}

function scheduleClose() {
  closeTimeout = setTimeout(() => {
    showDropdown.value = false;
    closeTimeout = null;
  }, 200);
}

function cancelClose() {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
}

const route = useRoute();

onMounted(async () => {
  const role = roleCookie.value;
  // Hiển thị tên + menu tài khoản cho mọi role không phải admin dashboard
  if (role && role !== "admin_0" && role !== "admin_1") {
    try {
      const data = await $fetch("/api/auth/me");
      if (data?.user) currentUser.value = data.user;
    } catch {
      currentUser.value = null;
    }
  } else {
    currentUser.value = null;
  }
  // Chạy kiểm tra popup ngay sau khi mount (chỉ chạy trên client, sau hydration)
  await maybeShowAnnouncementPopup();
});

// Chạy lại khi chuyển trang (client-side navigation) để bắt thêm/sửa thông báo, qua ngày mới
watch(
  () => route.path,
  () => { maybeShowAnnouncementPopup(); },
  { immediate: false },
);

async function doLogout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  clearCart();
  // Xóa localStorage liên quan popup thông báo khi đăng xuất
  if (import.meta.client) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith("announcement_popup_") ||
          k.startsWith("announcements_popup_") ||
          k === "announcements_popup_lastSeenUpdatedAt" ||
          k === "announcements_popup_lastShownDay"
        ) {
          keys.push(k);
        }
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
  currentUser.value = null;
  showDropdown.value = false;
  return navigateTo("/");
}

function goProfile() {
  showDropdown.value = false;
  navigateTo("/profile");
}

function formatPopupDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function maybeShowAnnouncementPopup() {
  if (!import.meta.client) return;

  try {
    // Kiểm tra đăng nhập bằng API (auth_token là httpOnly nên client không đọc được cookie)
    const me = await $fetch("/api/auth/me").catch(() => null);
    const user = me?.user;
    // Chỉ hiển thị popup cho khách hàng (role user), không hiện cho admin
    if (!user || user.role !== "user") return;

    const res = await $fetch("/api/announcements?popup=1");
    const list = Array.isArray(res?.data) ? res.data : [];
    if (!list.length) return;

    // reset theo 0:00 local time
    const now = new Date();
    const today =
      String(now.getFullYear()) +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const lastShownDay = localStorage.getItem("announcements_popup_lastShownDay") || "";
    const lastSeenUpdatedAt = Number(localStorage.getItem("announcements_popup_lastSeenUpdatedAt") || 0) || 0;

    const items = list
      .map((a) => ({
        ...a,
        updatedAt: a.updatedAt || a.createdAt,
      }))
      .filter((a) => !!a.id);

    const maxUpdatedAt = Math.max(
      0,
      ...items.map((a) => new Date(a.updatedAt || a.createdAt || 0).getTime() || 0),
    );

    const changed = items.filter((a) => {
      const t = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
      return t > lastSeenUpdatedAt;
    });

    // Ưu tiên hiển thị các thông báo mới/sửa (ngay cả khi hôm nay đã xem)
    if (changed.length) {
      popupAnnouncements.value = changed;
      activeAnnouncementIndex.value = 0;
      activeImageIndex.value = 0;
      showAnnouncementPopup.value = true;
      return;
    }

    // Không có thay đổi => mỗi ngày hiển thị 1 lần
    if (lastShownDay === today) return;
    popupAnnouncements.value = items;
    activeAnnouncementIndex.value = 0;
    activeImageIndex.value = 0;
    showAnnouncementPopup.value = true;
  } catch (err) {
    if (import.meta.dev) {
      console.warn("[announcement popup] fetch or check failed:", err);
    }
  }
}

function closeAnnouncementPopup() {
  if (import.meta.client) {
    const now = new Date();
    const today =
      String(now.getFullYear()) +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");
    try {
      localStorage.setItem("announcements_popup_lastShownDay", today);

      const maxUpdatedAt = Math.max(
        0,
        ...popupAnnouncements.value.map((a) => {
          const t = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
          return t;
        }),
      );
      localStorage.setItem("announcements_popup_lastSeenUpdatedAt", String(maxUpdatedAt));
    } catch {
      // ignore
    }
  }
  showAnnouncementPopup.value = false;
}

function prevAnnouncement() {
  if (activeAnnouncementIndex.value <= 0) return;
  activeAnnouncementIndex.value -= 1;
  activeImageIndex.value = 0;
}
function nextAnnouncement() {
  if (activeAnnouncementIndex.value >= popupAnnouncements.value.length - 1) return;
  activeAnnouncementIndex.value += 1;
  activeImageIndex.value = 0;
}
function prevPopupImage() {
  if (!activeImages.value.length) return;
  activeImageIndex.value =
    (activeImageIndex.value - 1 + activeImages.value.length) % activeImages.value.length;
}
function nextPopupImage() {
  if (!activeImages.value.length) return;
  activeImageIndex.value = (activeImageIndex.value + 1) % activeImages.value.length;
}
</script>

<style scoped>
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 150px;
  border-bottom: 1px solid rgba(1, 123, 251, 0.25);
  background: linear-gradient(
    180deg,
    rgba(4, 15, 39, 0.65),
    rgba(4, 15, 39, 0.35)
  );
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.45),
    0 0 30px rgba(1, 123, 251, 0.14);
}

.site-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.site-logo-img {
  height: 56px;
  width: auto;
  display: block;
  object-fit: contain;
}

.site-nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.site-nav-links a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 8px;
  transition: var(--transition-fast);
  letter-spacing: 0.01em;
}

.site-nav-links a:hover {
  color: var(--blue-bright);
  background: rgba(1, 123, 251, 0.1);
  text-shadow:
    0 0 15px var(--blue-glow),
    0 0 30px rgba(1, 123, 251, 0.4);
}

.site-auth-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.site-cart-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  text-decoration: none;
  border: 1px solid rgba(1, 123, 251, 0.35);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  transition: var(--transition-fast);
}

.site-cart-btn:hover {
  border-color: rgba(1, 123, 251, 0.55);
  box-shadow: 0 0 18px rgba(1, 123, 251, 0.18);
}

.site-cart-icon {
  font-size: 16px;
}

.site-cart-text {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
}

.site-cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--blue-bright);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 0 14px rgba(1, 123, 251, 0.35);
}

.site-lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-lang-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: var(--transition-fast);
}

.site-lang-btn:hover {
  color: var(--text-primary);
}

.site-lang-btn.active {
  color: var(--blue-bright);
  text-shadow:
    0 0 12px var(--blue-glow),
    0 0 25px rgba(1, 123, 251, 0.5);
}

.site-lang-sep {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
  user-select: none;
}

.site-btn-login,
.site-btn-user-name {
  padding: 10px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: var(--transition-fast);
}

.site-btn-login {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.5);
  box-shadow: 0 0 15px rgba(1, 123, 251, 0.2);
}

.site-btn-login:hover {
  border-color: var(--blue-bright);
  background: var(--blue-soft);
  color: var(--blue-bright);
  box-shadow:
    0 0 25px var(--blue-glow),
    0 0 50px rgba(1, 123, 251, 0.25);
}

.site-user-dropdown {
  position: relative;
}

.site-btn-user-name {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.5);
}

.site-btn-user-name:hover {
  border-color: var(--blue-bright);
  background: var(--blue-soft);
  color: var(--blue-bright);
}

.site-user-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0;
  padding-top: 10px;
  min-width: 160px;
  background: transparent;
  border: none;
  border-radius: 0 0 10px 10px;
  box-shadow: none;
  overflow: visible;
  z-index: 100;
}

/* Vùng “cầu nối” trên menu: di chuột từ nút tên xuống menu không bị đóng */
.site-user-dropdown-menu::before {
  content: "";
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: 14px;
}

.site-user-dropdown-menu-inner {
  background: var(--bg-nav);
  border: 1px solid rgba(1, 123, 251, 0.5);
  border-radius: 10px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(1, 123, 251, 0.08);
  overflow: hidden;
}

.site-btn-login:focus-visible,
.site-btn-user-name:focus-visible,
.site-lang-btn:focus-visible,
.site-dropdown-item:focus-visible {
  outline: 2px solid var(--blue-bright);
  outline-offset: 2px;
}

.site-dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.site-dropdown-item:hover {
  background: rgba(1, 123, 251, 0.15);
  color: var(--blue-bright);
}

.announcement-popup-overlay {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.18), transparent 35%),
    radial-gradient(circle at 80% 90%, rgba(37, 99, 235, 0.18), transparent 40%),
    rgba(2, 6, 23, 0.74);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1rem;
}

.announcement-popup {
  max-width: 640px;
  width: 100%;
  background:
    radial-gradient(circle at 10% 0%, rgba(56, 189, 248, 0.18), transparent 45%),
    radial-gradient(circle at 90% 100%, rgba(34, 197, 94, 0.1), transparent 42%),
    rgba(5, 15, 35, 0.92);
  border-radius: 18px;
  border: 1px solid rgba(56, 189, 248, 0.38);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.6),
    0 22px 80px rgba(2, 6, 23, 0.85);
  padding: 18px 18px 16px;
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

.announcement-popup::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    rgba(56, 189, 248, 0.22),
    rgba(37, 99, 235, 0.14),
    rgba(34, 197, 94, 0.12)
  );
  filter: blur(18px);
  opacity: 0.55;
  pointer-events: none;
}

.announcement-popup > * {
  position: relative;
}

.announcement-popup-title {
  margin: 2px 40px 6px 0;
  font-size: 1.15rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.announcement-popup-meta {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  gap: 4px;
  align-items: center;
}

.announcement-popup-content {
  margin: 0;
  max-height: min(42vh, 380px);
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.55;
  background: rgba(2, 6, 23, 0.35);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.announcement-popup-thumb-wrap {
  margin: 10px 0 10px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.5);
}

.announcement-popup-thumb {
  width: 100%;
  max-height: 320px;
  border-radius: 0;
  object-fit: cover;
  border: none;
  box-shadow: none;
}

.announcement-popup-topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.25);
}

.ann-nav-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.25);
  color: rgba(226, 232, 240, 0.95);
  cursor: pointer;
}

.ann-nav-btn:hover:not(:disabled) {
  border-color: rgba(56, 189, 248, 0.55);
  background: rgba(2, 6, 23, 0.55);
}

.ann-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ann-nav-dots {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.ann-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.12);
  cursor: pointer;
}

.ann-dot.active {
  background: rgba(56, 189, 248, 0.92);
  border-color: rgba(56, 189, 248, 0.95);
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12);
}

.popup-image-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.55);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 18px rgba(15, 23, 42, 0.95);
}

.popup-image-nav:hover {
  border-color: rgba(56, 189, 248, 0.6);
  background: rgba(2, 6, 23, 0.75);
}
.popup-image-nav--left {
  left: 10px;
}
.popup-image-nav--right {
  right: 10px;
}

.announcement-popup-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.announcement-popup-btn {
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  border: none;
  background: var(--blue-bright);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.55);
}

@media (max-width: 1024px) {
  .site-header {
    padding: 16px 24px;
  }
}
</style>

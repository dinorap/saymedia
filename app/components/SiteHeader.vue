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
      <NuxtLink to="/announcements">Thông báo</NuxtLink>
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
      v-if="showAnnouncementPopup && popupAnnouncement"
      class="announcement-popup-overlay"
      @click.self="closeAnnouncementPopup"
    >
      <div class="announcement-popup">
        <h3 class="announcement-popup-title">
          {{ popupAnnouncement.title }}
        </h3>
        <p class="announcement-popup-meta">
          <span>{{ popupAnnouncement.authorName || "Admin" }}</span>
          <span>•</span>
          <span>{{ formatPopupDate(popupAnnouncement.createdAt) }}</span>
        </p>
        <pre class="announcement-popup-content">
{{ popupAnnouncement.content }}
        </pre>
        <div class="announcement-popup-actions">
          <button type="button" class="announcement-popup-btn" @click="closeAnnouncementPopup">
            Đã hiểu
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

const popupAnnouncement = ref(null);
const showAnnouncementPopup = ref(false);

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

onMounted(async () => {
  const role = useCookie("user_role", { path: "/" }).value;
  // Hiển thị tên + menu tài khoản cho mọi role không phải admin dashboard
  // (user thường + admin_2 dùng giao diện khách)
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

  await maybeShowAnnouncementPopup();
});

async function doLogout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  clearCart();
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
    const res = await $fetch("/api/announcements?popup=1");
    const list = Array.isArray(res?.data) ? res.data : [];
    const item = list[0];
    if (!item) return;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `announcement_popup_${item.id}_lastShown`;
    const lastShown = localStorage.getItem(storageKey);
    if (lastShown === today) return;

    popupAnnouncement.value = item;
    showAnnouncementPopup.value = true;
  } catch {
    // ignore errors
  }
}

function closeAnnouncementPopup() {
  if (!popupAnnouncement.value) {
    showAnnouncementPopup.value = false;
    return;
  }
  if (import.meta.client) {
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `announcement_popup_${popupAnnouncement.value.id}_lastShown`;
    try {
      localStorage.setItem(storageKey, today);
    } catch {
      // ignore
    }
  }
  showAnnouncementPopup.value = false;
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1rem;
}

.announcement-popup {
  max-width: 520px;
  width: 100%;
  background: radial-gradient(circle at 0 0, rgba(56, 189, 248, 0.2), transparent 55%),
    rgba(5, 15, 35, 0.97);
  border-radius: 16px;
  border: 1px solid rgba(56, 189, 248, 0.6);
  box-shadow:
    0 0 30px rgba(56, 189, 248, 0.45),
    0 24px 70px rgba(15, 23, 42, 0.95);
  padding: 20px 22px 18px;
  color: var(--text-primary);
}

.announcement-popup-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 600;
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
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.9rem;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
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

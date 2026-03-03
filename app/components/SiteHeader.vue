<template>
  <header class="site-header">
    <NuxtLink to="/" class="site-logo">
      <img src="/logo.png" alt="SayMedia AI" class="site-logo-img" />
    </NuxtLink>
    <nav class="site-nav-links">
      <NuxtLink to="/">{{ $t("nav.home") }}</NuxtLink>
      <NuxtLink to="/products">{{ $t("nav.services") }}</NuxtLink>
      <a href="#pricing">{{ $t("nav.pricing") }}</a>
      <a href="#contact">{{ $t("nav.contact") }}</a>
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
      <template v-if="currentUser">
        <div
          class="site-user-dropdown"
          @mouseenter="cancelClose(); openDropdown()"
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
              <button type="button" class="site-dropdown-item" @click="goProfile">
                {{ $t("auth.profile") }}
              </button>
              <button type="button" class="site-dropdown-item" @click="doLogout">
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
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { locale, setLocale } = useI18n();
const showDropdown = ref(false);
const currentUser = ref(null);
let closeTimeout = null;

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
  if (role === "user") {
    try {
      const data = await $fetch("/api/auth/me");
      if (data?.user) currentUser.value = data.user;
    } catch {
      currentUser.value = null;
    }
  } else {
    currentUser.value = null;
  }
});

async function doLogout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  currentUser.value = null;
  showDropdown.value = false;
  return navigateTo("/");
}

function goProfile() {
  showDropdown.value = false;
  navigateTo("/profile");
}
</script>

<style scoped>
.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 150px;
  border-bottom: 1px solid rgba(1, 123, 251, 0.35);
  background: rgb(4 15 39 / 97%);
  backdrop-filter: blur(14px);
  box-shadow: 0 2px 24px rgba(0, 0, 0, 0.25), 0 0 24px rgba(1, 123, 251, 0.06);
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
  text-shadow: 0 0 15px var(--blue-glow), 0 0 30px rgba(1, 123, 251, 0.4);
}

.site-auth-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
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
  text-shadow: 0 0 12px var(--blue-glow), 0 0 25px rgba(1, 123, 251, 0.5);
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
  box-shadow: 0 0 25px var(--blue-glow), 0 0 50px rgba(1, 123, 251, 0.25);
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
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(1, 123, 251, 0.08);
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

@media (max-width: 1024px) {
  .site-header {
    padding: 16px 24px;
  }
}
</style>


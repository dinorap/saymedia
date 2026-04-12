<template>
  <header class="site-header">
    <button
      v-if="showPartnerInviteBtn"
      type="button"
      class="site-partner-invite"
      :aria-label="locale === 'vi' ? 'Trở thành đối tác' : 'Become a partner'"
      @click="openPartnerModal"
    >
      <span class="site-partner-invite__full">{{
        locale === "vi" ? "Trở thành đối tác" : "Become a partner"
      }}</span>
      <span class="site-partner-invite__short" aria-hidden="true">{{
        locale === "vi" ? "Đối tác" : "Partner"
      }}</span>
    </button>
    <div class="site-header-brand">
      <NuxtLink to="/" class="site-logo">
        <img src="/logo.png" alt="SayMedia AI" class="site-logo-img" />
      </NuxtLink>
    </div>
    <nav class="site-header-nav site-nav-links" aria-label="Main">
      <NuxtLink to="/">{{ $t("nav.home") }}</NuxtLink>
      <NuxtLink to="/products">{{ $t("nav.services") }}</NuxtLink>
      <NuxtLink to="/announcements">{{ $t("admin.announcements") }}</NuxtLink>
      <NuxtLink to="/about">{{ $t("nav.about") }}</NuxtLink>
      <NuxtLink to="/contact">{{ $t("nav.contact") }}</NuxtLink>
      <NuxtLink to="/pricing">{{ $t("nav.pricing") }}</NuxtLink>
    </nav>
    <div class="site-header-actions">
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
      <button
        v-if="currentUser && isCustomerRole(currentUser.role)"
        type="button"
        class="site-header-credit"
        :title="
          locale === 'vi'
            ? `Nạp tiền — ${$t('product.balance')}: ${formatCredit(currentUser.credit)}`
            : `Deposit — ${$t('product.balance')}: ${formatCredit(currentUser.credit)}`
        "
        @click="goDeposit"
      >
        <span class="site-header-credit-icon" aria-hidden="true">◎</span>
        <span class="site-header-credit-text">
          <span class="site-header-credit-label">{{
            $t("product.balance")
          }}</span>
          <span class="site-header-credit-value">{{
            formatCredit(currentUser.credit)
          }}</span>
        </span>
      </button>
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
    <div class="site-mobile-controls">
      <NuxtLink to="/cart" class="site-mobile-cart" @click="closeMobileMenu">
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
        <span v-if="cartCount" class="site-cart-badge">{{ cartCount }}</span>
      </NuxtLink>
      <button
        v-if="currentUser && isCustomerRole(currentUser.role)"
        type="button"
        class="site-mobile-credit"
        :title="
          locale === 'vi'
            ? `Nạp tiền — ${$t('product.balance')}: ${formatCredit(currentUser.credit)}`
            : `Deposit — ${$t('product.balance')}: ${formatCredit(currentUser.credit)}`
        "
        @click="goDeposit"
      >
        <span class="site-mobile-credit-icon" aria-hidden="true">◎</span>
        <span class="site-mobile-credit-value">{{
          formatCredit(currentUser.credit)
        }}</span>
      </button>
      <NuxtLink
        v-if="currentUser"
        to="/profile"
        class="site-mobile-login"
        :aria-label="$t('auth.profile')"
        :title="$t('auth.profile')"
        @click="closeMobileMenu"
      >
        <span class="site-mobile-login-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle
              cx="12"
              cy="8"
              r="3.5"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M5 19.5c1.2-3.2 3.9-4.8 7-4.8s5.8 1.6 7 4.8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </span>
      </NuxtLink>
      <button
        v-else
        type="button"
        class="site-mobile-login"
        :aria-label="$t('auth.login')"
        :title="$t('auth.login')"
        @click="
          closeMobileMenu();
          navigateTo('/login');
        "
      >
        <span class="site-mobile-login-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M10 7V5.6A1.6 1.6 0 0 1 11.6 4h6.8A1.6 1.6 0 0 1 20 5.6v12.8a1.6 1.6 0 0 1-1.6 1.6h-6.8a1.6 1.6 0 0 1-1.6-1.6V17"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M4 12h10m0 0-2.8-2.8M14 12l-2.8 2.8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <button
        type="button"
        class="site-mobile-menu-btn"
        :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
        aria-label="Open menu"
        @click="toggleMobileMenu"
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  </header>
  <Teleport to="body">
    <div
      v-if="isMobileMenuOpen"
      class="site-mobile-overlay"
      @click="closeMobileMenu"
    >
      <aside class="site-mobile-drawer" @click.stop>
        <div class="site-mobile-drawer-top">
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
          <button
            type="button"
            class="site-mobile-close-btn"
            aria-label="Close menu"
            @click="closeMobileMenu"
          >
            ✕
          </button>
        </div>
        <nav class="site-mobile-nav-links">
          <NuxtLink to="/" @click="closeMobileMenu">{{
            $t("nav.home")
          }}</NuxtLink>
          <NuxtLink to="/about" @click="closeMobileMenu">{{
            $t("nav.about")
          }}</NuxtLink>
          <NuxtLink to="/products" @click="closeMobileMenu">{{
            $t("nav.services")
          }}</NuxtLink>
          <NuxtLink to="/pricing" @click="closeMobileMenu">{{
            $t("nav.pricing")
          }}</NuxtLink>
          <NuxtLink to="/contact" @click="closeMobileMenu">{{
            $t("nav.contact")
          }}</NuxtLink>
          <NuxtLink to="/announcements" @click="closeMobileMenu">{{
            $t("admin.announcements")
          }}</NuxtLink>
          <NuxtLink to="/cart" @click="closeMobileMenu">{{
            $t("cart.title")
          }}</NuxtLink>
          <NuxtLink v-if="currentUser" to="/profile" @click="closeMobileMenu">
            {{ $t("auth.profile") }}
          </NuxtLink>
        </nav>
        <div class="site-mobile-actions">
          <button
            v-if="currentUser"
            type="button"
            class="site-btn-login"
            @click="doLogout()"
          >
            {{ $t("auth.logout") }}
          </button>
          <button
            v-else
            type="button"
            class="site-btn-login"
            @click="
              closeMobileMenu();
              navigateTo('/login');
            "
          >
            {{ $t("auth.login") }}
          </button>
        </div>
      </aside>
    </div>
  </Teleport>
  <Teleport to="body">
    <div
      v-if="showAnnouncementPopup && popupAnnouncements.length"
      class="announcement-popup-overlay"
      @click.self="closeAnnouncementPopup"
    >
      <div class="announcement-popup">
        <div
          v-if="popupAnnouncements.length > 1"
          class="announcement-popup-topnav"
        >
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
          <span>{{
            activeAnnouncement?.authorName || $t("admin.profileName")
          }}</span>
          <span>•</span>
          <span>{{
            formatPopupDate(
              activeAnnouncement?.updatedAt || activeAnnouncement?.createdAt,
            )
          }}</span>
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

        <pre class="announcement-popup-content">{{
          activeAnnouncement?.content
        }}</pre>
        <div class="announcement-popup-actions">
          <button
            type="button"
            class="announcement-popup-btn"
            @click="closeAnnouncementPopup"
          >
            {{ $t("announcements.popupButton") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
  <Teleport to="body">
    <div
      v-if="showPartnerModal"
      class="announcement-popup-overlay"
      @click.self="showPartnerModal = false"
    >
      <div class="announcement-popup partner-invite-modal">
        <h3 class="announcement-popup-title">
          {{
            locale === "vi"
              ? "Trở thành đối tác giới thiệu"
              : "Become a referral partner"
          }}
        </h3>
        <p class="partner-invite-hint">
          {{
            locale === "vi"
              ? "Nhập mã kích hoạt. Sau khi thành công, bạn nhận mã giới thiệu từng sản phẩm và hoa hồng trong trang cá nhân."
              : "Enter your invite code. You will get per-product referral codes and commissions in your profile."
          }}
        </p>
        <input
          v-model="partnerKeyInput"
          type="password"
          autocomplete="off"
          class="partner-invite-input"
          :placeholder="locale === 'vi' ? 'Mã kích hoạt' : 'Invite code'"
          @keyup.enter="submitPartnerActivate"
        />
        <p v-if="partnerActivateError" class="profile-error-msg">
          {{ partnerActivateError }}
        </p>
        <div class="partner-invite-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="showPartnerModal = false"
          >
            {{ locale === "vi" ? "Đóng" : "Close" }}
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="partnerActivateLoading"
            @click="submitPartnerActivate"
          >
            {{
              partnerActivateLoading
                ? locale === "vi"
                  ? "Đang xử lý…"
                  : "…"
                : locale === "vi"
                  ? "Kích hoạt"
                  : "Activate"
            }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { isCustomerRole } from "~/composables/useCustomerRole";

const { locale, setLocale } = useI18n();
const { count, clear: clearCart } = useCart();
const cartCount = computed(() => Number(count.value || 0));
const showDropdown = ref(false);
const currentUser = ref(null);
const isMobileMenuOpen = ref(false);
let closeTimeout = null;

const popupAnnouncements = ref([]);
const showAnnouncementPopup = ref(false);
const activeAnnouncementIndex = ref(0);
const activeImageIndex = ref(0);

const showPartnerModal = ref(false);
const partnerKeyInput = ref("");
const partnerActivateError = ref("");
const partnerActivateLoading = ref(false);

const showPartnerInviteBtn = computed(() => {
  const u = currentUser.value;
  return !u || u.role === "user";
});

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
  const merged = [...imgs, ...legacy]
    .map((s) => String(s || "").trim())
    .filter((s) => !!s);
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

function formatCredit(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function refreshCurrentUser() {
  const role = roleCookie.value;
  const staff = ["admin_0", "admin_1", "admin_support", "admin_2"];
  if (role && !staff.includes(role)) {
    try {
      const data = await $fetch("/api/auth/me");
      if (data?.user) currentUser.value = data.user;
    } catch {
      currentUser.value = null;
    }
  } else {
    currentUser.value = null;
  }
}

function openPartnerModal() {
  partnerActivateError.value = "";
  partnerKeyInput.value = "";
  showPartnerModal.value = true;
}

async function submitPartnerActivate() {
  partnerActivateError.value = "";
  const key = String(partnerKeyInput.value || "").trim();
  if (!key) {
    partnerActivateError.value =
      locale.value === "vi" ? "Vui lòng nhập mã" : "Please enter a code";
    return;
  }
  partnerActivateLoading.value = true;
  try {
    const res = await $fetch("/api/partner/activate", {
      method: "POST",
      body: { key },
    });
    if (res?.success) {
      roleCookie.value = "admin_3";
      showPartnerModal.value = false;
      await refreshCurrentUser();
    }
  } catch (e) {
    partnerActivateError.value =
      e?.data?.statusMessage ||
      e?.data?.message ||
      (locale.value === "vi" ? "Không kích hoạt được" : "Activation failed");
  } finally {
    partnerActivateLoading.value = false;
  }
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

onMounted(async () => {
  await refreshCurrentUser();
  // Chạy kiểm tra popup ngay sau khi mount (chỉ chạy trên client, sau hydration)
  await maybeShowAnnouncementPopup();
});

watch(
  () => route.path,
  async () => {
    closeMobileMenu();
    await refreshCurrentUser();
    await maybeShowAnnouncementPopup();
  },
);

watch(isMobileMenuOpen, (open) => {
  if (!import.meta.client) return;
  document.body.style.overflow = open ? "hidden" : "";
});

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
  closeMobileMenu();
  return navigateTo("/");
}

function goProfile() {
  showDropdown.value = false;
  navigateTo("/profile");
}

function goDeposit() {
  if (!currentUser.value || !isCustomerRole(currentUser.value.role)) return;
  showDropdown.value = false;
  closeMobileMenu();
  navigateTo("/profile?deposit=1");
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
    if (!user || !isCustomerRole(user.role)) return;

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

    const lastShownDay =
      localStorage.getItem("announcements_popup_lastShownDay") || "";
    const lastSeenUpdatedAt =
      Number(
        localStorage.getItem("announcements_popup_lastSeenUpdatedAt") || 0,
      ) || 0;

    const items = list
      .map((a) => ({
        ...a,
        updatedAt: a.updatedAt || a.createdAt,
      }))
      .filter((a) => !!a.id);

    const maxUpdatedAt = Math.max(
      0,
      ...items.map(
        (a) => new Date(a.updatedAt || a.createdAt || 0).getTime() || 0,
      ),
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
      localStorage.setItem(
        "announcements_popup_lastSeenUpdatedAt",
        String(maxUpdatedAt),
      );
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
  if (activeAnnouncementIndex.value >= popupAnnouncements.value.length - 1)
    return;
  activeAnnouncementIndex.value += 1;
  activeImageIndex.value = 0;
}
function prevPopupImage() {
  if (!activeImages.value.length) return;
  activeImageIndex.value =
    (activeImageIndex.value - 1 + activeImages.value.length) %
    activeImages.value.length;
}
function nextPopupImage() {
  if (!activeImages.value.length) return;
  activeImageIndex.value =
    (activeImageIndex.value + 1) % activeImages.value.length;
}

onUnmounted(() => {
  if (!import.meta.client) return;
  document.body.style.overflow = "";
});
</script>

<style scoped>
.site-header {
  --site-header-ctrl-h: 42px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: grid;
  /* Cột phải (actions) rộng hơn cột trái để email/tên dài luôn một dòng; cột giữa auto */
  grid-template-columns: minmax(0, 0.88fr) auto minmax(260px, 1.28fr);
  align-items: center;
  column-gap: 20px;
  padding: 16px 150px;
  border-bottom: 1px solid var(--blue-border);
  background: linear-gradient(
    180deg,
    rgba(4, 15, 39, 0.58),
    rgba(4, 15, 39, 0.26)
  );
  backdrop-filter: blur(14px);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.35),
    0 0 30px var(--blue-glow);
}

/* Nút đối tác: nằm trong vùng padding trái của header, không tăng padding → logo giữ đúng chỗ cũ */
.site-header-brand {
  justify-self: start;
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.site-partner-invite {
  position: absolute;
  left: max(10px, env(safe-area-inset-left, 0px));
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  box-sizing: border-box;
  max-width: min(138px, calc(150px - 12px - env(safe-area-inset-left, 0px)));
  font-size: 11px;
  font-weight: 800;
  line-height: 1.3;
  padding: 8px 10px;
  border-radius: 12px;
  border: 2px solid rgb(var(--accent-rgb) / 0.55);
  background: linear-gradient(
    160deg,
    rgb(var(--accent-rgb) / 0.14) 0%,
    var(--bg-card) 100%
  );
  backdrop-filter: blur(10px);
  color: var(--text-primary);
  text-shadow: 0 0 14px var(--blue-glow);
  cursor: pointer;
  letter-spacing: 0.03em;
  text-align: center;
  white-space: normal;
  animation: site-partner-blink 1.05s ease-in-out infinite;
  box-shadow:
    0 4px 18px rgba(0, 0, 0, 0.35),
    0 0 18px rgb(var(--accent-rgb) / 0.22);
  will-change: transform, box-shadow, opacity;
}

.site-partner-invite__short {
  display: none;
}

.site-partner-invite:hover {
  border-color: var(--blue-bright);
  background: var(--blue-soft);
  color: var(--blue-bright);
  animation-play-state: paused;
}

@keyframes site-partner-blink {
  0%,
  100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
    border-color: rgb(var(--accent-rgb) / 0.5);
    box-shadow:
      0 4px 18px rgba(0, 0, 0, 0.35),
      0 0 14px rgb(var(--accent-rgb) / 0.3),
      0 0 28px rgb(var(--accent-rgb) / 0.12);
  }
  50% {
    opacity: 0.9;
    transform: translateY(-50%) scale(1.06);
    border-color: var(--blue-bright);
    box-shadow:
      0 6px 22px rgba(0, 0, 0, 0.4),
      0 0 22px rgb(var(--accent-rgb) / 0.5),
      0 0 44px rgb(var(--accent-rgb) / 0.28);
  }
}

.partner-invite-modal .partner-invite-hint {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.45;
}

.partner-invite-modal .partner-invite-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 8px;
  padding: 12px 14px;
  font-size: 0.95rem;
  line-height: 1.4;
  color: var(--text-primary);
  caret-color: var(--blue-bright);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 12px;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.partner-invite-modal .partner-invite-input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.partner-invite-modal .partner-invite-input:hover {
  border-color: rgb(var(--accent-rgb) / 0.45);
  background: rgb(var(--accent-rgb) / 0.08);
}

.partner-invite-modal .partner-invite-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-glow), inset 0 1px 2px rgba(0, 0, 0, 0.15);
  background: rgb(var(--accent-rgb) / 0.06);
}

.partner-invite-modal .profile-error-msg {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #fca5a5;
}

.partner-invite-modal .partner-invite-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
  flex-wrap: wrap;
}

.site-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.site-logo-img {
  height: 48px;
  width: auto;
  display: block;
  object-fit: contain;
}

.site-header-nav {
  justify-self: center;
  max-width: min(100%, 52vw);
  min-width: 0;
}

.site-nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.site-nav-links a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 17px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: var(--transition-fast);
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.site-nav-links a:hover {
  color: var(--blue-bright);
  background: var(--blue-soft);
  text-shadow:
    0 0 15px var(--blue-glow),
    0 0 30px var(--blue-glow);
}

.site-header-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 10px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.site-mobile-controls {
  display: none;
  align-items: center;
  gap: 10px;
}

.site-mobile-cart {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--blue-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-decoration: none;
}

.site-mobile-menu-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--blue-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.site-mobile-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--blue-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
}

.site-mobile-login-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.site-mobile-login:hover {
  border-color: var(--blue-bright);
  color: var(--blue-bright);
}

.site-mobile-menu-btn span {
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.site-mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 1150;
  background: rgba(2, 6, 23, 0.68);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
}

.site-mobile-drawer {
  width: min(340px, 86vw);
  height: 100%;
  background: rgba(5, 15, 35, 0.96);
  border-left: 1px solid var(--blue-border);
  box-shadow: -10px 0 34px rgba(0, 0, 0, 0.42);
  padding: 18px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.site-mobile-drawer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-mobile-close-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid var(--blue-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.site-mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.site-mobile-nav-links a {
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 500;
  padding: 10px 12px;
  border-radius: 9px;
}

.site-mobile-nav-links a.router-link-active {
  background: rgb(var(--accent-rgb) / 0.16);
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
}

.site-mobile-nav-links a:hover {
  background: var(--blue-soft);
  color: var(--blue-bright);
}

.site-mobile-actions {
  margin-top: auto;
  display: flex;
}

.site-mobile-actions .site-btn-login {
  width: 100%;
}

.site-cart-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--site-header-ctrl-h);
  min-height: var(--site-header-ctrl-h);
  padding: 0 14px;
  box-sizing: border-box;
  border-radius: 10px;
  text-decoration: none;
  border: 1px solid var(--blue-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  transition: var(--transition-fast);
  flex-shrink: 0;
}

.site-cart-btn:hover {
  border-color: var(--blue-bright);
  box-shadow: 0 0 18px var(--blue-glow);
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
  box-shadow: 0 0 14px var(--blue-glow);
}

.site-header-credit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--site-header-ctrl-h);
  min-height: var(--site-header-ctrl-h);
  padding: 0 12px 0 10px;
  border-radius: 10px;
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  background:
    linear-gradient(
      180deg,
      rgb(var(--accent-rgb) / 0.12),
      rgb(var(--accent-rgb) / 0.06)
    ),
    rgba(15, 23, 42, 0.75);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.05),
    0 0 16px rgb(var(--accent-rgb) / 0.18);
  min-width: 112px;
  max-width: min(240px, 30vw);
  box-sizing: border-box;
  flex-shrink: 0;
}

.site-header-credit:hover {
  border-color: rgb(var(--accent-rgb) / 0.65);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.08),
    0 0 20px rgb(var(--accent-rgb) / 0.28);
}

.site-header-credit-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 1;
  color: #dbeafe;
  border-radius: 999px;
  background: rgb(var(--accent-rgb) / 0.35);
  box-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.4);
  flex-shrink: 0;
}

.site-header-credit-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  min-width: 0;
}

.site-header-credit-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.1;
}

.site-header-credit-value {
  font-size: 14px;
  font-weight: 800;
  color: #eaf2ff;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.site-mobile-credit {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 70px;
  max-width: 108px;
  padding: 0 8px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  cursor: pointer;
  font: inherit;
  color: inherit;
  background:
    linear-gradient(
      180deg,
      rgb(var(--accent-rgb) / 0.16),
      rgb(var(--accent-rgb) / 0.08)
    ),
    rgba(15, 23, 42, 0.8);
}

.site-mobile-credit:hover {
  border-color: rgb(var(--accent-rgb) / 0.7);
}

.site-mobile-credit-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgb(var(--accent-rgb) / 0.4);
  color: #eaf2ff;
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
}

.site-mobile-credit-value {
  font-size: 12px;
  font-weight: 800;
  color: #eaf2ff;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.site-lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: var(--site-header-ctrl-h);
  min-height: var(--site-header-ctrl-h);
  padding: 0 8px;
  box-sizing: border-box;
  border-radius: 10px;
  flex-shrink: 0;
}

.site-lang-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 8px;
  height: 100%;
  border-radius: 6px;
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.site-lang-btn:hover {
  color: var(--text-primary);
}

.site-lang-btn.active {
  color: var(--blue-bright);
  text-shadow:
    0 0 12px var(--blue-glow),
    0 0 25px var(--blue-glow);
}

.site-lang-sep {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
  user-select: none;
}

.site-btn-login,
.site-btn-user-name {
  height: var(--site-header-ctrl-h);
  min-height: var(--site-header-ctrl-h);
  padding: 0 20px;
  box-sizing: border-box;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-btn-login {
  max-width: min(200px, 22vw);
  flex-shrink: 0;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--blue-border);
  box-shadow: 0 0 15px var(--blue-glow);
}

.site-btn-login:hover {
  border-color: var(--blue-bright);
  background: var(--blue-soft);
  color: var(--blue-bright);
  box-shadow:
    0 0 25px var(--blue-glow),
    0 0 50px var(--blue-glow);
}

.site-user-dropdown {
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
  max-width: 100%;
}

.site-btn-user-name {
  max-width: min(420px, 100%);
  min-width: 0;
  flex: 1 1 auto;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--blue-border);
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
  border: 1px solid var(--blue-border);
  border-radius: 10px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.45),
    0 0 20px var(--blue-glow);
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
  background: var(--blue-soft);
  color: var(--blue-bright);
}

.announcement-popup-overlay {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(
      circle at 20% 10%,
      rgba(56, 189, 248, 0.18),
      transparent 35%
    ),
    radial-gradient(
      circle at 80% 90%,
      rgba(37, 99, 235, 0.18),
      transparent 40%
    ),
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
    radial-gradient(
      circle at 10% 0%,
      rgba(56, 189, 248, 0.18),
      transparent 45%
    ),
    radial-gradient(
      circle at 90% 100%,
      rgba(34, 197, 94, 0.1),
      transparent 42%
    ),
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
  }
  .site-partner-invite {
    max-width: 86px;
    font-size: 11px;
    font-weight: 800;
    padding: 7px 9px;
    border-radius: 999px;
  }
  .site-partner-invite__full {
    display: none;
  }
  .site-partner-invite__short {
    display: block;
  }
  /* Tránh đè logo khi padding ngắn; chừa ~bằng khối nút */
  .site-header:has(.site-partner-invite) .site-header-brand {
    margin-left: 92px;
  }
  .site-logo-img {
    height: 42px;
  }
  .site-header-nav,
  .site-header-actions {
    display: none;
  }
  .site-mobile-controls {
    display: flex;
  }
}

@media (max-width: 640px) {
  .site-mobile-drawer {
    padding: 14px 12px 14px;
    gap: 10px;
  }
  .site-mobile-nav-links a {
    padding: 9px 10px;
    font-size: 0.92rem;
  }
  .site-mobile-actions .site-btn-login {
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  .announcement-popup {
    padding: 14px;
    border-radius: 14px;
  }
  .announcement-popup-title {
    margin-right: 0;
    font-size: 1.02rem;
  }
  .announcement-popup-content {
    max-height: 38vh;
    font-size: 0.84rem;
    padding: 10px 11px;
  }
  .announcement-popup-thumb {
    max-height: 220px;
  }
}

@media (max-width: 480px) {
  .site-header {
    padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
  }
  .site-mobile-drawer {
    width: 100vw;
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    border-left: none;
  }
  .site-mobile-menu-btn,
  .site-mobile-cart {
    width: 38px;
    height: 38px;
  }
  .site-mobile-login {
    width: 38px;
    height: 38px;
  }
}
</style>

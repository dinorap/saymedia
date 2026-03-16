<template>
  <div class="admin-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <div class="particles" aria-hidden="true" />

    <!-- Sidebar -->
    <aside class="sidebar">
      <NuxtLink to="/admin" class="sidebar-logo">
        <img src="/logo.png" alt="SayMedia AI" class="sidebar-logo-img" />
      </NuxtLink>
      <nav class="sidebar-nav">
        <NuxtLink
          to="/admin"
          class="sidebar-item"
          active-class="sidebar-item--active"
        >
          <span class="sidebar-item-icon" aria-hidden="true">▣</span>
          <span class="sidebar-item-label">{{ $t("admin.dashboard") }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/users" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">👥</span>
          <span class="sidebar-item-label">{{ $t("admin.users") }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/orders" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">🧾</span>
          <span class="sidebar-item-label">{{ $t("admin.orders") }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/deposits" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">💰</span>
          <span class="sidebar-item-label">{{ $t("admin.deposits") }}</span>
        </NuxtLink>
        <NuxtLink
          v-if="currentUser?.role !== 'admin_1'"
          to="/admin/deposit-promotions"
          class="sidebar-item"
        >
          <span class="sidebar-item-icon" aria-hidden="true">🎟️</span>
          <span class="sidebar-item-label">
            {{ $t("depositPromotions.title") }}
          </span>
        </NuxtLink>
        <NuxtLink to="/admin/products" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">🛒</span>
          <span class="sidebar-item-label">{{ $t("admin.products") }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/product-keys" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">🔑</span>
          <span class="sidebar-item-label">
            {{ $t("admin.productKeys") || "Key sản phẩm" }}
          </span>
        </NuxtLink>
        <NuxtLink
          to="/admin/revenue"
          class="sidebar-item"
        >
          <span class="sidebar-item-icon" aria-hidden="true">📈</span>
          <span class="sidebar-item-label">{{ $t("admin.revenue") }}</span>
        </NuxtLink>
        <NuxtLink
          to="/admin/partners"
          class="sidebar-item"
        >
          <span class="sidebar-item-icon" aria-hidden="true">🤝</span>
          <span class="sidebar-item-label">{{ $t("admin.partners") || "Đối tác & Doanh thu" }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/ledger" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">📚</span>
          <span class="sidebar-item-label">{{
            $t("admin.creditLedger") || "Sổ sao kê tín chỉ"
          }}</span>
        </NuxtLink>
        <NuxtLink
          v-if="currentUser?.role !== 'admin_1'"
          to="/admin/logs"
          class="sidebar-item"
        >
          <span class="sidebar-item-icon" aria-hidden="true">📄</span>
          <span class="sidebar-item-label">{{ $t("admin.logs") }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/support" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">💬</span>
          <span class="sidebar-item-label">
            {{ $t("admin.supportChat") || "Chat hỗ trợ" }}
          </span>
        </NuxtLink>
        <NuxtLink to="/admin/announcements" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">📢</span>
          <span class="sidebar-item-label">
            {{ $t("admin.announcements") }}
          </span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <button
          type="button"
          class="sidebar-profile"
          @click="showChangePassword = true"
        >
          <div class="sidebar-profile-avatar">
            <span>
              {{
                (currentUser?.username || $t("admin.profileName"))
                  .charAt(0)
                  .toUpperCase()
              }}
            </span>
          </div>
          <span class="sidebar-profile-name">{{
            currentUser?.username || $t("admin.profileName")
          }}</span>
          <span class="sidebar-profile-chevron" aria-hidden="true">›</span>
        </button>
        <button
          v-if="registerRefLink"
          type="button"
          class="sidebar-ref-btn"
          @click="copyRegisterRefLink"
        >
          🔗 {{ $t("admin.copyRegisterRefLink") }}
        </button>
        <button
          type="button"
          class="sidebar-ref-btn sidebar-logout-btn"
          @click="logout"
        >
          {{ $t("admin.logout") }}
        </button>
      </div>
    </aside>

    <!-- Main: header + content -->
    <div class="main-wrap">
      <header class="admin-header">
        <button
          type="button"
          class="sidebar-toggle-btn"
          @click="toggleSidebar"
        >
          <span class="sidebar-toggle-icon" aria-hidden="true">☰</span>
        </button>
        <h1 class="admin-header-title">{{ pageTitle }}</h1>
        <div class="admin-header-actions">
          <div class="admin-lang-switcher">
            <button
              type="button"
              class="admin-lang-btn"
              :class="{ active: locale === 'en' }"
              @click="setLocale('en')"
            >
              EN
            </button>
            <span class="admin-lang-sep">|</span>
            <button
              type="button"
              class="admin-lang-btn"
              :class="{ active: locale === 'vi' }"
              @click="setLocale('vi')"
            >
              VI
            </button>
          </div>
        </div>
      </header>
      <main class="admin-content">
        <NuxtPage />
      </main>
    </div>

    <!-- Modal đổi mật khẩu -->
    <Teleport to="body">
      <div
        v-if="showChangePassword"
        class="admin-modal-overlay"
        @click.self="showChangePassword = false"
      >
        <div class="admin-modal">
          <h3 class="admin-modal-title">{{ $t("admin.changePassword") }}</h3>
          <form class="admin-modal-form" @submit.prevent="submitChangePassword">
            <div class="admin-form-row">
              <label>{{ $t("admin.oldPassword") }}</label>
              <input
                v-model="pwForm.oldPassword"
                type="password"
                class="admin-input"
                required
              />
            </div>
            <div class="admin-form-row">
              <label>{{ $t("admin.newPassword") }}</label>
              <input
                v-model="pwForm.newPassword"
                type="password"
                class="admin-input"
                required
                minlength="6"
              />
            </div>
            <div class="admin-form-row">
              <label>{{ $t("admin.confirmPassword") }}</label>
              <input
                v-model="pwForm.confirmPassword"
                type="password"
                class="admin-input"
                required
              />
            </div>
            <p v-if="pwError" class="admin-error-msg">{{ pwError }}</p>
            <div class="admin-modal-actions">
              <button
                type="button"
                class="admin-btn-secondary"
                @click="showChangePassword = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button
                type="submit"
                class="admin-btn-primary"
                :disabled="pwSaving"
              >
                {{ pwSaving ? "..." : $t("admin.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const route = useRoute();
const { locale, setLocale, t } = useI18n();
const { show: showToast } = useToast();

const currentUser = ref(null);
const sidebarCollapsed = ref(false);
const showChangePassword = ref(false);
const pwForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const pwError = ref("");
const pwSaving = ref(false);
const registerRefLink = computed(() => {
  if (!currentUser.value?.ref_code) return "";
  if (import.meta.client) {
    return `${window.location.origin}/register?ref=${currentUser.value.ref_code}`;
  }
  return `/register?ref=${currentUser.value.ref_code}`;
});

onMounted(async () => {
  if (import.meta.client) {
    try {
      const stored = window.localStorage.getItem("admin_sidebar_collapsed");
      if (stored === "1") sidebarCollapsed.value = true;
    } catch {}
  }
  try {
    const res = await $fetch("/api/auth/me");
    if (res?.success && res.user) {
      currentUser.value = res.user;
      if (res.user.contact_info) {
        contactInfo.value = String(res.user.contact_info || "");
      }
    }
  } catch {
    currentUser.value = null;
  }
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  if (import.meta.client) {
    try {
      window.localStorage.setItem(
        "admin_sidebar_collapsed",
        sidebarCollapsed.value ? "1" : "0",
      );
    } catch {}
  }
}

async function submitChangePassword() {
  pwError.value = "";
  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = t("admin.passwordMismatch");
    return;
  }
  if (pwForm.newPassword.length < 6) {
    pwError.value =
      locale.value === "vi"
        ? "Mật khẩu mới tối thiểu 6 ký tự"
        : "New password must be at least 6 characters";
    return;
  }
  pwSaving.value = true;
  try {
    await $fetch("/api/auth/change-password", {
      method: "POST",
      body: {
        old_password: pwForm.oldPassword,
        new_password: pwForm.newPassword,
      },
    });
    showChangePassword.value = false;
    pwForm.oldPassword = "";
    pwForm.newPassword = "";
    pwForm.confirmPassword = "";
    showToast(
      locale.value === "vi"
        ? "Đổi mật khẩu thành công!"
        : "Password changed successfully!",
      "success",
    );
  } catch (e) {
    pwError.value = e?.data?.statusMessage || "Lỗi đổi mật khẩu";
  } finally {
    pwSaving.value = false;
  }
}

const pageTitle = computed(() => {
  const name = route.name?.toString() || "";
  if (name === "admin") return t("admin.dashboard");
  if (name.includes("users")) return t("admin.users");
  if (name.includes("orders")) return t("admin.orders");
  if (name.includes("deposits")) return t("admin.deposits");
  if (name.includes("products")) return t("admin.products");
  if (name.includes("services")) return t("admin.services");
  if (name.includes("revenue")) return t("admin.revenue");
  if (name.includes("ledger"))
    return t("admin.creditLedger") || "Sổ sao kê tín chỉ";
  if (name.includes("logs")) return t("admin.logs");
  return t("admin.profileName");
});

function logout() {
  const cookiesToClear = ["user_role"];
  for (const name of cookiesToClear) {
    const cookie = useCookie(name, { path: "/" });
    cookie.value = null;
  }
  if (import.meta.client) {
    document.cookie.split(";").forEach((c) => {
      const name = c.replace(/^ +/, "").split("=")[0];
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  }
  return navigateTo("/");
}

async function copyRegisterRefLink() {
  if (!registerRefLink.value) return;
  try {
    await navigator.clipboard.writeText(registerRefLink.value);
    showToast(
      locale.value === "vi"
        ? "Đã copy link giới thiệu đăng ký"
        : "Registration referral link copied",
      "success",
    );
  } catch {
    showToast(
      locale.value === "vi"
        ? "Không thể copy, vui lòng thử lại"
        : "Failed to copy link",
      "error",
    );
  }
}

async function saveContact() {
  if (savingContact.value) return;
  savingContact.value = true;
  contactSaved.value = false;
  try {
    await $fetch("/api/admin/profile/contact", {
      method: "POST",
      body: { contact: contactInfo.value },
    });
    contactSaved.value = true;
    if (currentUser.value) {
      currentUser.value.contact_info = contactInfo.value;
    }
    setTimeout(() => {
      contactSaved.value = false;
    }, 2000);
  } catch {
    showToast(
      locale.value === "vi"
        ? "Lưu thông tin liên hệ thất bại"
        : "Failed to save contact info",
      "error",
    );
  }
  savingContact.value = false;
}
</script>

<template>
  <div class="profile-page">
    <SiteHeader />

    <main class="profile-main">
      <section class="profile-card" v-if="!loading && user">
        <div class="profile-hero">
          <div class="profile-hero-grid">
            <div class="profile-identity">
              <div class="profile-avatar-wrap">
                <div class="profile-avatar">
                  <span>{{ profileDisplayName?.charAt(0)?.toUpperCase() }}</span>
                </div>
              </div>
              <h1 class="profile-name">{{ profileDisplayName }}</h1>
              <p v-if="user.email" class="profile-email">{{ user.email }}</p>
            </div>

            <div class="profile-balance-panel">
              <div class="profile-balance-block">
                <span class="profile-balance-label">{{
                  $t("profile.balanceLabel")
                }}</span>
                <p class="profile-balance-value">
                  {{ formatVnd(user.credit || 0) }}
                  <span class="profile-balance-unit">{{
                    $t("profile.pointsUnit")
                  }}</span>
                </p>
                <button
                  type="button"
                  class="btn-deposit"
                  @click="onDepositClick"
                >
                  <span class="btn-deposit-icon">⊕</span>
                  {{ $t("profile.depositButton") }}
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="profile-content-grid">
          <div class="profile-left-col">
            <div class="profile-customer-edit">
              <h3 class="profile-customer-title">Thông tin khách hàng</h3>
              <p class="profile-customer-subtitle">
                Để việc mua/bán diễn ra trơn tru và chúng tôi có thể liên hệ hỗ
                trợ kịp thời, vui lòng cập nhật 2 thông tin bên dưới.
              </p>
              <div class="profile-info">
                <div class="profile-field">
                  <span class="profile-label">Tên người dùng</span>
                  <input
                    v-model="profileInfoForm.display_name"
                    class="profile-input"
                    type="text"
                    placeholder="Nhập tên người dùng"
                  />
                </div>
                <div class="profile-field">
                  <span class="profile-label">Số điện thoại</span>
                  <input
                    v-model="profileInfoForm.phone"
                    class="profile-input"
                    type="tel"
                    inputmode="tel"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
              <p v-if="profileInfoError" class="profile-error-msg">
                {{ profileInfoError }}
              </p>
              <div class="profile-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="profileInfoSaving"
                  @click="resetProfileInfo"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="profileInfoSaving"
                  @click="saveProfileInfo"
                >
                  {{ profileInfoSaving ? "Đang lưu..." : "Lưu thông tin" }}
                </button>
              </div>
            </div>
          </div>

          <div class="profile-right-col">
            <div v-if="Number(user.credit || 0) <= 0" class="profile-tip">
              {{ $t("profile.tipNoPoints") }}
            </div>

            <div class="profile-stats">
              <div class="profile-stat-card">
                <span class="profile-stat-value">{{
                  quickStats.depositCount
                }}</span>
                <span class="profile-stat-label">{{
                  $t("profile.statsDeposits")
                }}</span>
              </div>
              <div class="profile-stat-card">
                <span class="profile-stat-value">{{ quickStats.orderCount }}</span>
                <span class="profile-stat-label">{{
                  $t("profile.statsOrders")
                }}</span>
              </div>
            </div>

            <div class="profile-section profile-actions-section">
              <h3 class="profile-section-title">
                {{ $t("profile.sectionActions") }}
              </h3>
              <div class="profile-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  @click="showHistoryModal = true"
                >
                  {{ $t("payment.history.title") }}
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  @click="showOrderHistoryModal = true"
                >
                  {{ $t("admin.orders") }}
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  @click="showCreditLedgerModal = true"
                >
                  {{ $t("admin.creditLedger") || "Sổ sao kê tín chỉ" }}
                </button>
                <button
                  type="button"
                  class="btn-primary"
                  @click="showChangePassword = true"
                >
                  {{ $t("admin.changePassword") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="loading" class="profile-card profile-card--plain">
        <p>{{ $t("auth.loading") || "Đang tải..." }}</p>
      </section>

      <section
        v-else
        class="profile-card profile-card--plain profile-card--error"
      >
        <p>
          {{
            errorMessage || $t("auth.unauthorized") || "Vui lòng đăng nhập lại"
          }}
        </p>
        <NuxtLink to="/login" class="btn-primary btn-full">
          {{ $t("auth.login") }}
        </NuxtLink>
      </section>
    </main>

    <!-- Modal đổi mật khẩu cho user -->
    <Teleport to="body">
      <div
        v-if="showChangePassword"
        class="profile-modal-overlay"
        @click.self="showChangePassword = false"
      >
        <div class="profile-modal">
          <h3 class="profile-modal-title">{{ $t("admin.changePassword") }}</h3>
          <form
            class="profile-modal-form"
            @submit.prevent="submitChangePassword"
          >
            <div class="profile-form-row">
              <label>{{ $t("admin.oldPassword") }}</label>
              <input
                v-model="pwForm.oldPassword"
                type="password"
                class="profile-input"
                required
              />
            </div>
            <div class="profile-form-row">
              <label>{{ $t("admin.newPassword") }}</label>
              <input
                v-model="pwForm.newPassword"
                type="password"
                class="profile-input"
                required
                minlength="6"
              />
            </div>
            <div class="profile-form-row">
              <label>{{ $t("admin.confirmPassword") }}</label>
              <input
                v-model="pwForm.confirmPassword"
                type="password"
                class="profile-input"
                required
              />
            </div>
            <p v-if="pwError" class="profile-error-msg">{{ pwError }}</p>
            <div class="profile-modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="showChangePassword = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button type="submit" class="btn-primary" :disabled="pwSaving">
                {{ pwSaving ? "..." : $t("admin.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal hoàn thiện thông tin để nạp tiền -->
    <Teleport to="body">
      <div
        v-if="showProfileInfoModal"
        class="profile-modal-overlay"
        @click.self="showProfileInfoModal = false"
      >
        <div class="profile-modal">
          <h3 class="profile-modal-title">
            Thông tin để hỗ trợ mua bán tốt hơn
          </h3>
          <p class="profile-modal-desc">
            Để việc mua/bán của bạn diễn ra trơn tru và chúng tôi có thể liên hệ
            hỗ trợ kịp thời, phục vụ tốt hơn cho bạn, vui lòng cho biết các
            thông tin sau trước khi thực hiện nạp tiền:
          </p>
          <form
            class="profile-modal-form"
            @submit.prevent="saveProfileInfo({ continueDeposit: true })"
          >
            <div class="profile-form-row">
              <label>Tên người dùng</label>
              <input
                v-model="profileInfoForm.display_name"
                type="text"
                class="profile-input"
                required
              />
            </div>
            <div class="profile-form-row">
              <label>Số điện thoại</label>
              <input
                v-model="profileInfoForm.phone"
                type="tel"
                inputmode="tel"
                class="profile-input"
                required
              />
            </div>
            <p v-if="profileInfoError" class="profile-error-msg">
              {{ profileInfoError }}
            </p>
            <div class="profile-modal-actions">
              <button
                type="button"
                class="btn-secondary"
                :disabled="profileInfoSaving"
                @click="showProfileInfoModal = false"
              >
                Để sau
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="profileInfoSaving"
              >
                {{ profileInfoSaving ? "Đang lưu..." : "Lưu & Nạp tiền" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <PaymentModal
      :model-value="showDepositModal"
      @update:model-value="showDepositModal = $event"
      @success="onDepositSuccess"
    />

    <PaymentHistoryModal
      :model-value="showHistoryModal"
      @update:model-value="showHistoryModal = $event"
    />

    <OrderHistoryModal
      :model-value="showOrderHistoryModal"
      @update:model-value="showOrderHistoryModal = $event"
    />

    <CreditLedgerModal
      :model-value="showCreditLedgerModal"
      @update:model-value="showCreditLedgerModal = $event"
    />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import SiteHeader from "~/components/SiteHeader.vue";
const PaymentModal = defineAsyncComponent(
  () => import("~/components/payment/PaymentModal.vue"),
);
const PaymentHistoryModal = defineAsyncComponent(
  () => import("~/components/payment/PaymentHistoryModal.vue"),
);
const OrderHistoryModal = defineAsyncComponent(
  () => import("~/components/OrderHistoryModal.vue"),
);
const CreditLedgerModal = defineAsyncComponent(
  () => import("~/components/CreditLedgerModal.vue"),
);
const { t, locale, setLocale } = useI18n();
const { show: showToast } = useToast();

const user = ref(null);
const loading = ref(true);
const errorMessage = ref("");
const showDepositModal = ref(false);
const showProfileInfoModal = ref(false);
const showHistoryModal = ref(false);
const showOrderHistoryModal = ref(false);
const showCreditLedgerModal = ref(false);
const quickStats = reactive({
  depositCount: 0,
  orderCount: 0,
});

const showChangePassword = ref(false);
const pwForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const pwError = ref("");
const pwSaving = ref(false);

// Thông tin khách hàng (dùng để hỗ trợ nhanh hơn)
const profileInfoForm = reactive({
  display_name: "",
  phone: "",
});
const profileInfoSaving = ref(false);
const profileInfoError = ref("");

const profileDisplayName = computed(() => {
  const u = user.value || {};
  const dn = String(u?.display_name ?? "").trim();
  return dn || String(u?.username ?? "");
});

const isProfileInfoComplete = computed(() => {
  const dn = String(user.value?.display_name ?? "").trim();
  const ph = String(user.value?.phone ?? "").trim();
  return !!dn && !!ph;
});

function syncProfileInfoFormFromUser() {
  profileInfoForm.display_name = String(user.value?.display_name ?? "");
  profileInfoForm.phone = String(user.value?.phone ?? "");
  profileInfoError.value = "";
}

function resetProfileInfo() {
  syncProfileInfoFormFromUser();
}

async function saveProfileInfo(opts) {
  const continueDeposit = !!opts?.continueDeposit;
  profileInfoError.value = "";

  const display_name = String(profileInfoForm.display_name ?? "").trim();
  const phone = String(profileInfoForm.phone ?? "").trim();
  if (!display_name) {
    profileInfoError.value = "Vui lòng nhập tên người dùng.";
    return;
  }
  if (!phone) {
    profileInfoError.value = "Vui lòng nhập số điện thoại.";
    return;
  }

  profileInfoSaving.value = true;
  try {
    await $fetch("/api/auth/update-profile", {
      method: "POST",
      body: { display_name, phone },
    });

    await loadProfile({ silent: true });
    showToast("Đã lưu thông tin thành công!", "success");

    if (continueDeposit) {
      showProfileInfoModal.value = false;
      showDepositModal.value = true;
    }
  } catch (e) {
    profileInfoError.value =
      e?.data?.statusMessage ||
      e?.data?.message ||
      "Lưu thất bại, vui lòng thử lại.";
  } finally {
    profileInfoSaving.value = false;
  }
}

function onDepositClick() {
  if (isProfileInfoComplete.value) {
    showDepositModal.value = true;
    return;
  }
  profileInfoError.value = "";
  showProfileInfoModal.value = true;
}

async function loadProfile(opts) {
  const silent = !!opts?.silent;
  if (!silent) loading.value = true;
  try {
    const data = await $fetch("/api/auth/me");
    if (data?.success && data.user) {
      user.value = data.user;
      syncProfileInfoFormFromUser();
    } else {
      if (!silent)
        errorMessage.value = t("auth.unauthorized") || "Vui lòng đăng nhập lại";
    }
  } catch (e) {
    if (!silent) {
      errorMessage.value =
        e?.data?.statusMessage ||
        t("auth.unauthorized") ||
        "Vui lòng đăng nhập lại";
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

async function loadQuickStats() {
  try {
    const [depositRes, orderRes] = await Promise.all([
      $fetch("/api/payment/history"),
      $fetch("/api/orders/my"),
    ]);
    quickStats.depositCount = Array.isArray(depositRes?.data)
      ? depositRes.data.length
      : 0;
    quickStats.orderCount = Array.isArray(orderRes?.data)
      ? orderRes.data.length
      : 0;
  } catch {
    quickStats.depositCount = 0;
    quickStats.orderCount = 0;
  }
}

onMounted(async () => {
  await loadProfile({});
  await loadQuickStats();
  useAutoRefresh(
    async () => {
      if (!user.value) return;
      await loadProfile({ silent: true });
      await loadQuickStats();
    },
    { intervalMs: 20000, pauseWhenHidden: true },
  );
});

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function onDepositSuccess(payload) {
  if (user.value) {
    user.value.credit = payload?.newCredit ?? user.value.credit;
  }
  await loadProfile();
  await loadQuickStats();
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
</script>

<style scoped>
.profile-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.profile-page .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 150px;
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.3);
  color: var(--text-primary);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 20px rgb(var(--accent-rgb) / 0.08),
    0 1px 0 rgb(var(--accent-rgb) / 0.15);
}

.profile-page .logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.profile-page .logo-img {
  height: 56px;
  width: auto;
  display: block;
  object-fit: contain;
}

.profile-page .nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-page .nav-links a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 18px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 8px;
  transition: var(--transition-fast);
  letter-spacing: 0.01em;
}

.profile-page .nav-links a:hover {
  color: var(--blue-bright);
  color: var(--text-primary);
  text-shadow:
    0 0 15px var(--blue-glow),
    0 0 30px rgb(var(--accent-rgb) / 0.4);
}

.profile-page .auth-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-page .lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
}

.profile-page .lang-btn {
  color: var(--text-primary);
  border: none;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: var(--transition-fast);
}

.profile-page .lang-btn:hover {
  color: var(--text-primary);
}

.profile-page .lang-btn.active {
  color: var(--blue-bright);
  text-shadow:
    0 0 12px var(--blue-glow),
    0 0 25px rgb(var(--accent-rgb) / 0.5);
}

.profile-page .lang-sep {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
  user-select: none;
}

.profile-page .btn-login,
.profile-page .btn-primary,
.profile-page .btn-secondary {
  padding: 10px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: var(--transition-fast);
}

.profile-page .btn-login {
  color: var(--text-primary);
  color: var(--text-primary);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  box-shadow: 0 0 15px rgb(var(--accent-rgb) / 0.2);
}

.profile-page .btn-login:hover {
  border-color: var(--blue-bright);
  color: var(--text-primary);
  color: var(--blue-bright);
  box-shadow:
    0 0 25px var(--blue-glow),
    0 0 50px rgb(var(--accent-rgb) / 0.25);
}

.profile-page .user-dropdown {
  position: relative;
}

.profile-page .btn-user-name {
  color: var(--text-primary);
  color: var(--text-primary);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.profile-page .btn-user-name:hover {
  border-color: var(--blue-bright);
  color: var(--text-primary);
  color: var(--blue-bright);
}

.profile-page .user-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 140px;
  color: var(--text-primary);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: visible;
  z-index: 100;
}

.profile-page .user-dropdown-menu::before {
  content: "";
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 8px;
}

.profile-page .dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  color: var(--text-primary);
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.profile-page .dropdown-item:hover {
  color: var(--text-primary);
  color: var(--blue-bright);
}

.profile-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 1rem 2rem;
}

.profile-card {
  width: 100%;
  max-width: 980px;
  color: var(--text-primary);
  border-radius: 1.25rem;
  padding: 0;
  background: rgba(5, 15, 35, 0.96);
  box-shadow: var(--neon-shadow);
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
  overflow: hidden;
}

.profile-hero {
  padding: 2rem 1.75rem 1.75rem;
  text-align: center;
  background: linear-gradient(
    180deg,
    rgb(var(--accent-rgb) / 0.12) 0%,
    transparent 70%
  );
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.15);
}

.profile-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: center;
}

.profile-identity {
  text-align: center;
}

.profile-balance-panel {
  display: flex;
  justify-content: center;
}

.profile-balance-panel .profile-balance-block {
  width: 100%;
  max-width: none;
}

.profile-content-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 1rem;
  padding: 1.25rem 1.75rem 1.75rem;
  align-items: start;
}

.profile-left-col {
  min-width: 0;
}

.profile-right-col {
  min-width: 0;
}

.profile-actions-section {
  border-top: none;
  padding-top: 0;
}

.profile-right-col .profile-tip {
  margin: 0 0 1rem;
}

.profile-right-col .profile-stats {
  padding: 0;
  margin-bottom: 1rem;
}

.profile-avatar-wrap {
  margin-bottom: 1rem;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 999px;
  border: 2px solid rgb(var(--accent-rgb) / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.75rem;
  color: var(--blue-electric);
  background: rgb(var(--accent-rgb) / 0.08);
  box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.2);
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  letter-spacing: 0.02em;
}

.profile-email {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.profile-balance-block {
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
  background: rgba(0, 20, 50, 0.6);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
}

.profile-balance-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.profile-balance-value {
  margin: 0 0 1rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.02em;
}

.profile-balance-unit {
  margin-left: 0.35rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
}

.btn-deposit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.9rem 1.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
  box-shadow:
    0 4px 20px rgba(16, 185, 129, 0.4),
    0 0 30px rgba(16, 185, 129, 0.15);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.btn-deposit:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 28px rgba(16, 185, 129, 0.5),
    0 0 40px rgba(16, 185, 129, 0.2);
}

.btn-deposit-icon {
  font-size: 1.35rem;
  line-height: 1;
  opacity: 0.95;
}

.profile-tip {
  margin: 1rem 1.5rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(250, 204, 21, 0.35);
  background: rgba(250, 204, 21, 0.08);
  color: #fde68a;
  font-size: 0.88rem;
  line-height: 1.45;
}

.profile-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.profile-stat-card {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
  background: rgb(var(--accent-rgb) / 0.04);
  text-align: center;
}

.profile-stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--blue-electric);
  margin-bottom: 0.2rem;
}

.profile-stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-section {
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.profile-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-field {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  font-size: 0.95rem;
}

.profile-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-value {
  font-weight: 500;
  color: var(--text-primary);
}

.profile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
}

.profile-actions .btn-secondary,
.profile-actions .btn-primary {
  width: 100%;
  min-width: 0;
}

@media (max-width: 480px) {
  .profile-main {
    padding-top: 80px;
  }
  .profile-hero {
    padding: 1.5rem 1.25rem 1.25rem;
  }

  .profile-hero-grid {
    grid-template-columns: 1fr;
  }
  .profile-balance-value {
    font-size: 1.5rem;
  }
  .profile-stats,
  .profile-section {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
  .profile-content-grid {
    grid-template-columns: 1fr;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
  .profile-field {
    grid-template-columns: 1fr;
  }
  .profile-label {
    margin-bottom: 0.25rem;
  }
}

.profile-customer-edit {
  margin-top: 0;
  padding: 1.1rem 1.25rem;
  text-align: left;
  border-radius: 1rem;
  background: rgba(2, 132, 199, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.profile-customer-title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 700;
}

.profile-customer-subtitle {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.45;
}

.profile-modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1rem;
  line-height: 1.5;
}

.profile-card--plain {
  padding: 2rem 1.5rem;
}

.profile-card--error {
  text-align: center;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: var(--transition-fast);
}

.btn-primary {
  background-image: var(--btn-primary-bg);
  color: #fff;
  box-shadow: var(--btn-primary-glow);
}

.btn-primary:hover {
  transform: translateY(-1px);
}

.btn-secondary {
  color: var(--text-primary);
  color: var(--text-secondary);
  border-color: var(--btn-secondary-border);
}

.btn-secondary:hover {
  border-color: var(--blue-electric);
  color: #fff;
}

.btn-full {
  width: 100%;
  margin-top: 1rem;
}

.profile-modal-overlay {
  position: fixed;
  inset: 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(8px);
}

.profile-modal {
  width: 100%;
  max-width: 420px;
  color: var(--text-primary);
  background: rgba(5, 15, 35, 0.98);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  border-radius: 1rem;
  padding: 1.75rem;
  box-shadow: var(--neon-shadow);
}

.profile-modal-title {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.profile-modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile-form-row label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.profile-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid var(--input-border);
  /* Input ở trang profile dùng nền sáng, nên chữ phải là màu tối để đọc rõ */
  background: rgba(255, 255, 255, 0.96);
  color: #0b1220;
  caret-color: #0b1220;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.profile-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-glow);
  color: #0b1220;
}

.profile-error-msg {
  color: #fca5a5;
  font-size: 0.85rem;
}

.profile-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>

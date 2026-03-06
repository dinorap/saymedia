<template>
  <div class="profile-page">
    <SiteHeader />

    <main class="profile-main">
      <section class="profile-card" v-if="!loading && user">
        <div class="profile-card-header">
          <div class="profile-avatar">
            <span>{{ user.username?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <div>
            <h2 class="profile-card-title">{{ user.username }}</h2>
            <p v-if="user.email" class="profile-subtitle">
              {{ user.email }}
            </p>
          </div>
        </div>

        <div class="profile-grid">
          <div class="profile-info">
            <p class="profile-field">
              <span class="profile-label">{{ $t("admin.username") }}</span>
              <span class="profile-value">{{ user.username }}</span>
            </p>
            <p v-if="user.email" class="profile-field">
              <span class="profile-label">{{ $t("admin.email") }}</span>
              <span class="profile-value">{{ user.email }}</span>
            </p>
          </div>

          <div class="profile-balance">
            <p class="profile-balance-label">Số dư hiện tại</p>
            <p class="profile-balance-value">
              {{ formatVnd(user.credit || 0) }}
              <span class="profile-balance-unit">điểm</span>
            </p>
          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat-card">
            <p class="profile-stat-label">Lượt nạp gần đây</p>
            <p class="profile-stat-value">{{ quickStats.depositCount }}</p>
          </div>
          <div class="profile-stat-card">
            <p class="profile-stat-label">Đơn hàng của bạn</p>
            <p class="profile-stat-value">{{ quickStats.orderCount }}</p>
          </div>
        </div>

        <div v-if="Number(user.credit || 0) <= 0" class="profile-tip">
          Bạn chưa có điểm. Hãy nạp tiền để bắt đầu sử dụng dịch vụ nhanh hơn.
        </div>

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
            @click="showDepositModal = true"
          >
            Nạp tiền
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
      </section>

      <section v-else-if="loading" class="profile-card">
        <p>{{ $t("auth.loading") || "Đang tải..." }}</p>
      </section>

      <section v-else class="profile-card profile-card--error">
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
import { useI18n } from "vue-i18n";
import SiteHeader from "~/components/SiteHeader.vue";
import PaymentModal from "~/components/payment/PaymentModal.vue";
import PaymentHistoryModal from "~/components/payment/PaymentHistoryModal.vue";
import OrderHistoryModal from "~/components/OrderHistoryModal.vue";
import CreditLedgerModal from "~/components/CreditLedgerModal.vue";
const { t, locale, setLocale } = useI18n();
const { show: showToast } = useToast();

const user = ref(null);
const loading = ref(true);
const errorMessage = ref("");
const showDepositModal = ref(false);
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

async function loadProfile() {
  try {
    const data = await $fetch("/api/auth/me");
    if (data?.success && data.user) {
      user.value = data.user;
    } else {
      errorMessage.value = t("auth.unauthorized") || "Vui lòng đăng nhập lại";
    }
  } catch (e) {
    errorMessage.value =
      e?.data?.statusMessage ||
      t("auth.unauthorized") ||
      "Vui lòng đăng nhập lại";
  } finally {
    loading.value = false;
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
  await loadProfile();
  await loadQuickStats();
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
  border-bottom: 1px solid rgba(1, 123, 251, 0.3);
  color: var(--text-primary);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 20px rgba(1, 123, 251, 0.08),
    0 1px 0 rgba(1, 123, 251, 0.15);
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
    0 0 30px rgba(1, 123, 251, 0.4);
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
    0 0 25px rgba(1, 123, 251, 0.5);
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
  border: 1px solid rgba(1, 123, 251, 0.5);
  box-shadow: 0 0 15px rgba(1, 123, 251, 0.2);
}

.profile-page .btn-login:hover {
  border-color: var(--blue-bright);
  color: var(--text-primary);
  color: var(--blue-bright);
  box-shadow:
    0 0 25px var(--blue-glow),
    0 0 50px rgba(1, 123, 251, 0.25);
}

.profile-page .user-dropdown {
  position: relative;
}

.profile-page .btn-user-name {
  color: var(--text-primary);
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.5);
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
  border: 1px solid rgba(1, 123, 251, 0.45);
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
  padding: 2rem 1rem;
}

.profile-card {
  width: 100%;
  max-width: 560px;
  color: var(--text-primary);
  border-radius: 1rem;
  padding: 2rem;
   background: rgba(5, 15, 35, 0.96);
  box-shadow: var(--neon-shadow);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.profile-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--blue-electric);
}

.profile-card-title {
  font-size: 1.25rem;
  margin: 0;
}

.profile-subtitle {
  margin-top: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.5rem;
  align-items: stretch;
}

@media (max-width: 640px) {
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.profile-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-value {
  font-weight: 500;
}

.profile-balance {
  padding: 0.8rem 1rem;
  border-radius: 0.9rem;
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.profile-balance-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin: 0 0 0.25rem;
}

.profile-balance-value {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.profile-balance-unit {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-stats {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.profile-stat-card {
  border: 1px solid rgba(1, 123, 251, 0.25);
  color: var(--text-primary);
  border-radius: 0.75rem;
  padding: 0.7rem 0.9rem;
}

.profile-stat-label {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.profile-stat-value {
  margin: 0.25rem 0 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-tip {
  margin-top: 0.9rem;
  padding: 0.65rem 0.85rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(250, 204, 21, 0.35);
  color: var(--text-primary);
  color: #fde68a;
  font-size: 0.86rem;
}

.profile-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
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
}

.profile-modal {
  width: 100%;
  max-width: 420px;
  color: var(--text-primary);
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
  color: var(--text-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.profile-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-glow);
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

<template>
  <div class="profile-page">
    <header class="profile-header">
      <NuxtLink to="/" class="profile-logo">
        <img src="/logo.png" alt="SayMedia AI" class="profile-logo-img" />
      </NuxtLink>
      <h1 class="profile-title">{{ $t("auth.profile") }}</h1>
      <NuxtLink to="/" class="profile-back"> ← {{ $t("nav.home") }} </NuxtLink>
    </header>

    <main class="profile-main">
      <section class="profile-card" v-if="!loading && user">
        <h2 class="profile-card-title">{{ $t("auth.profile") }}</h2>
        <p class="profile-field">
          <strong>{{ $t("admin.username") }}:</strong>
          <span>{{ user.username }}</span>
        </p>
        <p v-if="user.email" class="profile-field">
          <strong>{{ $t("admin.email") }}:</strong>
          <span>{{ user.email }}</span>
        </p>

        <div class="profile-actions">
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
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n();
const { show: showToast } = useToast();

const user = ref(null);
const loading = ref(true);
const errorMessage = ref("");

const showChangePassword = ref(false);
const pwForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const pwError = ref("");
const pwSaving = ref(false);

onMounted(async () => {
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
});

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
      "success"
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top, rgba(1, 123, 251, 0.2), transparent),
    var(--bg-deep);
  color: var(--text-primary);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: var(--bg-nav);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-logo-img {
  height: 32px;
}

.profile-title {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.profile-back {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
}

.profile-back:hover {
  color: var(--blue-electric);
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
  max-width: 480px;
  background: var(--bg-card);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: var(--neon-shadow);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.profile-card-title {
  font-size: 1.3rem;
  margin-bottom: 1rem;
}

.profile-field {
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.profile-field strong {
  display: inline-block;
  min-width: 120px;
  color: var(--text-secondary);
}

.profile-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
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
  background: transparent;
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
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.profile-modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
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
  background: var(--input-bg);
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

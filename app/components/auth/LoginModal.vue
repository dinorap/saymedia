<template>
  <AuthModal :model-value="modelValue" :standalone="standalone" @update:model-value="$emit('update:modelValue', $event)">
    <div class="auth-form">
      <h1 class="auth-form-title">{{ $t("auth.loginTitle") }}</h1>

      <div v-if="step === 1" class="auth-form-group">
        <label>{{ $t("auth.usernameOrEmail") }}</label>
        <input
          v-model="username"
          type="text"
          class="auth-input"
          :placeholder="$t('auth.usernameOrEmail')"
          autocomplete="username"
          @keyup.enter="loginWithPassword"
        />
        <label>{{ $t("auth.password") }}</label>
        <AuthPasswordInput
          v-model="password"
          :placeholder="$t('auth.password')"
          autocomplete="current-password"
          @enter="loginWithPassword"
        />
        <div class="auth-form-options">
          <button type="button" class="auth-link-btn" @click="showForgot = true">{{ $t("auth.forgotPassword") }}</button>
        </div>
        <button
          type="button"
          class="auth-btn auth-btn-success"
          :disabled="loading || !username?.trim() || !password"
          @click="loginWithPassword"
        >
          {{ loading ? $t("auth.processing") : $t("auth.loginButton") }}
        </button>
        <div class="auth-form-link">
          <span>{{ $t("auth.orLoginWithOtp") }}</span>
          <button type="button" class="auth-link-btn" @click="step = 2; email = ''; error = ''">{{ $t("auth.sendOtp") }}</button>
        </div>
        <div class="auth-form-link">
          <span>{{ $t("auth.noAccount") }}</span>
          <NuxtLink v-if="standalone" to="/register" class="auth-link">{{ $t("auth.register") }}</NuxtLink>
          <button v-else type="button" class="auth-link" @click="$emit('update:modelValue', false); $emit('switch-to-register')">{{ $t("auth.register") }}</button>
        </div>
      </div>

      <div v-else-if="step === 2" class="auth-form-group">
        <p class="auth-form-info">{{ $t("auth.emailForOtpDescription") }}</p>
        <label>Email</label>
        <input
          v-model="email"
          type="email"
          class="auth-input"
          placeholder="user@example.com"
          @keyup.enter="sendOtp"
        />
        <button
          type="button"
          class="auth-btn auth-btn-success"
          :disabled="loading || !email?.trim()"
          @click="sendOtp"
        >
          {{ loading ? $t("auth.sendingOtp") : $t("auth.sendOtp") }}
        </button>
        <button type="button" class="auth-link-btn" @click="step = 1">← {{ $t("auth.backToLogin") }}</button>
      </div>

      <div v-else class="auth-form-group auth-form-group-otp">
        <p class="auth-form-info">{{ $t("auth.otpSentTo") }} <b>{{ email }}</b>. {{ $t("auth.checkInbox") }}</p>
        <label for="login-otp">{{ $t("auth.enterOtpCode") }}</label>
        <input
          id="login-otp"
          v-model="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          class="auth-input auth-otp-input"
          :placeholder="$t('auth.enterOtpCode')"
          maxlength="6"
          @keyup.enter="verifyOtp"
        />
        <button
          type="button"
          class="auth-btn auth-btn-success"
          :disabled="loading || !otp?.trim()"
          @click="verifyOtp"
        >
          {{ loading ? $t("auth.processing") : $t("auth.confirmOtp") }}
        </button>
        <button type="button" class="auth-link-btn" @click="step = 2">← {{ $t("auth.changeEmail") }}</button>
      </div>

      <p v-if="error" class="auth-msg auth-msg-error">{{ error }}</p>
      <NuxtLink v-if="standalone" to="/" class="auth-back-link">← Về trang chủ</NuxtLink>
      <AuthForgotPasswordModal v-model:open="showForgot" />
    </div>
  </AuthModal>
</template>

<script setup>
import { defineAsyncComponent } from "vue";
const AuthModal = defineAsyncComponent(() => import("~/components/auth/AuthModal.vue"));
const AuthForgotPasswordModal = defineAsyncComponent(() => import("~/components/auth/AuthForgotPasswordModal.vue"));

defineProps({
  modelValue: { type: Boolean, default: false },
  standalone: { type: Boolean, default: false }
})
defineEmits(['update:modelValue', 'switch-to-register'])

const roleCookie = useCookie('user_role', { path: '/' })
const route = useRoute()
const step = ref(1)
const username = ref('')
const password = ref('')
const email = ref('')
const otp = ref('')
const loading = ref(false)
const error = ref('')
const showForgot = ref(false)

async function loginWithPassword() {
  if (!username.value?.trim() || !password.value) {
    error.value = 'Vui lòng nhập tên đăng nhập và mật khẩu!'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value.trim(), password: password.value }
    })
    roleCookie.value = res.role
    if (res.role === 'admin_0' || res.role === 'admin_1') {
      await navigateTo('/admin')
    } else {
      const next = typeof route.query.next === 'string' ? route.query.next : ''
      if (next && next.startsWith('/')) await navigateTo(next)
      else await navigateTo('/')
    }
  } catch (e) {
    error.value = e.data?.statusMessage || 'Sai thông tin đăng nhập!'
  } finally {
    loading.value = false
  }
}

async function sendOtp() {
  if (!email.value?.trim()) {
    error.value = 'Vui lòng nhập email!'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/send-otp-login', { method: 'POST', body: { email: email.value.trim() } })
    step.value = 3
    otp.value = ''
  } catch (e) {
    error.value = e.data?.statusMessage || 'Không gửi được OTP!'
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  if (!otp.value?.trim()) {
    error.value = 'Vui lòng nhập mã OTP!'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value.trim(), otp: otp.value.trim() }
    })
    roleCookie.value = res.role
    if (res.role === 'admin_0' || res.role === 'admin_1') {
      await navigateTo('/admin')
    } else {
      const next = typeof route.query.next === 'string' ? route.query.next : ''
      if (next && next.startsWith('/')) await navigateTo(next)
      else await navigateTo('/')
    }
  } catch (e) {
    error.value = e.data?.statusMessage || 'Mã OTP không đúng hoặc hết hạn!'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form-title { text-align: center; color: #fff; margin: 0 0 1.5rem 0; font-size: 1.8rem; font-weight: 700; }
.auth-form { display: flex; flex-direction: column; gap: 0.8rem; }
.auth-form :deep(.auth-modal-card),
.auth-form {
  border-radius: 14px;
}
.auth-form-group { display: flex; flex-direction: column; gap: 0.8rem; }
.auth-form-group label { font-weight: 600; font-size: 0.9rem; color: #cbd5e1; margin: 0; }
.auth-input { width: 100%; padding: 12px 15px; border: 1px solid #475569; border-radius: 10px; font-size: 1rem; box-sizing: border-box; background: #0f172a; color: #fff; }
.auth-input::placeholder { color: #64748b; }
.auth-input:focus { outline: none; border-color: var(--blue-bright, #00d2ff); box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2); }
.auth-form-group-otp { margin-top: 0.5rem; }
.auth-otp-input { text-align: center; letter-spacing: 4px; font-size: 1.2rem; min-height: 48px; }
.auth-form-options { display: flex; justify-content: flex-end; }
.auth-btn { padding: 12px; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
.auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-btn-success { background: linear-gradient(90deg, #00c6ff, #0072ff); color: #fff; width: 100%; box-shadow: 0 4px 15px rgba(0, 114, 255, 0.4); }
.auth-btn-success:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 114, 255, 0.6); }
.auth-form-link { text-align: center; margin-top: 0.5rem; font-size: 0.9rem; color: #cbd5e1; }
.auth-link-btn { background: none; border: none; color: var(--blue-bright, #00d2ff); font-size: 0.9rem; cursor: pointer; padding: 4px 8px; }
.auth-link-btn:hover { text-decoration: underline; }
.auth-link { background: none; border: none; color: var(--blue-bright, #00d2ff); font-weight: 600; cursor: pointer; padding: 0; margin-left: 0.5rem; text-decoration: none; }
.auth-link:hover { text-decoration: underline; }
.auth-form-info { text-align: center; color: #cbd5e1; margin: 0; }
.auth-form-info b { color: var(--blue-bright, #00d2ff); }
.auth-msg { margin-top: 1rem; font-size: 0.9rem; padding: 0.75rem; border-radius: 6px; }
.auth-msg-error { color: #f87171; text-align: center; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); }
.auth-back-link { display: inline-block; margin-top: 1rem; color: var(--blue-bright, #00d2ff); font-size: 0.9rem; text-decoration: none; }
.auth-back-link:hover { text-decoration: underline; }

.auth-form-group label,
.auth-form-info,
.auth-form-link {
  letter-spacing: 0.01em;
}

@media (max-width: 640px) {
  .auth-form-title { font-size: 1.35rem; margin-bottom: 0.8rem; }
  .auth-form-group { gap: 0.65rem; }
  .auth-input { padding: 10px 12px; font-size: 0.95rem; }
  .auth-btn { padding: 10px; font-size: 0.95rem; }
  .auth-form-link { font-size: 0.84rem; }
  .auth-msg { margin-top: 0.5rem; font-size: 0.82rem; }
}
</style>

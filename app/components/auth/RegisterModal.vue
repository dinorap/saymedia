<template>
  <AuthModal
    :model-value="modelValue"
    :standalone="standalone"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="auth-form">
      <h1 class="auth-form-title">Đăng ký</h1>

      <div class="auth-form-group">
        <label>Tên đăng nhập</label>
        <input
          v-model="form.username"
          type="text"
          class="auth-input"
          placeholder="Tên đăng nhập"
        />
        <label>Email</label>
        <input
          v-model="form.email"
          type="email"
          class="auth-input"
          placeholder="user@example.com"
        />
        <label>Mật khẩu</label>
        <AuthPasswordInput
          v-model="form.password"
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
        />
        <label>Xác nhận mật khẩu</label>
        <AuthPasswordInput
          v-model="form.confirmPassword"
          placeholder="Xác nhận mật khẩu"
        />
        <button
          type="button"
          class="auth-btn auth-btn-success"
          :disabled="loading || !canSend"
          @click="register"
        >
          {{ loading ? "Đang xử lý..." : "Đăng ký" }}
        </button>
        <div class="auth-form-link">
          <span>Đã có tài khoản?</span>
          <NuxtLink v-if="standalone" to="/login" class="auth-link"
            >Đăng nhập</NuxtLink
          >
          <button
            v-else
            type="button"
            class="auth-link"
            @click="
              $emit('update:modelValue', false);
              $emit('switch-to-login');
            "
          >
            Đăng nhập
          </button>
        </div>
      </div>

      <p v-if="success" class="auth-msg auth-msg-success">{{ success }}</p>
      <p v-if="error" class="auth-msg auth-msg-error">{{ error }}</p>
      <NuxtLink v-if="standalone" to="/" class="auth-back-link"
        >← Về trang chủ</NuxtLink
      >
    </div>
  </AuthModal>
</template>

<script setup>
import { defineAsyncComponent } from "vue";
const AuthModal = defineAsyncComponent(() => import("~/components/auth/AuthModal.vue"));

defineProps({
  modelValue: { type: Boolean, default: false },
  standalone: { type: Boolean, default: false },
})
defineEmits(["update:modelValue", "switch-to-login"])

const form = ref({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
})
const loading = ref(false)
const success = ref("")
const error = ref("")

const canSend = computed(() => {
  const { username, email, password, confirmPassword } = form.value
  return (
    username?.trim() &&
    email?.trim() &&
    password.length >= 6 &&
    password === confirmPassword
  )
})

async function register() {
  if (!canSend.value) return
  loading.value = true
  error.value = ""
  success.value = ""
  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: form.value.username.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
      },
    })
    success.value = "Đăng ký thành công! Hãy đăng nhập để bắt đầu sử dụng."
    setTimeout(() => navigateTo("/login?next=/profile"), 1200)
  } catch (e) {
    error.value = e.data?.statusMessage || "Đăng ký thất bại!"
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form-title {
  text-align: center;
  color: #fff;
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
  font-weight: 700;
}
.auth-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.auth-form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #cbd5e1;
  margin: 0;
}
.auth-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #475569;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
  background: #0f172a;
  color: #fff;
}
.auth-input::placeholder {
  color: #64748b;
}
.auth-input:focus {
  outline: none;
  border-color: var(--blue-bright, #00d2ff);
  box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
}
.auth-btn {
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}
.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-btn-success {
  background: linear-gradient(90deg, #00c6ff, #0072ff);
  color: #fff;
  width: 100%;
  box-shadow: 0 4px 15px rgba(0, 114, 255, 0.4);
}
.auth-btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 114, 255, 0.6);
}
.auth-form-link {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #cbd5e1;
}
.auth-link {
  background: none;
  border: none;
  color: var(--blue-bright, #00d2ff);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  text-decoration: none;
}
.auth-link:hover {
  text-decoration: underline;
}
.auth-msg {
  margin-top: 1rem;
  font-size: 0.9rem;
  padding: 0.75rem;
  border-radius: 6px;
}
.auth-msg-success {
  color: #4ade80;
  text-align: center;
  background: rgba(39, 174, 96, 0.2);
  border: 1px solid rgba(39, 174, 96, 0.5);
}
.auth-msg-error {
  color: #f87171;
  text-align: center;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
}
.auth-back-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--blue-bright, #00d2ff);
  font-size: 0.9rem;
  text-decoration: none;
}
.auth-back-link:hover {
  text-decoration: underline;
}
</style>

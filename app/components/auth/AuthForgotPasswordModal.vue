<template>
  <div v-if="open" class="auth-forgot-overlay" @click.self="$emit('update:open', false)">
    <div class="auth-forgot-card">
      <h2 class="auth-forgot-title">Quên mật khẩu</h2>
      <p class="auth-forgot-desc">Nhập email đăng ký để nhận mật khẩu mới.</p>
      <input
        v-model="email"
        type="email"
        class="auth-input auth-input-full"
        placeholder="Email"
        @keyup.enter="submit"
      />
      <div class="auth-forgot-actions">
        <button type="button" class="auth-btn auth-btn-secondary" @click="$emit('update:open', false)">
          Hủy
        </button>
        <button
          type="button"
          class="auth-btn auth-btn-primary"
          :disabled="loading || !email?.trim()"
          @click="submit"
        >
          {{ loading ? 'Đang gửi...' : 'Gửi mật khẩu mới' }}
        </button>
      </div>
      <p v-if="success" class="auth-msg auth-msg-success">{{ success }}</p>
      <p v-if="error" class="auth-msg auth-msg-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['update:open'])

const email = ref('')
const loading = ref(false)
const success = ref('')
const error = ref('')

async function submit() {
  if (!email.value?.trim()) return
  loading.value = true
  success.value = ''
  error.value = ''
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.value.trim() } })
    success.value = 'Đã gửi mật khẩu mới vào email. Vui lòng kiểm tra hộp thư.'
    email.value = ''
    setTimeout(() => {
      emit('update:open', false)
      success.value = ''
    }, 2000)
  } catch (e) {
    error.value = e.data?.statusMessage || 'Gửi thất bại. Thử lại sau!'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-forgot-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  padding: 1rem;
}

.auth-forgot-card {
  background: var(--bg-card, #1e293b);
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-forgot-title {
  margin: 0 0 0.5rem 0;
  color: #fff;
  font-size: 1.25rem;
}

.auth-forgot-desc {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: #cbd5e1;
}

.auth-forgot-card .auth-input,
.auth-forgot-card .auth-input-full {
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 0;
  font-size: 1rem;
  color: #fff;
  background: #0f172a;
  border: 1px solid #475569;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.auth-forgot-card .auth-input::placeholder {
  color: #64748b;
}

.auth-forgot-card .auth-input:focus {
  outline: none;
  border-color: var(--blue-bright, #00d2ff);
  box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
}

.auth-forgot-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.auth-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.auth-btn-primary {
  background: linear-gradient(90deg, #00c6ff, #0072ff);
  color: #fff;
  box-shadow: 0 4px 15px rgba(0, 114, 255, 0.4);
}

.auth-msg {
  margin: 1rem 0 0 0;
  font-size: 0.9rem;
  padding: 0.75rem;
  border-radius: 6px;
}

.auth-msg-success {
  color: #4ade80;
  background: rgba(39, 174, 96, 0.2);
  border: 1px solid rgba(39, 174, 96, 0.5);
}

.auth-msg-error {
  color: #f87171;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
}
</style>

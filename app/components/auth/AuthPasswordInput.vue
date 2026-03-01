<template>
  <div class="auth-password-wrapper">
    <input
      :value="modelValue"
      :type="show ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="auth-input"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      type="button"
      class="auth-eye-btn"
      :aria-label="show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
      @click="show = !show"
    >
      <svg v-if="!show" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Mật khẩu' },
  autocomplete: { type: String, default: 'off' }
})

defineEmits(['update:modelValue'])

const show = ref(false)
</script>

<style scoped>
.auth-password-wrapper {
  position: relative;
}

.auth-password-wrapper .auth-input {
  padding-right: 45px;
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
  transition: border-color 0.3s;
}

.auth-input::placeholder {
  color: #64748b;
}

.auth-input:focus {
  outline: none;
  border-color: var(--blue-bright, #00d2ff);
  box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
}

.auth-eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-eye-btn:hover {
  color: var(--blue-bright, #00d2ff);
}
</style>

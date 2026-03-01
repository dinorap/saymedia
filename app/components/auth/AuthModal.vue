<template>
  <!-- Standalone: dùng trên trang /login, /register (chỉ card, không overlay) -->
  <template v-if="standalone">
    <div class="auth-modal-card auth-modal-card--standalone">
      <slot />
    </div>
  </template>
  <!-- Modal: overlay + teleport (dùng từ landing hoặc nơi khác) -->
  <Teleport v-else to="body">
    <div
      v-if="modelValue"
      class="auth-modal-overlay"
      @click="handleOverlayClick"
    >
      <div class="auth-modal-container">
        <div class="auth-modal-card">
          <button
            type="button"
            class="auth-modal-close"
            aria-label="Đóng"
            @click="$emit('update:modelValue', false)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  /** true = chỉ render card (dùng trong trang /login, /register) */
  standalone: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function handleOverlayClick(event) {
  if (!(event.target instanceof HTMLElement)) return
  if (!event.target.closest('.auth-modal-card')) {
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.auth-modal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.auth-modal-card {
  background: var(--bg-card, #1e293b);
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 500px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.auth-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 10;
  transition: all 0.2s ease;
}

.auth-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: scale(1.05);
}

.auth-modal-close svg {
  width: 18px;
  height: 18px;
}

.auth-modal-card--standalone {
  margin: 0 auto;
}
</style>

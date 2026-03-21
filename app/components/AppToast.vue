<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div v-if="toast.visible" class="toast-container">
        <div :class="['toast', `toast--${toast.type}`]">
          <div class="toast-icon" aria-hidden="true">
            <span v-if="toast.type === 'success'">✓</span>
            <span v-else-if="toast.type === 'error'">!</span>
            <span v-else>ℹ</span>
          </div>
          <p class="toast-message">
            {{ toast.message }}
          </p>
          <button type="button" class="toast-close" @click="hide">
            ×
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
const { toast, hide } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  min-width: 260px;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  background: radial-gradient(circle at top left, rgb(var(--accent-rgb) / 0.25), transparent),
    var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--neon-shadow);
  color: var(--text-primary);
  backdrop-filter: blur(16px);
}

.toast--success {
  border-color: rgba(34, 197, 94, 0.7);
  box-shadow: 0 0 18px rgba(34, 197, 94, 0.45), 0 0 32px rgba(34, 197, 94, 0.25);
}

.toast--error {
  border-color: rgba(248, 113, 113, 0.7);
  box-shadow: 0 0 18px rgba(248, 113, 113, 0.45), 0 0 32px rgba(248, 113, 113, 0.25);
}

.toast--info {
  border-color: var(--blue-border);
}

.toast-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  background: var(--blue-soft);
  color: #fff;
}

.toast--success .toast-icon {
  background: rgba(34, 197, 94, 0.2);
}

.toast--error .toast-icon {
  background: rgba(248, 113, 113, 0.2);
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 0.1rem;
}

.toast-close:hover {
  color: #fff;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .toast-container {
    right: 0.75rem;
    left: 0.75rem;
    bottom: 0.75rem;
  }
  .toast {
    min-width: 0;
    max-width: 100%;
    padding: 0.75rem 0.8rem;
    gap: 0.6rem;
  }
  .toast-message {
    font-size: 0.84rem;
  }
}
</style>


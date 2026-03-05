<template>
  <Teleport to="body">
    <div v-if="state.visible" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-modal card">
        <h3 class="confirm-title">{{ state.title }}</h3>
        <p class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel" @click="onCancel">
            {{ state.cancelText }}
          </button>
          <button type="button" class="btn-confirm" @click="onConfirm">
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const { state, resolveConfirm } = useConfirm();

function onCancel() {
  resolveConfirm(false);
}

function onConfirm() {
  resolveConfirm(true);
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.confirm-modal {
  width: min(460px, 95vw);
  padding: 1.25rem;
}
.confirm-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}
.confirm-message {
  margin: 0;
  white-space: pre-line;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.confirm-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.btn-cancel,
.btn-confirm {
  border-radius: 8px;
  padding: 0.45rem 1rem;
  cursor: pointer;
}
.btn-cancel {
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: var(--text-secondary);
  background: transparent;
}
.btn-confirm {
  border: 1px solid rgba(1, 123, 251, 0.5);
  background: rgba(1, 123, 251, 0.2);
  color: #fff;
}
</style>

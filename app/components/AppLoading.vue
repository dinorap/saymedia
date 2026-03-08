<template>
  <div class="app-loading">
    <span class="app-loading-spinner" aria-hidden="true"></span>
    <p class="app-loading-text">{{ message }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  message: { type: String, default: "" },
});
const { t } = useI18n();
const message = computed(
  () =>
    props.message ||
    t("admin.loading") ||
    t("auth.loading") ||
    "Đang tải..."
);
</script>

<style scoped>
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
}
.app-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(1, 123, 251, 0.25);
  border-top-color: var(--blue-bright, #017bfb);
  border-radius: 50%;
  animation: app-loading-spin 0.8s linear infinite;
}
.app-loading-text {
  margin: 0;
  font-size: 0.95rem;
}
@keyframes app-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <div v-if="visible" class="contact-bubble">
    <button type="button" class="bubble-btn" @click="open = !open">
      <span class="bubble-icon">💬</span>
    </button>
    <div v-if="open" class="bubble-panel">
      <div class="bubble-header">
        <span class="bubble-title">{{ $t("profile.adminContactTitle") }}</span>
        <button type="button" class="bubble-close" @click="open = false">×</button>
      </div>
      <p class="bubble-admin">
        {{ $t("profile.adminContactLabel") }}:
        <strong>{{ adminName }}</strong>
      </p>
      <pre class="bubble-text">
{{ contact || $t("profile.adminContactEmpty") }}
</pre>
    </div>
  </div>
</template>

<script setup>
const open = ref(false);
const visible = ref(false);
const adminName = ref("");
const contact = ref("");

onMounted(async () => {
  const roleCookie = useCookie("user_role", { path: "/" });
  if (roleCookie.value !== "user") return;
  try {
    const res = await $fetch("/api/users/my-admin-contact");
    if (res?.success && res.data) {
      adminName.value = res.data.adminName || "";
      contact.value = res.data.contact || "";
      visible.value = true;
    }
  } catch {
    visible.value = false;
  }
});
</script>

<style scoped>
.contact-bubble {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.bubble-btn {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid rgba(1, 123, 251, 0.65);
  background:
    radial-gradient(circle at 0 0, rgba(1, 123, 251, 0.35), transparent 55%),
    rgba(5, 15, 35, 0.98);
  color: #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 22px rgba(1, 123, 251, 0.6),
    0 12px 30px rgba(15, 23, 42, 0.95);
}

.bubble-icon {
  font-size: 1.3rem;
}

.bubble-panel {
  width: 260px;
  border-radius: 16px;
  border: 1px solid rgba(1, 123, 251, 0.55);
  background: rgba(5, 15, 35, 0.98);
  box-shadow:
    0 0 26px rgba(1, 123, 251, 0.4),
    0 16px 40px rgba(15, 23, 42, 0.95);
  padding: 10px 12px 10px;
}

.bubble-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.bubble-title {
  font-size: 0.86rem;
  font-weight: 600;
}

.bubble-close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
}

.bubble-admin {
  margin: 0 0 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.bubble-text {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
}
</style>


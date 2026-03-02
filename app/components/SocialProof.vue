<template>
  <div class="social-proof-panel" aria-live="polite">
    <div class="social-proof-header">
      <span class="social-proof-title">{{ $t("socialProof.title") || "Đơn hàng gần đây" }}</span>
    </div>
    <div class="social-proof-list">
      <div
        v-for="item in displayWithTime"
        :key="item.id"
        class="social-proof-item"
      >
        <span class="social-proof-text">
          <strong>{{ item.name }}</strong>
          {{ item.textMid }}
          <strong>{{ item.product }}</strong>
        </span>
        <small class="social-proof-time">{{ item.time }}</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const items = ref([]);
const timeTick = ref(0);

function formatTimeFromMs(diffMs) {
  if (diffMs < 60000) {
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    return t("socialProof.secondsAgo", { n: seconds });
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes >= 60) {
    return t("socialProof.hoursAgo", { n: Math.floor(minutes / 60) });
  }
  return t("socialProof.minutesAgo", { n: minutes });
}

const displayWithTime = computed(() => {
  // tạo phụ thuộc vào timeTick để update "X giây/phút trước"
  // eslint-disable-next-line no-unused-expressions
  timeTick.value;
  const now = Date.now();
  return items.value.map((item) => {
    let createdAtMs = now;
    const raw = item.created_at || item.createdAt;
    if (raw) {
      if (typeof raw === "string" && raw.includes(" ")) {
        createdAtMs = new Date(raw.replace(" ", "T")).getTime();
      } else {
        createdAtMs = new Date(raw).getTime();
      }
    }
    const diffMs = Math.max(1000, now - createdAtMs);
    return {
      ...item,
      textMid: t("socialProof.bought") + " ",
      time: formatTimeFromMs(diffMs),
    };
  });
});

async function loadFeed() {
  try {
    const data = await $fetch("/api/recent-orders");
    items.value = Array.isArray(data) ? data : [];
  } catch {
    items.value = [];
  }
}

let pollId;
let tickId;

onMounted(async () => {
  await loadFeed();
  tickId = setInterval(() => {
    timeTick.value++;
  }, 1000);
  // poll nhẹ để cập nhật item mới server sinh ra
  pollId = setInterval(() => {
    loadFeed();
  }, 30000);
});

onUnmounted(() => {
  if (tickId) clearInterval(tickId);
  if (pollId) clearInterval(pollId);
});
</script>

<style scoped>
.social-proof-panel {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 300px;
  max-height: 320px;
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 12px;
  box-shadow: var(--neon-shadow);
  backdrop-filter: blur(12px);
  z-index: 40;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.social-proof-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(1, 123, 251, 0.2);
  flex-shrink: 0;
}

.social-proof-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.social-proof-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Thin scrollbar */
.social-proof-list::-webkit-scrollbar {
  width: 4px;
}
.social-proof-list::-webkit-scrollbar-track {
  background: transparent;
}
.social-proof-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}
.social-proof-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.social-proof-item {
  padding: 0.6rem 0.8rem;
  background: rgba(1, 123, 251, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.15);
}

.social-proof-text {
  display: block;
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.social-proof-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.social-proof-text strong:last-of-type {
  color: var(--blue-electric);
}

.social-proof-time {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>

<template>
  <div class="announcements-page">
    <SiteHeader />
    <main class="announcements-main">
      <section class="announcements-hero">
        <h1 class="announcements-title">Thông báo từ hệ thống</h1>
        <p class="announcements-subtitle">
          Nơi cập nhật các tin quan trọng, hướng dẫn và lưu ý mới nhất dành cho
          bạn.
        </p>
      </section>

      <section class="announcements-list" aria-live="polite">
        <div v-if="loading" class="announcements-state">
          Đang tải thông báo...
        </div>
        <div v-else-if="!items.length" class="announcements-state">
          Chưa có thông báo nào.
        </div>
        <div v-else class="announcements-list-inner">
          <article
            v-for="item in items"
            :key="item.id"
            class="announcement-card"
          >
            <header class="announcement-head">
              <h2 class="announcement-title">
                {{ item.title }}
              </h2>
              <p class="announcement-meta">
                <span class="announcement-author">
                  {{ item.authorName || "Admin" }}
                </span>
                <span class="announcement-dot">•</span>
                <span class="announcement-time">{{
                  formatDate(item.createdAt)
                }}</span>
              </p>
            </header>
            <p class="announcement-content">
              {{ item.content }}
            </p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";

const items = ref([]);
const loading = ref(false);

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await $fetch("/api/announcements");
    items.value = Array.isArray(res?.data) ? res.data : [];
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.announcements-page {
}

.announcements-main {
  /* Đẩy nội dung xuống dưới để không bị header fixed che mất */
  padding: 85px 150px 80px;
}

.announcements-hero {
  max-width: 720px;
  margin: 16px auto 32px;
  text-align: center;
}

.announcements-title {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 700;
}

.announcements-subtitle {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
  opacity: 0.9;
}

.announcements-list {
  margin-top: 12px;
}

.announcements-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.announcements-list-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-card {
  width: 100%;
  padding: 18px 22px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 0 0, rgba(56, 189, 248, 0.2), transparent 55%),
    rgba(5, 15, 35, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.45);
  box-shadow:
    0 0 28px rgba(56, 189, 248, 0.35),
    0 18px 50px rgba(15, 23, 42, 0.95);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.announcement-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.announcement-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.announcement-meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.announcement-author {
  font-weight: 500;
}

.announcement-dot {
  opacity: 0.7;
}

.announcement-content {
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-primary);
  white-space: pre-line;
}

@media (max-width: 1200px) {
  .announcements-main {
    padding: 32px 24px 60px;
  }
}

@media (max-width: 768px) {
  .announcements-main {
    padding: 24px 16px 48px;
  }
}
</style>

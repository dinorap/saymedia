<template>
  <div class="announcements-page">
    <SiteHeader />
    <main class="announcements-main">
      <section class="announcements-hero">
        <div class="announcements-hero-inner">
          <div>
            <h1 class="announcements-title">
              {{ $t("announcements.pageTitle") }}
            </h1>
            <p class="announcements-subtitle">
              {{ $t("announcements.pageSubtitle") }}
            </p>
          </div>
          <div class="announcements-hero-tags">
            <span class="hero-tag"
              >📣 {{ $t("announcements.heroTagUpdates") }}</span
            >
            <span class="hero-tag"
              >⚠️ {{ $t("announcements.heroTagImportant") }}</span
            >
            <span class="hero-tag"
              >🕒 {{ $t("announcements.heroTagRealtime") }}</span
            >
          </div>
        </div>
      </section>

      <section class="announcements-list" aria-live="polite">
        <div v-if="loading" class="announcements-state">
          {{ $t("announcements.loading") }}
        </div>
        <div v-else-if="!items.length" class="announcements-state">
          {{ $t("announcements.empty") }}
        </div>
        <div v-else class="announcements-list-inner">
          <article
            v-for="item in items"
            :key="item.id"
            class="announcement-card"
          >
            <div v-if="item.imageUrl" class="announcement-thumb-wrap">
              <NuxtImg
                :src="item.imageUrl"
                alt="Ảnh thông báo"
                class="announcement-thumb"
              />
            </div>
            <div class="announcement-body">
              <h2 class="announcement-title">
                {{ item.title }}
              </h2>
              <p class="announcement-content">
                {{ item.content }}
              </p>
              <p class="announcement-time-line">
                {{ item.authorName || $t("admin.profileName") }} •
                {{ formatDate(item.createdAt) }}
              </p>
            </div>
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

async function loadAnnouncements(opts) {
  const silent = !!opts?.silent;
  if (!silent) loading.value = true;
  try {
    const res = await $fetch("/api/announcements");
    items.value = Array.isArray(res?.data) ? res.data : [];
  } catch {
    if (!silent) items.value = [];
  } finally {
    if (!silent) loading.value = false;
  }
}

let autoRefreshTimer = null;

onMounted(async () => {
  await loadAnnouncements({});
  autoRefreshTimer = setInterval(
    () => loadAnnouncements({ silent: true }),
    5000,
  );
});

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<style scoped>
.announcements-page {
}

.announcements-main {
  padding: 96px 150px 80px;
}

.announcements-hero {
  margin-top: 8px;
}

.announcements-hero-inner {
  border-radius: 20px;
  padding: 20px 22px 18px;
  background:
    radial-gradient(
      circle at 0 0,
      rgb(var(--accent-rgb) / 0.28),
      transparent 55%
    ),
    rgba(5, 15, 35, 0.96);
  border: 1px solid rgb(var(--accent-rgb) / 0.55);
  box-shadow:
    0 0 36px rgb(var(--accent-rgb) / 0.35),
    0 20px 60px rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.announcements-title {
  margin: 0 0 6px;
  font-size: 1.8rem;
  font-weight: 700;
}

.announcements-subtitle {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.announcements-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
  max-width: 500px;
}

.hero-tag {
  padding: 0.36rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: rgb(var(--accent-rgb) / 0.12);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  white-space: nowrap;
}

.announcements-list {
  margin-top: 24px;
}

.announcements-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.announcements-list-inner {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.announcement-card {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.4);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.announcement-body {
  flex: 1;
  min-width: 0;
}

.announcement-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.announcement-thumb-wrap {
  flex-shrink: 0;
}

.announcement-thumb {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(148, 163, 184, 0.5);
}

.announcement-content {
  margin: 2px 0 0;
  font-size: 0.86rem;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.announcement-time-line {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .announcements-main {
    padding: 92px 24px 60px;
  }
  .announcements-hero-inner {
    align-items: flex-start;
  }
  .announcements-list-inner {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .announcements-main {
    padding: 92px 16px 48px;
  }
  .announcements-hero-inner {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }
  .announcements-hero-tags {
    justify-content: flex-start;
    max-width: none;
  }
  .announcements-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 640px) {
  .announcement-card {
    padding: 10px;
    align-items: flex-start;
  }
  .announcement-thumb {
    width: 72px;
    height: 72px;
    border-radius: 10px;
  }
  .announcement-title {
    font-size: 0.96rem;
  }
  .announcement-content {
    -webkit-line-clamp: 3;
    font-size: 0.82rem;
  }
}
</style>

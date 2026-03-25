<template>
  <div class="about-page">
    <SiteHeader />
    <main class="about-main">
      <section class="products-hero about-hero">
        <div class="products-hero-inner">
          <div>
            <h1 class="about-title">{{ $t("nav.about") }}</h1>
            <p class="about-subtitle">
              {{ $t("aboutPage.subtitle") }}
            </p>
          </div>
          <div class="products-hero-tags">
            <span class="hero-tag"
              >📘 {{ $t("aboutPage.heroTagOverview") }}</span
            >
            <span class="hero-tag"
              >🖥️ {{ $t("aboutPage.heroTagFullscreen") }}</span
            >
            <span class="hero-tag"
              >🔄 {{ $t("aboutPage.heroTagUpdated") }}</span
            >
          </div>
        </div>
      </section>

      <AppLoading v-if="loading" />
      <div v-else-if="errorMsg" class="about-state about-state--error">
        {{ errorMsg }}
      </div>
      <div v-else-if="!items.length" class="about-state">
        {{ $t("aboutPage.empty") }}
      </div>
      <section v-else class="about-grid-section">
        <div class="about-card-list">
          <article
            v-for="item in items"
            :key="item.id"
            class="about-card"
            tabindex="0"
            role="button"
            :aria-label="$t('aboutPage.openCanvas') + ': ' + item.topic"
            @click="openModal(item)"
            @keydown.enter.prevent="openModal(item)"
            @keydown.space.prevent="openModal(item)"
          >
            <div class="about-card-main">
              <h2 class="about-card-title">{{ item.topic }}</h2>
              <p class="about-card-desc">
                {{
                  item.description
                    ? item.description.slice(0, 160) +
                      (item.description.length > 160 ? "…" : "")
                    : "—"
                }}
              </p>
              <span class="about-card-cta"
                >{{ $t("aboutPage.openCanvas") }} →</span
              >
            </div>
          </article>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="activeItem"
        class="about-modal-overlay"
        @click.self="closeModal"
      >
        <button
          type="button"
          class="about-modal-close about-modal-close--floating"
          :aria-label="$t('aboutPage.close')"
          @click="closeModal"
        >
          <svg
            class="about-modal-close-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>
        <div class="about-modal" role="dialog" aria-modal="true">
          <div class="about-modal-frame">
            <iframe
              v-if="activeItem.canvasEmbedUrl"
              :key="activeItem.id"
              loading="lazy"
              class="about-modal-iframe"
              :title="activeItem.topic"
              :src="activeItem.canvasEmbedUrl"
              allowfullscreen="allowfullscreen"
              allow="fullscreen"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";

const { t } = useI18n();

const items = ref([]);
const loading = ref(true);
const errorMsg = ref("");
const activeItem = ref(null);

async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await $fetch("/api/about-introductions");
    items.value = Array.isArray(res?.data) ? res.data : [];
  } catch {
    errorMsg.value = t("aboutPage.error");
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function openModal(item) {
  if (!item?.canvasEmbedUrl) return;
  activeItem.value = item;
  if (import.meta.client) {
    document.body.style.overflow = "hidden";
  }
}

function closeModal() {
  activeItem.value = null;
  if (import.meta.client) {
    document.body.style.overflow = "";
  }
}

function onGlobalKeydown(e) {
  if (e.key === "Escape" && activeItem.value) {
    e.preventDefault();
    closeModal();
  }
}

onMounted(() => {
  load();
  if (import.meta.client) {
    window.addEventListener("keydown", onGlobalKeydown);
  }
});

onUnmounted(() => {
  closeModal();
  if (import.meta.client) {
    window.removeEventListener("keydown", onGlobalKeydown);
  }
});
</script>

<style scoped>
.about-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.about-main {
  flex: 1;
  padding: 96px 150px 60px;
}

.about-hero {
  margin-top: 8px;
  margin-bottom: 10px;
}

.products-hero-inner {
  border-radius: 18px;
  padding: 16px 18px 16px;
  background:
    radial-gradient(
      circle at 0 0,
      rgb(var(--accent-rgb) / 0.24),
      transparent 55%
    ),
    rgba(5, 15, 35, 0.92);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.about-title {
  margin: 0 0 4px;
  font-size: 1.5rem;
  font-weight: 650;
}

.about-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.products-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.about-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  max-width: 560px;
  margin: 0 auto;
}

.about-state--error {
  color: #fca5a5;
}

.about-grid-section {
  margin-top: 16px;
}

.about-card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  border-radius: 12px;
}

.about-card {
  position: relative;
  color: var(--text-primary);
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  box-shadow: 0 0 18px rgb(var(--accent-rgb) / 0.16);
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  background: rgba(5, 15, 35, 0.95);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.about-card:hover {
  border-color: rgb(var(--accent-rgb) / 0.62);
  box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.24);
  transform: translateY(-1px);
}

.about-card-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.about-card-title {
  font-size: 1rem;
  margin: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.about-card-desc {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  min-height: 40px;
  flex: 1;
}

.about-card-cta {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.84rem;
  color: var(--blue-bright);
  font-weight: 600;
}

.about-card:focus {
  outline: none;
}

.about-card:focus-visible {
  border-color: rgb(var(--accent-rgb) / 0.62);
  box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.24);
}

.about-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.about-modal {
  width: min(96vw, 1400px, calc(88vh * 16 / 9));
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  background: rgba(8, 12, 24, 0.98);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.about-modal-close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.about-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
}

.about-modal-close:active {
  transform: translateY(0);
}

.about-modal-close--floating {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 10055;
}

.about-modal-close-icon {
  width: 18px;
  height: 18px;
  stroke: #fff;
  stroke-width: 2.4;
  stroke-linecap: round;
  fill: none;
  pointer-events: none;
}

.about-modal-frame {
  flex: 1;
  min-height: 100%;
  width: 100%;
}

.about-modal-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

@media (max-width: 768px) {
  .about-main {
    padding: 92px 12px 20px;
  }
  .products-hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .about-title {
    font-size: 1.35rem;
  }
  .about-card-list {
    grid-template-columns: 1fr;
  }
  .about-card {
    padding: 12px;
  }
  .about-card-title {
    font-size: 0.95rem;
  }
  .about-card-desc {
    font-size: 0.84rem;
    min-height: 0;
  }
  .about-modal-iframe {
    height: 100%;
  }
}
</style>

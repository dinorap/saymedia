<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppToast />
    <AppConfirm />
    <div
      v-if="promoSuggestions.length"
      class="global-promo-ticker"
      aria-label="Mã khuyến mại đang chạy"
    >
      <div class="global-promo-ticker-track">
        <div class="global-promo-lane">
          <span
            v-for="(promo, idx) in promoSuggestions"
            :key="`a-${promo.code}-${idx}`"
            class="global-promo-item"
          >
            <strong>Mã khuyến mãi: {{ promo.code }}</strong>
            <span v-if="promo.hint"> - {{ promo.hint }}</span>
          </span>
        </div>
        <div class="global-promo-lane" aria-hidden="true">
          <span
            v-for="(promo, idx) in promoSuggestions"
            :key="`b-${promo.code}-${idx}`"
            class="global-promo-item"
          >
            <strong>Mã khuyến mãi: {{ promo.code }}</strong>
            <span v-if="promo.hint"> - {{ promo.hint }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const promoSuggestions = ref<{ code: string; hint?: string }[]>([]);

let promoRefreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchActivePromotions() {
  try {
    const res = await $fetch("/api/payment/active-promotions");
    promoSuggestions.value =
      res?.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    promoSuggestions.value = [];
  }
}

onMounted(async () => {
  await fetchActivePromotions();
  promoRefreshTimer = setInterval(fetchActivePromotions, 60_000);
});

onUnmounted(() => {
  if (promoRefreshTimer) {
    clearInterval(promoRefreshTimer);
    promoRefreshTimer = null;
  }
});
</script>

<style scoped>
.global-promo-ticker {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  overflow: hidden;
  background: transparent;
}

.global-promo-ticker-track {
  display: flex;
  align-items: center;
  width: max-content;
  min-width: 200%;
  animation: global-promo-slide 12s linear infinite;
}

.global-promo-lane {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 50%;
  min-width: max-content;
  padding: 0.45rem 0.75rem;
}

.global-promo-item {
  white-space: nowrap;
  border: 1px solid rgba(56, 189, 248, 0.55);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  color: #e0f2fe;
  background: rgba(8, 47, 73, 0.75);
}

@keyframes global-promo-slide {
  0% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0);
  }
}
</style>

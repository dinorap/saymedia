<template>
  <div class="pricing-page">
    <SiteHeader />

    <main class="pricing-main">
      <section class="pricing-hero">
        <div class="pricing-hero-inner">
          <div>
            <h1 class="pricing-title">{{ $t("pricing.title") }}</h1>
            <p class="pricing-subtitle">
              {{ $t("pricing.subtitle") }}
            </p>
          </div>
          <p class="pricing-note">
            {{ $t("pricing.note") }}
          </p>
        </div>
      </section>

      <section class="pricing-tabs" aria-label="Pricing categories">
        <div class="pricing-subtabs">
          <button
            v-for="s in sets"
            :key="s.type"
            type="button"
            class="pricing-subtab"
            :class="{ 'pricing-subtab--active': activeType === s.type }"
            @click="activeType = s.type"
          >
            {{ s.displayName || s.type }}
          </button>
        </div>
      </section>

      <section class="pricing-grid">
        <div v-if="loading" class="pricing-loading">
          {{ $t("admin.loading") || "Loading..." }}
        </div>

        <div v-else-if="!activePackages.length" class="pricing-empty">
          Chưa có dữ liệu bảng giá.
        </div>

        <template v-else>
          <article
            v-for="(pkg, idx) in activePackages"
            :key="pkg.planName || idx"
            class="pricing-card"
            :class="{ 'pricing-card--highlight': idx === 1 }"
          >
            <div v-if="idx === 1" class="plan-badge">
              {{ $t("pricing.popular") || "Popular" }}
            </div>

            <h2 class="plan-name">{{ pkg.planName || `Gói ${idx + 1}` }}</h2>

            <!-- YouTube grouped: 1 gói lớn + nhiều gói nhỏ -->
            <div
              v-if="pkg.subPackages && pkg.subPackages.length"
              class="group-block"
            >
              <div class="youtube-subtabs" role="tablist" aria-label="Gói con">
                <button
                  v-for="(op, oi) in pkg.subPackages"
                  :key="oi"
                  type="button"
                  class="youtube-subtab"
                  :class="{
                    'youtube-subtab--active':
                      (selectedSubIdx[idx] ?? 0) === oi,
                  }"
                  @click="setSelectedSubIdx(idx, oi)"
                >
                  {{ op.planName || `Gói nhỏ ${oi + 1}` }}
                </button>
              </div>

              <div class="plan-meta">
                <span
                  v-if="selectedSubFor(idx, pkg)?.device || selectedSubFor(idx, pkg)?.days"
                >
                  {{
                    selectedSubFor(idx, pkg)?.device
                      ? `${selectedSubFor(idx, pkg)?.device} thiết bị`
                      : ""
                  }}
                  {{
                    selectedSubFor(idx, pkg)?.device &&
                    selectedSubFor(idx, pkg)?.days
                      ? " · "
                      : ""
                  }}
                  {{
                    selectedSubFor(idx, pkg)?.days
                      ? `${selectedSubFor(idx, pkg)?.days} ngày`
                      : ""
                  }}
                </span>
              </div>

              <p class="plan-price">
                <span class="plan-amount">
                  {{ selectedSubFor(idx, pkg)?.price || "Liên hệ" }}
                </span>
              </p>

              <div
                v-if="
                  selectedSubFor(idx, pkg)?.video ||
                  selectedSubFor(idx, pkg)?.devicePricePerMonth
                "
                class="plan-side"
              >
                <div v-if="selectedSubFor(idx, pkg)?.video" class="plan-side-row">
                  <span class="plan-side-label">Video:</span>
                  <span class="plan-side-value">
                    {{ selectedSubFor(idx, pkg)?.video }}
                  </span>
                </div>
                <div
                  v-if="selectedSubFor(idx, pkg)?.devicePricePerMonth"
                  class="plan-side-row"
                >
                  <span class="plan-side-label">Thiết bị/ tháng:</span>
                  <span class="plan-side-value">
                    {{ selectedSubFor(idx, pkg)?.devicePricePerMonth }}
                  </span>
                </div>
              </div>

              <ul class="plan-features">
                <li
                  v-for="(b, bi) in (pkg.benefits || [])"
                  :key="`${idx}-g-${bi}`"
                >
                  {{ b }}
                </li>
                <li
                  v-if="!(pkg.benefits || []).length"
                  class="plan-features-empty"
                >
                  Chưa cấu hình quyền lợi.
                </li>
              </ul>
            </div>

            <!-- Flat (Affiliate hoặc YouTube không grouped) -->
            <div v-else>
              <div class="plan-meta">
                <span v-if="pkg.device || pkg.days">
                  {{ pkg.device ? `${pkg.device} thiết bị` : "" }}
                  {{ pkg.device && pkg.days ? " · " : "" }}
                  {{ pkg.days ? `${pkg.days} ngày` : "" }}
                </span>
              </div>

              <p class="plan-price">
                <span class="plan-amount">{{ pkg.price || "Liên hệ" }}</span>
              </p>

              <div
                v-if="pkg.video || pkg.devicePricePerMonth"
                class="plan-side"
              >
                <div v-if="pkg.video" class="plan-side-row">
                  <span class="plan-side-label">Video:</span>
                  <span class="plan-side-value">{{ pkg.video }}</span>
                </div>
                <div
                  v-if="pkg.devicePricePerMonth"
                  class="plan-side-row"
                >
                  <span class="plan-side-label">Thiết bị/ tháng:</span>
                  <span class="plan-side-value">
                    {{ pkg.devicePricePerMonth }}
                  </span>
                </div>
              </div>

              <ul class="plan-features">
                <li
                  v-for="(b, bi) in (pkg.benefits || [])"
                  :key="`${idx}-${bi}`"
                >
                  {{ b }}
                </li>
                <li
                  v-if="!(pkg.benefits || []).length"
                  class="plan-features-empty"
                >
                  Chưa cấu hình quyền lợi.
                </li>
              </ul>
            </div>
          </article>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import SiteHeader from "~/components/SiteHeader.vue";
import { computed, onMounted, ref, watch } from "vue";

type PricingSet = {
  type: string;
  displayName?: string;
  packages?: Array<{
    planName?: string;
    device?: number | string;
    days?: number | string;
    price?: string;
    video?: string;
    devicePricePerMonth?: string;
    benefits?: string[];
    subPackages?: Array<{
      planName?: string;
      device?: number | string;
      days?: number | string;
      price?: string;
      video?: string;
      devicePricePerMonth?: string;
    }>;
  }>;
};

const loading = ref(true);
const sets = ref<PricingSet[]>([]);
const activeType = ref<string>("tool_affiliate");
const selectedSubIdx = ref<Record<number, number>>({});

const activeSet = computed(() => {
  return sets.value.find((s) => s.type === activeType.value) || sets.value[0];
});

const activePackages = computed(() => {
  return Array.isArray(activeSet.value?.packages)
    ? activeSet.value!.packages!
    : [];
});

function setSelectedSubIdx(pkgIdx: number, optionIdx: number) {
  selectedSubIdx.value[pkgIdx] = optionIdx;
}

function selectedSubFor(pkgIdx: number, pkg: any) {
  const ops = Array.isArray(pkg?.subPackages) ? pkg.subPackages : [];
  if (!ops.length) return null;
  const selected = selectedSubIdx.value[pkgIdx];
  const safeIdx = typeof selected === "number" && selected >= 0 ? selected : 0;
  return ops[safeIdx] || ops[0] || null;
}

async function fetchPricing() {
  try {
    // refresh=1 để tránh cache cũ (khi default pricing vừa seed lại)
    const res = await $fetch("/api/pricing?refresh=1");
    if (res?.success && res?.data) {
      sets.value = res.data.sets || [];
      if (!sets.value.length) return;
      const hasActive = sets.value.some((s) => s.type === activeType.value);
      if (!hasActive) activeType.value = sets.value[0].type;
    }
  } catch (e) {
    console.error("[pricing page]", e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPricing);

watch(activeType, () => {
  selectedSubIdx.value = {};
});
</script>

<style scoped>
.pricing-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.pricing-main {
  flex: 1;
  padding: 96px 150px 80px;
}

.pricing-hero-inner {
  border-radius: 20px;
  padding: 20px 22px 18px;
  background:
    radial-gradient(circle at 0 0, rgb(var(--accent-rgb) / 0.28), transparent 55%),
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

.pricing-title {
  margin: 0 0 6px;
  font-size: 1.8rem;
  font-weight: 700;
}

.pricing-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.pricing-note {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 280px;
  text-align: right;
}

.pricing-grid {
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.pricing-card {
  border-radius: 18px;
  padding: 18px 18px 20px;
  color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 0 28px rgba(15, 23, 42, 0.9);
  background: rgba(5, 15, 35, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.pricing-card--highlight {
  border-color: rgb(var(--accent-rgb) / 0.9);
  box-shadow:
    0 0 40px rgb(var(--accent-rgb) / 0.55),
    0 18px 50px rgba(15, 23, 42, 0.95);
  position: relative;
  background:
    radial-gradient(circle at 12% 8%, rgb(var(--accent-rgb) / 0.2), transparent 60%),
    rgba(5, 15, 35, 0.9);
}

.plan-badge {
  position: absolute;
  top: 12px;
  right: 14px;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--text-primary);
  border: 1px solid rgba(34, 197, 94, 0.5);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #bbf7d0;
  background: rgba(6, 95, 70, 0.28);
}

.plan-name {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 650;
}

.plan-tagline {
  margin: 0 0 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.plan-price {
  margin: 0 0 12px;
  font-size: 1.4rem;
  font-weight: 800;
}

.plan-amount {
  color: rgb(var(--accent-rgb) / 0.95);
  text-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.18);
}

.plan-unit {
  margin-left: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

.plan-features {
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}

.plan-features li {
  position: relative;
  padding-left: 1.15rem;
}

.plan-features li::before {
  content: "•";
  position: absolute;
  left: 0;
  top: 0;
  color: rgb(var(--accent-rgb) / 0.9);
  font-weight: 900;
}

.plan-features-empty::before {
  content: "";
}
.plan-features-empty {
  color: var(--text-muted);
  font-style: italic;
}

.plan-meta {
  margin: 0 0 10px;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.plan-side {
  margin: 0 0 10px;
}

.plan-side-row {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.plan-side-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.plan-side-value {
  color: var(--text-primary);
  font-weight: 650;
}

.pricing-tabs {
  margin-top: 22px;
}

.pricing-subtabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pricing-subtab {
  padding: 0.6rem 1rem;
  background: rgba(5, 15, 35, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 650;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.pricing-subtab--active {
  border-color: rgb(var(--accent-rgb) / 0.85);
  color: #fff;
  background: rgba(59, 130, 246, 0.22);
  box-shadow:
    0 0 0 3px rgba(59, 130, 246, 0.1),
    0 18px 40px rgba(2, 6, 23, 0.5);
}

.youtube-subtabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.youtube-subtab {
  padding: 0.45rem 0.8rem;
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 650;
  font-size: 0.85rem;
  transition:
    transform 120ms ease,
    background 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.youtube-subtab:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
  border-color: rgba(148, 163, 184, 0.35);
}

.youtube-subtab--active {
  border-color: rgb(var(--accent-rgb) / 0.85);
  color: #fff;
  background: rgba(59, 130, 246, 0.24);
  box-shadow:
    0 0 0 3px rgba(59, 130, 246, 0.1),
    inset 0 0 0 1px rgba(59, 130, 246, 0.18);
}

.pricing-loading {
  grid-column: 1 / -1;
  padding: 18px 0;
  color: var(--text-muted);
  text-align: center;
}

.pricing-empty {
  grid-column: 1 / -1;
  padding: 26px 0;
  color: var(--text-muted);
  text-align: center;
  font-size: 0.95rem;
}

.group-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.group-option {
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(2, 6, 23, 0.5);
}

.group-option-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.group-option-name {
  font-weight: 700;
  color: var(--text-primary);
}

.group-option-price {
  font-weight: 800;
  color: rgb(var(--accent-rgb) / 0.95);
  white-space: nowrap;
}

.group-option-meta {
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .pricing-main {
    padding: 92px 20px 60px;
  }
  .pricing-hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .pricing-note {
    text-align: left;
    max-width: 100%;
  }
  .pricing-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .pricing-main {
    padding: 92px 16px 44px;
  }
  .pricing-hero-inner {
    padding: 14px;
  }
  .pricing-title {
    font-size: 1.4rem;
  }
  .pricing-grid {
    margin-top: 16px;
    gap: 12px;
  }
  .pricing-card {
    padding: 14px;
  }
}
</style>


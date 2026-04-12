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
          {{ $t("pricing.empty") }}
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

            <h2 class="plan-name">
              {{ formatDurationText(pkg.planName || `Gói ${idx + 1}`) }}
            </h2>

            <!-- YouTube grouped: 1 gói lớn + nhiều gói nhỏ -->
            <div
              v-if="pkg.subPackages && pkg.subPackages.length"
              class="group-block"
            >
              <div
                class="youtube-subtabs"
                role="tablist"
                :aria-label="$t('pricing.subPackagesLabel')"
              >
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
                  {{
                    activeType === "youtube_long_video"
                      ? youtubeSubtabLabel(op, oi)
                      : formatDurationText(op.planName || `Gói nhỏ ${oi + 1}`)
                  }}
                </button>
              </div>

              <div class="plan-meta">
                <span v-if="subPackageMetaLine(selectedSubFor(idx, pkg))">
                  {{ subPackageMetaLine(selectedSubFor(idx, pkg)) }}
                </span>
              </div>

              <p class="plan-price">
                <span class="plan-amount">
                  {{ selectedSubFor(idx, pkg)?.price || $t("pricing.contactPrice") }}
                </span>
                <span
                  v-if="showYoutubeComboBuy(pkg, idx)"
                  class="plan-points-line"
                >
                  {{ comboCreditsForSub(selectedSubFor(idx, pkg)) }} điểm
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
                  <span class="plan-side-label">{{ $t("pricing.videoLabel") }}:</span>
                  <span class="plan-side-value">
                    {{ formatDurationText(selectedSubFor(idx, pkg)?.video) }}
                  </span>
                </div>
                <div
                  v-if="selectedSubFor(idx, pkg)?.devicePricePerMonth"
                  class="plan-side-row"
                >
                  <span class="plan-side-label">{{ $t("pricing.devicePerMonthLabel") }}:</span>
                  <span class="plan-side-value">
                    {{ formatDurationText(selectedSubFor(idx, pkg)?.devicePricePerMonth) }}
                  </span>
                </div>
              </div>

              <ul class="plan-features">
                <li
                  v-for="(b, bi) in (pkg.benefits || [])"
                  :key="`${idx}-g-${bi}`"
                >
                  {{ formatDurationText(b) }}
                </li>
                <li
                  v-if="!(pkg.benefits || []).length"
                  class="plan-features-empty"
                >
                  {{ $t("pricing.noBenefits") }}
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
                <span class="plan-amount">
                  {{ pkg.price || $t("pricing.contactPrice") }}
                </span>
              </p>

              <div
                v-if="pkg.video || pkg.devicePricePerMonth"
                class="plan-side"
              >
                <div v-if="pkg.video" class="plan-side-row">
                  <span class="plan-side-label">{{ $t("pricing.videoLabel") }}:</span>
                  <span class="plan-side-value">{{ formatDurationText(pkg.video) }}</span>
                </div>
                <div
                  v-if="pkg.devicePricePerMonth"
                  class="plan-side-row"
                >
                  <span class="plan-side-label">{{ $t("pricing.devicePerMonthLabel") }}:</span>
                  <span class="plan-side-value">
                    {{ formatDurationText(pkg.devicePricePerMonth) }}
                  </span>
                </div>
              </div>

              <ul class="plan-features">
                <li
                  v-for="(b, bi) in (pkg.benefits || [])"
                  :key="`${idx}-${bi}`"
                >
                  {{ formatDurationText(b) }}
                </li>
                <li
                  v-if="!(pkg.benefits || []).length"
                  class="plan-features-empty"
                >
                  {{ $t("pricing.noBenefits") }}
                </li>
              </ul>
            </div>

            <div class="plan-action-wrap">
              <button
                v-if="showYoutubeComboBuy(pkg, idx)"
                type="button"
                class="plan-buy-now-btn"
                @click="openCheckout(idx)"
              >
                Mua ngay
              </button>
              <NuxtLink
                v-else
                to="/products"
                class="plan-buy-now-btn"
              >
                Mua ngay
              </NuxtLink>
            </div>
          </article>
        </template>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="checkoutOpen && checkoutCtx"
        class="pricing-checkout-backdrop"
        role="presentation"
        @click.self="closeCheckout"
      >
        <div
          class="pricing-checkout-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-checkout-title"
        >
          <h3 id="pricing-checkout-title" class="pricing-checkout-title">
            Thanh toán combo
          </h3>

          <div v-if="checkoutStep === 'confirm'" class="pricing-checkout-body">
            <p class="pricing-checkout-line">
              <span class="pricing-checkout-k">Gói</span>
              <span class="pricing-checkout-v">{{ checkoutCtx.parentName }}</span>
            </p>
            <p class="pricing-checkout-line">
              <span class="pricing-checkout-k">Tuỳ chọn</span>
              <span class="pricing-checkout-v">{{ checkoutCtx.metaLine }}</span>
            </p>
            <p class="pricing-checkout-line">
              <span class="pricing-checkout-k">Niêm yết</span>
              <span class="pricing-checkout-v">{{ checkoutCtx.priceStr }}</span>
            </p>
            <p class="pricing-checkout-line pricing-checkout-line--emph">
              <span class="pricing-checkout-k">Thanh toán</span>
              <span class="pricing-checkout-v">{{ checkoutCtx.credits }} điểm</span>
            </p>

            <div v-if="checkoutMeLoading" class="pricing-checkout-muted">
              Đang tải số dư…
            </div>
            <template v-else-if="checkoutLoggedIn">
              <p class="pricing-checkout-line">
                <span class="pricing-checkout-k">Số dư</span>
                <span class="pricing-checkout-v">{{ checkoutCredit }} điểm</span>
              </p>
              <p
                v-if="checkoutCredit < checkoutCtx.credits"
                class="pricing-checkout-warn"
              >
                Số dư không đủ. Vui lòng nạp thêm điểm tại trang cá nhân.
              </p>
            </template>
            <p v-else class="pricing-checkout-warn">
              Bạn cần đăng nhập để thanh toán bằng điểm.
            </p>

            <p v-if="checkoutError" class="pricing-checkout-err">{{ checkoutError }}</p>

            <div class="pricing-checkout-actions">
              <button
                type="button"
                class="pricing-checkout-btn pricing-checkout-btn--ghost"
                :disabled="checkoutSubmitting"
                @click="closeCheckout"
              >
                Hủy
              </button>
              <NuxtLink
                v-if="!checkoutLoggedIn && !checkoutMeLoading"
                to="/login?next=/pricing"
                class="pricing-checkout-btn pricing-checkout-btn--primary"
              >
                Đăng nhập
              </NuxtLink>
              <button
                v-else
                type="button"
                class="pricing-checkout-btn pricing-checkout-btn--primary"
                :disabled="
                  checkoutSubmitting ||
                  !checkoutLoggedIn ||
                  checkoutCredit < checkoutCtx.credits
                "
                @click="confirmCheckout"
              >
                {{ checkoutSubmitting ? "Đang xử lý…" : "Xác nhận thanh toán" }}
              </button>
            </div>
          </div>

          <div v-else class="pricing-checkout-body">
            <p class="pricing-checkout-success">
              Đã thanh toán thành công.
              <span v-if="checkoutResult?.orderId">
                Mã đơn: #{{ checkoutResult.orderId }}.
              </span>
            </p>
            <p
              v-if="checkoutResult?.deliveredKeys?.length"
              class="pricing-checkout-keys-title"
            >
              Key của bạn:
            </p>
            <ul
              v-if="checkoutResult?.deliveredKeys?.length"
              class="pricing-checkout-keys"
            >
              <li
                v-for="(k, ki) in checkoutResult.deliveredKeys"
                :key="ki"
                class="pricing-checkout-key-row"
              >
                <code>{{ k }}</code>
              </li>
            </ul>
            <div class="pricing-checkout-actions">
              <button
                type="button"
                class="pricing-checkout-btn pricing-checkout-btn--ghost"
                @click="closeCheckout"
              >
                Đóng
              </button>
              <NuxtLink
                to="/profile?orders=1"
                class="pricing-checkout-btn pricing-checkout-btn--primary"
              >
                Xem đơn hàng
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import SiteHeader from "~/components/SiteHeader.vue";
import { computed, onMounted, ref, watch } from "vue";

const { show: showToast } = useToast();
const runtimeConfig = useRuntimeConfig();
const vndPerCredit = computed(
  () => Number(runtimeConfig.public.depositVndPerCredit || 1000) || 1000,
);

const checkoutOpen = ref(false);
const checkoutPkgIdx = ref<number | null>(null);
const checkoutStep = ref<"confirm" | "success">("confirm");
const checkoutMeLoading = ref(false);
const checkoutLoggedIn = ref(false);
const checkoutCredit = ref(0);
const checkoutSubmitting = ref(false);
const checkoutError = ref("");
const checkoutResult = ref<{
  orderId?: number;
  deliveredKeys?: string[];
  newCredit?: number;
} | null>(null);

type PricingSet = {
  type: string;
  displayName?: string;
  linkedProductId?: number | null;
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
      keyDuration?: string;
      linkedProductId?: number | null;
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

function parseVndStringToInteger(s: string): number {
  const digits = String(s || "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), 9_999_999_999_999);
}

function vndIntegerToCredits(vnd: number, rate: number): number {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return 0;
  if (!Number.isFinite(vnd) || vnd <= 0) return 0;
  return Math.max(1, Math.round(vnd / r));
}

function resolveLinkedProductId(
  set: PricingSet | null | undefined,
  sub: { linkedProductId?: number | null } | null | undefined,
): number | null {
  const sid = sub?.linkedProductId;
  if (sid != null && Number(sid) > 0) return Math.trunc(Number(sid));
  const rid = set?.linkedProductId;
  if (rid != null && Number(rid) > 0) return Math.trunc(Number(rid));
  return null;
}

function comboCreditsForSub(sub: { price?: string } | null | undefined) {
  const vnd = parseVndStringToInteger(String(sub?.price || ""));
  return vndIntegerToCredits(vnd, vndPerCredit.value);
}

function showYoutubeComboBuy(pkg: any, pkgIdx: number) {
  if (activeType.value !== "youtube_long_video") return false;
  const ops = Array.isArray(pkg?.subPackages) ? pkg.subPackages : [];
  if (!ops.length) return false;
  const sub = selectedSubFor(pkgIdx, pkg);
  return !!sub && !!resolveLinkedProductId(activeSet.value, sub);
}

const checkoutCtx = computed(() => {
  const idx = checkoutPkgIdx.value;
  if (idx === null) return null;
  const pkg = activePackages.value[idx];
  if (!pkg) return null;
  const sub = selectedSubFor(idx, pkg);
  const linked = resolveLinkedProductId(activeSet.value, sub);
  if (!sub || !linked) return null;
  const credits = comboCreditsForSub(sub);
  if (!credits) return null;
  const metaLine = subPackageMetaLine(sub);
  const parentName =
    String(pkg.planName || "").trim() || `Gói ${idx + 1}`;
  const priceStr = String(sub.price || "").trim() || "—";
  const rawSel = selectedSubIdx.value[idx];
  const subPackageIndex =
    typeof rawSel === "number" && rawSel >= 0 ? rawSel : 0;
  return {
    pkgIdx: idx,
    linked,
    credits,
    metaLine: metaLine || "—",
    parentName,
    priceStr,
    subPackageIndex,
  };
});

async function refreshCheckoutMe() {
  checkoutMeLoading.value = true;
  checkoutLoggedIn.value = false;
  checkoutCredit.value = 0;
  try {
    const res: { user?: { credit?: number } } = await $fetch("/api/auth/me");
    checkoutLoggedIn.value = true;
    checkoutCredit.value = Number(res?.user?.credit ?? 0) || 0;
  } catch {
    checkoutLoggedIn.value = false;
    checkoutCredit.value = 0;
  } finally {
    checkoutMeLoading.value = false;
  }
}

function openCheckout(pkgIdx: number) {
  checkoutPkgIdx.value = pkgIdx;
  if (!checkoutCtx.value) {
    checkoutPkgIdx.value = null;
    return;
  }
  checkoutOpen.value = true;
  checkoutStep.value = "confirm";
  checkoutResult.value = null;
  checkoutError.value = "";
  void refreshCheckoutMe();
}

function closeCheckout() {
  checkoutOpen.value = false;
  checkoutPkgIdx.value = null;
  checkoutStep.value = "confirm";
  checkoutResult.value = null;
  checkoutError.value = "";
}

async function confirmCheckout() {
  const ctx = checkoutCtx.value;
  if (!ctx || !checkoutLoggedIn.value) return;
  checkoutSubmitting.value = true;
  checkoutError.value = "";
  try {
    const res: {
      orderId?: number;
      newCredit?: number;
      deliveredKeys?: string[];
    } = await $fetch("/api/orders/create", {
      method: "POST",
      body: {
        product_id: ctx.linked,
        pricing_bundle: {
          pricing_type: "youtube_long_video",
          package_index: ctx.pkgIdx,
          sub_package_index: ctx.subPackageIndex,
        },
      },
    });
    checkoutResult.value = {
      orderId: res.orderId,
      deliveredKeys: Array.isArray(res.deliveredKeys) ? res.deliveredKeys : [],
      newCredit: typeof res.newCredit === "number" ? res.newCredit : undefined,
    };
    if (typeof res.newCredit === "number") {
      checkoutCredit.value = res.newCredit;
    }
    checkoutStep.value = "success";
    showToast("Thanh toán thành công.", "success");
  } catch (e: any) {
    const code = e?.statusCode || e?.status;
    if (code === 401) {
      await navigateTo("/login?next=/pricing");
      return;
    }
    checkoutError.value =
      e?.data?.statusMessage || e?.message || "Không tạo được đơn hàng.";
  } finally {
    checkoutSubmitting.value = false;
  }
}

/** Hiển thị loại key theo admin (2h → 2 giờ, 2d → 2 ngày, lifetime → …) */
function formatSubPackageKeyDurationVi(sub: {
  keyDuration?: string;
  days?: number | string;
} | null | undefined): string {
  if (!sub) return "";
  const kd = String(sub.keyDuration || "").trim().toLowerCase();
  if (kd === "lifetime") return "Trọn đời";
  if (kd) {
    const mh = /^(\d+)h$/i.exec(kd);
    if (mh) return `${parseInt(mh[1], 10)} giờ`;
    const md = /^(\d+)d$/i.exec(kd);
    if (md) return `${parseInt(md[1], 10)} ngày`;
    return kd;
  }
  const d = Math.trunc(Number(sub.days ?? 0));
  return d > 0 ? `${d} ngày` : "";
}

/** Ví dụ: «10 thiết bị · 2 giờ» hoặc «3 thiết bị · 30 ngày» */
function subPackageMetaLine(
  sub: {
    device?: number | string;
    keyDuration?: string;
    days?: number | string;
  } | null | undefined,
): string {
  if (!sub) return "";
  const dev = Math.trunc(Number(sub.device ?? 0));
  const dur = formatSubPackageKeyDurationVi(sub);
  const parts: string[] = [];
  if (dev > 0) parts.push(`${dev} thiết bị`);
  if (dur) parts.push(dur);
  return parts.join(" · ");
}

function youtubeSubtabLabel(
  op: {
    planName?: string;
    device?: number | string;
    keyDuration?: string;
    days?: number | string;
  },
  oi: number,
) {
  const meta = subPackageMetaLine(op);
  if (meta) return meta;
  return formatDurationText(op.planName || `Gói nhỏ ${oi + 1}`);
}

function formatDurationText(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\b(\d+)\s*d\b/gi, "$1 ngày")
    .replace(/\b(\d+)\s*h\b/gi, "$1 giờ");
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
  display: flex;
  flex-direction: column;
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
  font-size: 1.65rem;
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

.plan-action-wrap {
  margin-top: 14px;
}

.plan-buy-now-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 42px;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  border: 1px solid rgb(var(--accent-rgb) / 0.65);
  background:
    linear-gradient(
      135deg,
      rgb(var(--accent-rgb) / 0.92),
      rgba(59, 130, 246, 0.88)
    );
  color: #fff;
  text-decoration: none;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  box-shadow:
    0 12px 26px rgb(var(--accent-rgb) / 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    filter 140ms ease;
}

.plan-buy-now-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 16px 30px rgb(var(--accent-rgb) / 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  filter: saturate(1.08);
}

.plan-buy-now-btn:active {
  transform: translateY(0);
}

button.plan-buy-now-btn {
  cursor: pointer;
  font: inherit;
  border: 1px solid rgb(var(--accent-rgb) / 0.65);
}

.plan-points-line {
  display: block;
  margin-top: 8px;
  font-size: 0.95rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  background: linear-gradient(
    90deg,
    rgba(167, 139, 250, 0.95),
    rgba(244, 244, 245, 0.98)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.pricing-checkout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(6px);
}

.pricing-checkout-panel {
  width: min(440px, 100%);
  max-height: min(90vh, 640px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(
    165deg,
    rgba(15, 23, 42, 0.98),
    rgba(2, 6, 23, 0.96)
  );
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(59, 130, 246, 0.12);
  padding: 22px 22px 18px;
}

.pricing-checkout-title {
  margin: 0 0 14px;
  font-size: 1.15rem;
  font-weight: 800;
  color: #f8fafc;
}

.pricing-checkout-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pricing-checkout-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.pricing-checkout-line--emph {
  font-size: 1rem;
  color: #e2e8f0;
  font-weight: 750;
}

.pricing-checkout-k {
  color: var(--text-muted);
  flex-shrink: 0;
}

.pricing-checkout-v {
  text-align: right;
  color: #f1f5f9;
  font-weight: 650;
}

.pricing-checkout-muted {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.pricing-checkout-warn {
  margin: 0;
  font-size: 0.88rem;
  color: #fbbf24;
  line-height: 1.45;
}

.pricing-checkout-err {
  margin: 0;
  font-size: 0.88rem;
  color: #f87171;
}

.pricing-checkout-success {
  margin: 0 0 6px;
  font-size: 0.95rem;
  color: #e2e8f0;
  line-height: 1.5;
}

.pricing-checkout-keys-title {
  margin: 10px 0 4px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #a5b4fc;
}

.pricing-checkout-keys {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pricing-checkout-key-row {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.22);
  word-break: break-all;
}

.pricing-checkout-key-row code {
  font-size: 0.82rem;
  color: #f8fafc;
}

.pricing-checkout-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

.pricing-checkout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-weight: 750;
  font-size: 0.92rem;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 120ms ease,
    filter 120ms ease;
}

.pricing-checkout-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pricing-checkout-btn--ghost {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(148, 163, 184, 0.35);
  color: #e2e8f0;
}

.pricing-checkout-btn--ghost:hover:not(:disabled) {
  filter: brightness(1.06);
}

.pricing-checkout-btn--primary {
  background: linear-gradient(
    135deg,
    rgb(var(--accent-rgb) / 0.92),
    rgba(59, 130, 246, 0.88)
  );
  border-color: rgb(var(--accent-rgb) / 0.55);
  color: #fff;
  box-shadow: 0 10px 24px rgb(var(--accent-rgb) / 0.22);
}

.pricing-checkout-btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
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


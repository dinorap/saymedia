<template>
  <div class="product-detail-page" v-if="!loading && product">
    <SiteHeader />

    <main class="detail-main">
      <section class="detail-hero">
        <section class="hero-left">
          <div class="media-card">
            <div class="detail-thumb-wrap" v-if="activeImage">
              <button
                v-if="images.length > 1"
                type="button"
                class="image-nav image-nav--left"
                @click.stop="prevImage"
              >
                ‹
              </button>
              <img
                :src="activeImage"
                :alt="product.name"
                class="detail-thumb"
              />
              <button
                v-if="images.length > 1"
                type="button"
                class="image-nav image-nav--right"
                @click.stop="nextImage"
              >
                ›
              </button>
            </div>
            <div v-else class="detail-thumb placeholder">
              <span>{{ product.name.charAt(0).toUpperCase() }}</span>
            </div>

            <div v-if="images.length > 1" class="thumb-strip">
              <button
                v-for="(img, idx) in images"
                :key="img + idx"
                type="button"
                class="thumb-btn"
                :class="{ active: idx === currentImageIndex }"
                @click="setActiveImage(img)"
                :aria-label="`thumb-${idx + 1}`"
              >
                <img :src="img" :alt="product.name + ' thumb ' + (idx + 1)" />
              </button>
            </div>
          </div>

          <section class="detail-panels">
            <div class="panel-card">
              <h3 class="section-title">
                {{ $t("product.longDescriptionTitle") }}
              </h3>
              <p v-if="product.long_description" class="detail-long-text">
                {{ product.long_description }}
              </p>
              <p v-else-if="product.description" class="detail-long-text">
                {{ product.description }}
              </p>
              <p v-else class="detail-long-text muted">
                {{ $t("product.noDescription") }}
              </p>
            </div>

            <div class="panel-card">
              <h3 class="section-title">
                {{ $t("product.reviewsTab") }}
                <span v-if="reviewMeta.reviewCount" class="tab-pill">
                  {{ reviewMeta.reviewCount }}
                </span>
              </h3>
              <div class="reviews-summary">
                <div class="avg">
                  <div class="avg-score">{{ avgRatingText }}</div>
                  <div class="avg-stars" aria-label="avg-stars">
                    <span
                      v-for="i in 5"
                      :key="i"
                      class="star"
                      :class="{ on: i <= avgRatingRounded }"
                      >★</span
                    >
                  </div>
                  <div class="avg-sub">
                    {{
                      $t("product.reviewCount", {
                        count: reviewMeta.reviewCount,
                      })
                    }}
                    <span class="dot">•</span>
                    {{
                      $t("product.soldCount", { count: reviewMeta.soldCount })
                    }}
                  </div>
                </div>

                <div class="bars">
                  <div v-for="s in [5, 4, 3, 2, 1]" :key="s" class="bar-row">
                    <div class="bar-label">{{ s }}</div>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        :style="{ width: ratingPercent(s) + '%' }"
                      ></div>
                    </div>
                    <div class="bar-count">
                      {{ ratingCounts[String(s)] || 0 }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="reviewsLoading" class="panel-state">
                {{ $t("admin.loading") }}
              </div>
              <div v-else-if="!reviews.length" class="panel-state">
                {{ $t("product.noReviews") }}
              </div>
              <div v-else class="reviews-list">
                <article v-for="rv in reviews" :key="rv.id" class="review-item">
                  <div class="review-top">
                    <div class="review-left">
                      <div class="review-avatar">
                        {{
                          String(rv.user_display || "?")
                            .charAt(0)
                            .toUpperCase()
                        }}
                      </div>
                      <div class="review-ident">
                        <div class="review-user">{{ rv.user_display }}</div>
                        <div class="review-time">
                          {{ formatDate(rv.created_at) }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="review-stars"
                      :aria-label="`rating-${rv.rating}`"
                    >
                      <span
                        v-for="i in 5"
                        :key="i"
                        class="star"
                        :class="{ on: i <= rv.rating }"
                        >★</span
                      >
                      <span class="review-rating-num">{{ rv.rating }}/5</span>
                    </div>
                  </div>
                  <p v-if="rv.comment" class="review-text">{{ rv.comment }}</p>
                </article>
              </div>

              <div class="review-form" v-if="canReview">
                <h4 class="review-form-title">
                  {{ $t("product.writeReviewTitle") }}
                </h4>
                <div
                  class="review-form-stars"
                  :aria-label="`your-rating-${reviewForm.rating}`"
                >
                  <button
                    v-for="i in 5"
                    :key="i"
                    type="button"
                    class="star-btn"
                    :class="{ on: i <= reviewForm.rating }"
                    @click="setReviewRating(i)"
                  >
                    ★
                  </button>
                </div>
                <textarea
                  v-model="reviewForm.comment"
                  class="review-textarea"
                  :placeholder="$t('product.writeReviewPlaceholder')"
                  rows="3"
                />
                <div class="review-form-actions">
                  <button
                    type="button"
                    class="btn-primary"
                    :disabled="submittingReview || !reviewForm.rating"
                    @click="submitReview"
                  >
                    {{
                      submittingReview
                        ? "..."
                        : myReview?.id
                          ? $t("product.updateReview")
                          : $t("product.submitReview")
                    }}
                  </button>
                  <p class="review-form-hint">
                    {{ $t("product.onlyBuyersCanReview") }}
                  </p>
                </div>
              </div>
              <p v-else class="review-form-hint">
                {{ $t("product.onlyBuyersCanReview") }}
              </p>
            </div>

            <div class="panel-card">
              <h3 class="section-title">{{ $t("product.similarTab") }}</h3>
              <div v-if="similarLoading" class="panel-state">
                {{ $t("admin.loading") }}
              </div>
              <div v-else-if="!similarProducts.length" class="panel-state">
                {{ $t("product.noSimilar") }}
              </div>
              <div v-else class="similar-grid">
                <NuxtLink
                  v-for="sp in similarProducts"
                  :key="sp.id"
                  class="similar-card"
                  :to="`/products/${sp.id}`"
                >
                  <div class="similar-thumb">
                    <img
                      v-if="sp.thumbnail_url"
                      :src="sp.thumbnail_url"
                      :alt="sp.name"
                      loading="lazy"
                    />
                    <div v-else class="similar-thumb placeholder">
                      {{
                        String(sp.name || "?")
                          .charAt(0)
                          .toUpperCase()
                      }}
                    </div>
                    <div class="similar-chip">
                      {{ (sp.type || "tool").toUpperCase() }}
                    </div>
                  </div>
                  <div class="similar-body">
                    <div class="similar-name">{{ sp.name }}</div>
                    <div class="similar-desc" v-if="sp.description">
                      {{ sp.description }}
                    </div>
                    <div class="similar-price">
                      <span class="price-num">{{ formatVnd(sp.price) }}</span>
                      <span class="unit">{{ $t("product.points") }}</span>
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </section>
        </section>

        <aside class="hero-right">
          <div class="buy-card">
            <div class="buy-badges">
              <span class="detail-badge-main">{{
                $t("product.badgeProduct")
              }}</span>
              <span class="detail-badge-type">
                {{ (product.type || "tool").toUpperCase() }}
              </span>
            </div>

            <h1 class="detail-title">{{ product.name }}</h1>
            <p class="detail-short" v-if="product.description">
              {{ product.description }}
            </p>
            <p v-else class="detail-short muted">
              {{ $t("product.noDescription") }}
            </p>

            <div class="buy-meta">
              <div class="buy-stars">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="star"
                  :class="{ on: i <= avgRatingRounded }"
                  >★</span
                >
                <span class="buy-score">{{ avgRatingText }}</span>
              </div>
              <div class="buy-sub">
                {{
                  $t("product.reviewCountShort", {
                    count: reviewMeta.reviewCount,
                  })
                }}
                <span class="dot">•</span>
                {{
                  $t("product.soldCountShort", { count: reviewMeta.soldCount })
                }}
              </div>
            </div>

            <div class="buy-price">
              <div class="price">
                {{ formatVnd(product.price) }}
                <span class="unit">{{ $t("product.points") }}</span>
              </div>
            </div>

            <div class="detail-actions">
              <button
                type="button"
                class="btn-ghost"
                @click="addToCart(product)"
              >
                {{
                  inCart(product)
                    ? $t("product.inCart")
                    : $t("product.addToCart")
                }}
              </button>
              <button
                type="button"
                class="btn-primary"
                :disabled="buying"
                @click="openConfirm(product)"
              >
                {{ buying ? "..." : $t("product.buyNow") }}
              </button>
            </div>

            <div class="buy-highlights">
              <div class="hl">
                <div class="hl-k">{{ $t("product.warrantyLabel") }}</div>
                <div class="hl-v">{{ $t("product.warrantyValue") }}</div>
              </div>
              <div class="hl">
                <div class="hl-k">{{ $t("product.supportLabel") }}</div>
                <div class="hl-v">{{ $t("product.supportValue") }}</div>
              </div>
              <div class="hl">
                <div class="hl-k">{{ $t("product.deliveryLabel") }}</div>
                <div class="hl-v">{{ $t("product.deliveryValue") }}</div>
              </div>
              <div v-if="product.support_contact" class="hl hl--contact">
                <div class="hl-k">{{ $t("product.supportContact") }}</div>
                <div class="hl-v">
                  <button
                    type="button"
                    class="support-show-btn"
                    @click="showContactPopup = true"
                  >
                    {{ $t("product.viewContact") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>

    <ConfirmPurchaseModal
      v-model="showConfirm"
      :product="product"
      :balance="currentUser?.credit"
      @confirm="doPurchase"
    />

    <!-- Modal xem thông tin liên hệ hỗ trợ sản phẩm -->
    <Teleport to="body">
      <div
        v-if="showContactPopup && product?.support_contact"
        class="detail-contact-overlay"
        @click.self="showContactPopup = false"
      >
        <div class="detail-contact-modal">
          <h3 class="detail-contact-title">
            {{ $t("profile.adminContactTitle") }}
          </h3>

          <pre class="detail-contact-text"
            >{{ product.support_contact }}
</pre
          >
          <div class="detail-contact-actions">
            <button
              type="button"
              class="btn-primary"
              @click="showContactPopup = false"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else class="product-detail-page">
    <SiteHeader />
    <main class="detail-main">
      <div v-if="loading" class="detail-state">
        {{ $t("admin.loading") }}
      </div>
      <div v-else class="detail-state">
        {{ error || $t("admin.noData") }}
      </div>
    </main>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";
import ConfirmPurchaseModal from "~/components/product/ConfirmPurchaseModal.vue";

const route = useRoute();
const { locale, t } = useI18n();
const { show: showToast } = useToast();
const { cart, add } = useCart();

const product = ref(null);
const currentImageIndex = ref(0);
const loading = ref(true);
const error = ref("");
const currentUser = ref(null);
const showConfirm = ref(false);
const buying = ref(false);

const reviewsLoading = ref(false);
const reviews = ref([]);
const ratingCounts = ref({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
const reviewMeta = ref({ avgRating: 0, reviewCount: 0, soldCount: 0 });
const canReview = ref(false);
const myReview = ref(null);
const reviewForm = reactive({
  rating: 0,
  comment: "",
});
const submittingReview = ref(false);

const similarLoading = ref(false);
const similarProducts = ref([]);
const adminContact = ref(null);
const showContactPopup = ref(false);

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(locale.value === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function inCart(p) {
  if (!p) return false;
  return cart.value.some((item) => item.id === p.id);
}

function addToCart(p) {
  if (!p) return;
  add(p);
  showToast(t("cart.addedToCart"), "success");
}

function openConfirm(p) {
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/products/${p.id}`);
    return;
  }
  showConfirm.value = true;
}

async function doPurchase(p) {
  if (!p) return;
  buying.value = true;
  try {
    const res = await $fetch("/api/orders/create", {
      method: "POST",
      body: { product_id: p.id },
    });
    const msg =
      locale.value === "vi"
        ? "Tạo đơn hàng thành công. Bạn có thể xem trong lịch sử đơn hàng."
        : "Order created successfully. You can view it in your order history.";
    showToast(msg, "success");
    if (currentUser.value && typeof res?.newCredit === "number") {
      currentUser.value.credit = res.newCredit;
    }
  } catch (e) {
    const msg =
      e?.data?.statusMessage ||
      (locale.value === "vi"
        ? "Mua sản phẩm thất bại"
        : "Failed to purchase product");
    showToast(msg, "error");
  } finally {
    buying.value = false;
  }
}

const images = computed(() => {
  const list = [];
  if (product.value?.thumbnail_url) {
    list.push(product.value.thumbnail_url);
  }
  if (Array.isArray(product.value?.images)) {
    list.push(...product.value.images);
  }
  return list;
});

const activeImage = computed(() => {
  return images.value[currentImageIndex.value] || "";
});

const avgRatingRounded = computed(() => {
  const v = Number(reviewMeta.value?.avgRating || 0);
  return Math.max(0, Math.min(5, Math.round(v)));
});

const avgRatingText = computed(() => {
  const v = Number(reviewMeta.value?.avgRating || 0);
  if (!reviewMeta.value?.reviewCount) return "0.0";
  return v.toFixed(1);
});

function ratingPercent(star) {
  const total = Number(reviewMeta.value?.reviewCount || 0);
  if (!total) return 0;
  const c = Number(ratingCounts.value?.[String(star)] || 0);
  return Math.max(0, Math.min(100, (c / total) * 100));
}

async function fetchProduct() {
  loading.value = true;
  error.value = "";
  try {
    const id = Number(route.params.id);
    const res = await $fetch(`/api/products/${id}`);
    product.value = res?.success ? res.data : null;
    if (!product.value) {
      error.value = t("admin.noData");
    } else {
      currentImageIndex.value = 0;
    }
  } catch (e) {
    error.value = e?.data?.statusMessage || t("product.loadError");
  } finally {
    loading.value = false;
  }
}

async function fetchReviews() {
  reviewsLoading.value = true;
  try {
    const id = Number(route.params.id);
    const res = await $fetch(`/api/products/${id}/reviews`);
    if (res?.success) {
      reviews.value = Array.isArray(res.data?.items) ? res.data.items : [];
      ratingCounts.value = res.data?.ratingCounts || ratingCounts.value;
      reviewMeta.value = {
        avgRating: Number(res.data?.avgRating || 0),
        reviewCount: Number(res.data?.reviewCount || 0),
        soldCount: Number(res.data?.soldCount || 0),
      };
      canReview.value = !!res.data?.canReview;
      myReview.value = res.data?.userReview || null;
      reviewForm.rating = myReview.value?.rating || 0;
      reviewForm.comment = myReview.value?.comment || "";
    }
  } catch {
    // silent
  } finally {
    reviewsLoading.value = false;
  }
}

async function fetchSimilar() {
  similarLoading.value = true;
  try {
    const id = Number(route.params.id);
    const res = await $fetch(`/api/products/${id}/similar`);
    similarProducts.value =
      res?.success && Array.isArray(res.data) ? res.data : [];
  } catch {
    similarProducts.value = [];
  } finally {
    similarLoading.value = false;
  }
}

function setReviewRating(value) {
  reviewForm.rating = value;
}

async function submitReview() {
  if (!reviewForm.rating || submittingReview.value) return;
  submittingReview.value = true;
  try {
    const id = Number(route.params.id);
    await $fetch(`/api/products/${id}/reviews`, {
      method: "POST",
      body: {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      },
    });
    showToast(
      t("product.reviewThanks") ||
        (locale.value === "vi"
          ? "Cảm ơn bạn đã đánh giá sản phẩm."
          : "Thank you for your review."),
      "success",
    );
    await fetchReviews();
  } catch (e) {
    const msg =
      e?.data?.statusMessage ||
      (locale.value === "vi"
        ? "Không gửi được đánh giá"
        : "Failed to submit review");
    showToast(msg, "error");
  } finally {
    submittingReview.value = false;
  }
}

function setActiveImage(src) {
  if (!src) return;
  const idx = images.value.indexOf(src);
  if (idx !== -1) {
    currentImageIndex.value = idx;
  }
}

function prevImage() {
  if (!images.value.length) return;
  currentImageIndex.value =
    (currentImageIndex.value - 1 + images.value.length) % images.value.length;
}

function nextImage() {
  if (!images.value.length) return;
  currentImageIndex.value = (currentImageIndex.value + 1) % images.value.length;
}

async function initUser() {
  const role = useCookie("user_role", { path: "/" }).value;
  if (role === "user") {
    try {
      const data = await $fetch("/api/auth/me");
      if (data?.user) currentUser.value = data.user;
    } catch {
      currentUser.value = null;
    }
  } else {
    currentUser.value = null;
  }
}

onMounted(async () => {
  await Promise.all([
    fetchProduct(),
    initUser(),
    fetchReviews(),
    fetchSimilar(),
  ]);
  try {
    const res = await $fetch("/api/users/my-admin-contact");
    if (res?.success && res.data) {
      adminContact.value = res.data;
    } else {
      adminContact.value = null;
    }
  } catch {
    adminContact.value = null;
  }
});

watch(
  () => route.params.id,
  async () => {
    showConfirm.value = false;
    buying.value = false;
    currentImageIndex.value = 0;
    showContactPopup.value = false;
    await Promise.all([fetchProduct(), fetchReviews(), fetchSimilar()]);
  },
);
</script>

<style scoped>
.product-detail-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(
      circle at 20% -10%,
      rgba(1, 123, 251, 0.28),
      transparent 55%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(251, 191, 36, 0.16),
      transparent 55%
    ),
    radial-gradient(
      circle at 40% 120%,
      rgba(34, 197, 94, 0.12),
      transparent 55%
    ),
    var(--bg-deep);
  color: var(--text-primary);
}
.product-detail-page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 15% 20%,
      rgba(59, 130, 246, 0.1),
      transparent 40%
    ),
    radial-gradient(
      circle at 75% 25%,
      rgba(251, 191, 36, 0.06),
      transparent 45%
    ),
    radial-gradient(circle at 55% 78%, rgba(34, 197, 94, 0.06), transparent 45%);
  opacity: 0.9;
  filter: blur(0px);
}
.detail-main {
  flex: 1;
  padding: 96px 150px 64px; /* chừa không gian dưới header fixed */
}
.detail-hero {
  display: flex;
  gap: 22px;
  max-width: 1320px;
  margin: 0 auto;
  align-items: start;
}
.hero-left {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.hero-right {
  width: 380px;
  flex: 0 0 380px;
  position: sticky;
  top: 96px;
}
.media-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(1, 123, 251, 0.35);
  background: rgba(2, 6, 23, 0.55);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.6),
    0 0 40px rgba(1, 123, 251, 0.12);
}
.media-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 40% 0%,
    rgba(1, 123, 251, 0.08),
    transparent 55%
  );
  opacity: 0.9;
}
.detail-thumb-wrap {
  border-radius: 0;
  overflow: hidden;
  border: none;
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.9), #020617);
  position: relative;
}
.detail-thumb {
  width: 100%;
  display: block;
  object-fit: fill;
  height: 480px;
  background: #020617;
}
.detail-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  font-size: 3rem;
  font-weight: 700;
  color: var(--blue-bright);
}
.thumb-strip {
  display: flex;
  gap: 10px;
  padding: 12px;
  overflow-x: auto;
}
.thumb-strip::-webkit-scrollbar {
  height: 8px;
}
.thumb-strip::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
}
.thumb-strip::-webkit-scrollbar-track {
  background: rgba(2, 6, 23, 0.35);
}
.section-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.thumb-btn {
  flex: 0 0 auto;
  width: 86px;
  height: 62px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(2, 6, 23, 0.65);
  overflow: hidden;
  cursor: pointer;
  opacity: 0.9;
  transition:
    transform 0.12s ease,
    border-color 0.12s ease,
    opacity 0.12s ease;
}
.thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-btn:hover {
  opacity: 1;
  transform: translateY(-1px);
}
.thumb-btn.active {
  border-color: rgba(1, 123, 251, 0.85);
  box-shadow: 0 0 0 2px rgba(1, 123, 251, 0.18);
}
.image-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.8);
  background: rgba(15, 23, 42, 0.85);
  color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(15, 23, 42, 0.9);
  transition:
    transform 0.12s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}
.image-nav:hover {
  transform: translateY(-50%) scale(1.03);
  background: rgba(2, 6, 23, 0.92);
  border-color: rgba(1, 123, 251, 0.7);
}
.image-nav--left {
  left: 12px;
}
.image-nav--right {
  right: 12px;
}
.buy-card {
  padding: 14px 14px 12px;
  border-radius: 18px;
  border: 1px solid rgba(1, 123, 251, 0.35);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 30px rgba(1, 123, 251, 0.15);
}
.buy-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 18px;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgba(1, 123, 251, 0.3),
    rgba(251, 191, 36, 0.12),
    rgba(34, 197, 94, 0.1)
  );
  opacity: 0.32;
  filter: blur(14px);
}
.media-card,
.buy-card,
.detail-panels,
.reviews-summary,
.review-item,
.similar-card {
  position: relative;
}
.buy-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.detail-badge-main {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.15);
  color: #bbf7d0;
  font-size: 0.75rem;
  font-weight: 600;
}
.detail-badge-type {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.detail-title {
  margin: 0 0 8px;
  font-size: 1.55rem;
  font-weight: 750;
  line-height: 1.25;
}
.detail-short {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}
.detail-short.muted {
  opacity: 0.8;
}
.buy-meta {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(2, 6, 23, 0.35);
  margin-bottom: 12px;
}
.buy-stars {
  display: flex;
  align-items: center;
  gap: 8px;
}
.star {
  font-size: 0.95rem;
  color: rgba(148, 163, 184, 0.45);
}
.star.on {
  color: #fbbf24;
  text-shadow: 0 0 14px rgba(251, 191, 36, 0.18);
}
.buy-score {
  font-weight: 700;
  color: #e5e7eb;
}
.buy-sub {
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.dot {
  display: inline-block;
  margin: 0 8px;
  opacity: 0.7;
}
.buy-price {
  margin-bottom: 12px;
}
.buy-price .price {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.unit {
  margin-left: 6px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.btn-primary {
  padding: 0.6rem 1.6rem;
  background: linear-gradient(
    135deg,
    rgba(1, 123, 251, 1),
    rgba(56, 189, 248, 0.95)
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(1, 123, 251, 0.4);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    filter 0.12s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 24px rgba(1, 123, 251, 0.48);
  filter: saturate(1.03);
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}
.btn-ghost {
  padding: 0.55rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.8);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
}
.btn-ghost:hover {
  transform: translateY(-1px);
  background: rgba(2, 6, 23, 0.88);
  border-color: rgba(1, 123, 251, 0.35);
}
.detail-long-text {
  margin: 0;
  white-space: pre-line;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.detail-state {
  padding: 60px 0;
  text-align: center;
  color: var(--text-secondary);
}

.buy-highlights {
  display: grid;
  gap: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  padding-top: 12px;
}
.hl {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.9rem;
}
.hl-k {
  color: var(--text-muted);
}
.hl-v {
  color: #e5e7eb;
  font-weight: 600;
}

.hl--contact {
  align-items: center;
}

.support-admin-name {
  margin-right: 6px;
}

.support-show-btn {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
}

.detail-panels {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(2, 6, 23, 0.3);
  backdrop-filter: blur(10px);
  overflow: hidden;
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tab-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(1, 123, 251, 0.16);
  border: 1px solid rgba(1, 123, 251, 0.25);
  color: #bfdbfe;
  font-size: 0.75rem;
  font-weight: 700;
}
.panel-card {
  padding: 14px;
}
.panel-state {
  padding: 22px 12px;
  color: var(--text-secondary);
  text-align: center;
}

.reviews-summary {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 14px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(2, 6, 23, 0.35);
  margin-bottom: 14px;
}
.avg-score {
  font-size: 2.1rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}
.avg-stars {
  margin-top: 4px;
}
.avg-sub {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.bars {
  display: grid;
  gap: 8px;
  align-content: start;
}
.bar-row {
  display: grid;
  grid-template-columns: 16px 1fr 40px;
  gap: 10px;
  align-items: center;
}
.bar-label {
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
}
.bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(251, 191, 36, 0.95),
    rgba(1, 123, 251, 0.95)
  );
}
.bar-count {
  text-align: right;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.reviews-list {
  display: grid;
  gap: 10px;
}
.review-item {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.35);
  padding: 12px;
}
.review-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.review-left {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.review-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #e5e7eb;
  background: radial-gradient(
    circle at 30% 20%,
    rgba(1, 123, 251, 0.35),
    rgba(2, 6, 23, 0.7)
  );
  border: 1px solid rgba(1, 123, 251, 0.25);
  flex: 0 0 auto;
}
.review-ident {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.review-user {
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
}
.review-stars {
  display: flex;
  gap: 2px;
  align-items: center;
}
.review-time {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.review-rating-num {
  margin-left: 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.review-text {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.45;
  white-space: pre-line;
}

.review-form {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed rgba(148, 163, 184, 0.3);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-form-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.review-form-stars {
  display: flex;
  gap: 4px;
}

.star-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.9);
  color: rgba(148, 163, 184, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease,
    transform 0.12s ease;
}

.star-btn.on {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.7);
  color: #facc15;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.6);
}

.star-btn:hover {
  transform: translateY(-1px);
}

.review-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 8px 10px;
  resize: vertical;
  min-height: 70px;
}

.review-textarea::placeholder {
  color: var(--text-muted);
}

.review-form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.review-form-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.similar-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.similar-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.35);
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.12s ease,
    border-color 0.12s ease;
}
.similar-card:hover {
  transform: translateY(-1px);
  border-color: rgba(1, 123, 251, 0.55);
}
.similar-thumb {
  width: 100%;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.similar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.similar-thumb.placeholder {
  color: #bfdbfe;
  font-weight: 900;
}
.similar-chip {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: #e5e7eb;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.similar-name {
  font-weight: 800;
  line-height: 1.25;
  margin-bottom: 2px;
}
.similar-desc {
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.similar-price {
  margin-top: auto;
  font-weight: 900;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.similar-price .price-num {
  font-size: 1.05rem;
}

.detail-contact-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.detail-contact-modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border-radius: 1rem;
  padding: 1.5rem 1.75rem;
  box-shadow: var(--neon-shadow);
  border: 1px solid rgba(1, 123, 251, 0.45);
}

.detail-contact-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.detail-contact-sub {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.detail-contact-text {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.detail-contact-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

@media (max-width: 1024px) {
  .detail-main {
    padding: 24px 20px 40px;
  }
  .detail-hero {
    flex-direction: column;
    gap: 24px;
  }
  .hero-right {
    width: 100%;
    position: static;
  }
  .similar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .reviews-summary {
    grid-template-columns: 1fr;
  }
}
</style>

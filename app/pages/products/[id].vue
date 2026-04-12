<template>
  <div class="product-detail-page" v-if="!loading && product">
    <SiteHeader />

    <main class="detail-main">
      <section class="detail-hero">
        <section class="hero-left">
          <div class="media-card">
            <div class="media-view-tabs" v-if="hasVideo || images.length">
              <button
                type="button"
                class="media-view-tab"
                :class="{ active: mediaView === 'image' }"
                @click="mediaView = 'image'"
              >
                {{ $t("product.viewImages") || "Xem ảnh" }}
              </button>
              <button
                v-if="hasVideo"
                type="button"
                class="media-view-tab"
                :class="{ active: mediaView === 'video' }"
                @click="mediaView = 'video'"
              >
                {{ $t("product.viewVideo") || "Xem video" }}
              </button>
            </div>

            <template v-if="mediaView === 'image'">
              <div class="detail-thumb-wrap" v-if="activeImage">
                <button
                  v-if="images.length > 1"
                  type="button"
                  class="image-nav image-nav--left"
                  @click.stop="prevImage"
                >
                  ‹
                </button>
                <NuxtImg
                  :src="activeImage"
                  :alt="product.name"
                  class="detail-thumb"
                  loading="lazy"
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
                  <NuxtImg
                    :src="img"
                    :alt="product.name + ' thumb ' + (idx + 1)"
                    loading="lazy"
                  />
                </button>
              </div>
            </template>

            <template v-else-if="mediaView === 'video' && activeVideoId">
              <div class="detail-video-wrap">
                <iframe
                  :src="`https://www.youtube.com/embed/${activeVideoId}?autoplay=0`"
                  class="detail-video-iframe"
                  title="Video sản phẩm"
                  allow="
                    accelerometer;
                    autoplay;
                    clipboard-write;
                    encrypted-media;
                    gyroscope;
                    picture-in-picture;
                  "
                  allowfullscreen
                />
              </div>
              <div v-if="videoIds.length > 1" class="thumb-strip video-thumb-strip">
                <button
                  v-for="(vid, idx) in videoIds"
                  :key="vid + idx"
                  type="button"
                  class="thumb-btn video-thumb-btn"
                  :class="{ active: idx === currentVideoIndex }"
                  @click="setActiveVideo(idx)"
                  :aria-label="`video-thumb-${idx + 1}`"
                >
                  <NuxtImg
                    :src="`https://img.youtube.com/vi/${vid}/mqdefault.jpg`"
                    :alt="product.name + ' video ' + (idx + 1)"
                    loading="lazy"
                  />
                  <span class="video-play-icon">▶</span>
                </button>
              </div>
            </template>
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
                    <NuxtImg
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
              <span class="detail-badge-type">
                {{ (product.type || "tool").toUpperCase() }}
              </span>
              <span v-if="isOutOfStock" class="detail-badge-out-of-stock">
                {{ $t("product.outOfStock") || "Hết hàng" }}
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
                {{ formatVnd(lineTotalPrice) }}
                <span class="unit">{{ $t("product.points") }}</span>
              </div>
              <p v-if="stockForSelected != null" class="buy-stock-hint">
                {{ $t("product.stockRemaining") || "Còn dư" }}:
                {{ stockForSelected }}
              </p>
              <div class="buy-meta-row">
                <div class="buy-meta-col">
                  <label class="buy-duration-label">Loại key</label>
                  <select
                    v-model="selectedDuration"
                    class="buy-duration-select"
                  >
                    <option
                      v-for="opt in durationOptions"
                      :key="opt"
                      :value="opt"
                    >
                      {{ formatDuration(opt) }}
                    </option>
                  </select>
                </div>
                <div class="buy-meta-col">
                  <label class="buy-qty-label">Số lượng</label>
                  <input
                    v-model.number="quantity"
                    type="number"
                    :min="maxQty >= 1 ? 1 : 0"
                    :max="maxQty"
                    class="buy-qty-input"
                    @input="clampQuantity"
                  />
                </div>
              </div>
            </div>

            <div class="detail-actions">
              <button
                type="button"
                class="btn-ghost"
                :disabled="isOutOfStock || buying"
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
                :disabled="buying || isOutOfStock"
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
              <div class="hl hl--contact">
                <div class="hl-k">{{ $t("product.supportContact") }}</div>
                <div class="hl-v">
                  <button
                    type="button"
                    class="support-show-btn"
                    @click="openProductChat"
                  >
                    {{ $t("product.viewContact") }}
                    <span
                      v-if="productChatHasUnread > 0"
                      class="support-unread-badge"
                    >
                      {{ productChatHasUnread }}
                    </span>
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
      :quantity="quantity"
      @update:quantity="onConfirmQuantityUpdate"
      @confirm="doPurchase"
    />

    <!-- Chat hỗ trợ sản phẩm: tái sử dụng layout mini giống ContactBubble -->
    <Teleport to="body">
      <div
        v-if="product && productChatThreadId"
        class="detail-contact-overlay"
        v-show="productChatOpen"
        @click.self="productChatOpen = false"
      >
        <div class="detail-contact-modal detail-contact-modal--chat">
          <header class="detail-contact-header">
            <div class="detail-contact-header-main">
              <h3 class="detail-contact-title">
                {{
                  $t("product.supportChatTitle") || $t("product.supportContact")
                }}
                – {{ product.name }}
              </h3>
              <p class="detail-contact-sub">
                {{
                  $t("product.supportChatSubtitle") ||
                  "Trao đổi trực tiếp với admin phụ trách sản phẩm này."
                }}
              </p>
            </div>
            <button
              type="button"
              class="detail-contact-close"
              @click="productChatOpen = false"
            >
              ×
            </button>
          </header>
          <div class="detail-contact-chat">
            <div ref="productChatMessagesEl" class="detail-contact-messages">
              <div
                v-for="m in productChatMessages"
                :key="m.id"
                class="detail-contact-message"
                :class="{
                  'detail-contact-message--mine': m.sender_type === 'user',
                }"
              >
                <div class="detail-contact-message-content">
                  <img
                    v-if="m.imageUrl"
                    :src="m.imageUrl"
                    class="detail-contact-chat-image"
                    alt="Ảnh"
                    loading="lazy"
                  />
                  <span v-if="m.content">{{ m.content }}</span>
                </div>
              </div>
              <div
                v-if="!productChatMessages.length"
                class="detail-contact-empty"
              >
                {{ $t("profile.adminContactEmpty") }}
              </div>
            </div>
            <div class="detail-contact-input-row">
              <input
                v-model="productChatDraft"
                type="text"
                class="detail-contact-input"
                :placeholder="
                  $t('product.supportChatPlaceholder') ||
                  'Nhập nội dung cần hỗ trợ...'
                "
                @keyup.enter="sendProductChat"
                @paste="onProductChatPaste"
              />
              <button
                type="button"
                class="detail-contact-image-btn"
                :disabled="productChatSending || productChatUploadingImage"
                aria-label="Gửi ảnh"
                @click="triggerProductChatImagePick"
              >
                📷
              </button>
              <input
                ref="productChatFileInputEl"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onProductChatFileSelected"
              />
              <button
                type="button"
                class="detail-contact-send-btn"
                :disabled="productChatSending || !productChatDraft.trim()"
                @click="sendProductChat"
              >
                ➤
              </button>
            </div>
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

<script setup lang="ts">
import { nextTick, watch } from "vue";
import { defineAsyncComponent } from "vue";
import SiteHeader from "~/components/SiteHeader.vue";
import { setProductRef, getProductRef } from "~/composables/useProductRef";
import { isCustomerRole } from "~/composables/useCustomerRole";
const ConfirmPurchaseModal = defineAsyncComponent(
  () => import("~/components/product/ConfirmPurchaseModal.vue"),
);

const route = useRoute();
const { locale, t } = useI18n();
const { show: showToast } = useToast();
const { cart, add } = useCart();

const product = ref<any | null>(null);
const currentImageIndex = ref(0);
const currentVideoIndex = ref(0);
const mediaView = ref("image");
const loading = ref(true);
const error = ref("");
const currentUser = ref(null);
const showConfirm = ref(false);
const buying = ref(false);

// Chat hỗ trợ sản phẩm
const productChatOpen = ref(false);
const productChatThreadId = ref(null);
const productChatMessages = ref([]);
const productChatDraft = ref("");
const productChatSending = ref(false);
const productChatUploadingImage = ref(false);
const productChatFileInputEl = ref<HTMLInputElement | null>(null);
const productChatMessagesEl = ref(null);
const productChatLastSeen = ref(0);
const productChatHasUnread = ref(0);

let productChatWs = null;
let productChatWsReconnectTimer = null;
let productChatWsManuallyClosed = false;
let productChatWsConnected = false;
let productChatWsAuthToken = "";

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

const selectedDuration = ref<string>("2h");
const quantity = ref<number>(1);

const durationOptions = computed<string[]>(() => {
  const map = product.value?.duration_prices || {};
  const keys = Object.keys(map || {});
  if (keys.length) return keys;
  return ["2h", "12h", "1d", "3d", "7d", "10d", "30d", "90d", "lifetime"];
});

const currentPrice = computed<number>(() => {
  const map = product.value?.duration_prices || {};
  const opts = durationOptions.value;
  if (!opts.length) return Number(product.value?.price || 0);
  const current =
    selectedDuration.value && opts.includes(selectedDuration.value)
      ? selectedDuration.value
      : opts.includes("2h")
        ? "2h"
        : opts[0];
  if (!selectedDuration.value || selectedDuration.value !== current) {
    selectedDuration.value = current;
  }
  const val = map[current];
  if (typeof val === "number") return val;
  return Number(product.value?.price || 0);
});

const durationStock = computed<Record<string, number>>(
  () => product.value?.duration_stock || {},
);
const stockForSelected = computed<number>(() => {
  const d = selectedDuration.value;
  if (!d) return 0;
  const stock = durationStock.value[d];
  return typeof stock === "number" ? stock : 0;
});
const totalStock = computed<number>(() => {
  const s = durationStock.value;
  return Object.values(s).reduce((sum, n) => sum + (Number(n) || 0), 0);
});
const isOutOfStock = computed<boolean>(
  () => totalStock.value <= 0 || stockForSelected.value <= 0,
);
const maxQty = computed<number>(() => {
  const s = stockForSelected.value;
  if (s <= 0) return 0;
  return Math.min(100, s);
});

/** Đơn giá × số lượng (đồng bộ logic clamp với ô nhập / giỏ hàng) */
const lineTotalPrice = computed<number>(() => {
  const unit = Number(currentPrice.value) || 0;
  const max = maxQty.value;
  let q = Number(quantity.value);
  if (!Number.isFinite(q) || q < 0) q = max >= 1 ? 1 : 0;
  if (max >= 1 && q > max) q = max;
  if (max <= 0) q = 0;
  return unit * q;
});

function clampQuantity() {
  const max = maxQty.value;
  const q = quantity.value;
  if (typeof q !== "number" || !Number.isFinite(q) || q < 0) {
    quantity.value = max >= 1 ? 1 : 0;
    return;
  }
  if (q > max) quantity.value = max;
}

function onConfirmQuantityUpdate(val: unknown) {
  const n = Number(val);
  quantity.value = Number.isFinite(n) && n > 0 ? n : 1;
  clampQuantity();
}

watch(selectedDuration, () => clampQuantity());
watch(maxQty, () => clampQuantity());

async function loadProductChatMessages() {
  if (!productChatThreadId.value) return;
  try {
    const res = await $fetch(
      `/api/support/threads/${productChatThreadId.value}`,
    );
    if (res?.success && Array.isArray(res.messages)) {
      productChatMessages.value = res.messages;
      if (productChatMessagesEl.value) {
        await nextTick();
        productChatMessagesEl.value.scrollTop =
          productChatMessagesEl.value.scrollHeight || 0;
        setTimeout(() => {
          if (!productChatMessagesEl.value) return;
          productChatMessagesEl.value.scrollTop =
            productChatMessagesEl.value.scrollHeight || 0;
        }, 50);
      }
      // cập nhật trạng thái đã đọc khi đang mở
      if (res.messages.length) {
        const last = res.messages[res.messages.length - 1];
        const lastAt = new Date(last.created_at || last.createdAt).getTime();
        if (productChatOpen.value) {
          productChatLastSeen.value = lastAt;
          productChatHasUnread.value = 0;
        }
      } else {
        productChatHasUnread.value = 0;
      }
    }
  } catch {
    // ignore
  }
}

async function openProductChat() {
  if (!product.value?.id) return;
  try {
    const res = await $fetch("/api/support/thread", {
      method: "POST",
      body: { topic: "product", product_id: product.value.id },
    });
    if (res?.success && res.threadId) {
      productChatThreadId.value = res.threadId;
      await loadProductChatMessages();
      productChatOpen.value = true;
      if (productChatMessagesEl.value) {
        await nextTick();
        productChatMessagesEl.value.scrollTop =
          productChatMessagesEl.value.scrollHeight || 0;
      }
      // sau khi mở lần đầu, coi như đã đọc tới tin mới nhất
      if (productChatMessages.value.length) {
        const last =
          productChatMessages.value[productChatMessages.value.length - 1];
        const lastAt = new Date(last.created_at || last.createdAt).getTime();
        productChatLastSeen.value = lastAt;
        productChatHasUnread.value = 0;
      }
      setupProductChatWebSocket();
    }
  } catch (e) {
    showToast(
      t("auth.unauthorized") || "Vui lòng đăng nhập để chat với hỗ trợ",
      "error",
    );
    const route = useRoute();
    navigateTo(
      `/login?next=${route.fullPath || `/products/${route.params.id}`}`,
    );
  }
}

function triggerProductChatImagePick() {
  if (productChatSending.value || productChatUploadingImage.value) return;
  productChatFileInputEl.value?.click();
}

async function onProductChatFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type?.startsWith("image/")) return;
  try {
    await handleProductChatSelectedImageFile(file);
  } finally {
    if (input) input.value = "";
  }
}

function getImageFileFromClipboardData(clipboardData: DataTransfer | null) {
  if (!clipboardData) return null;
  const items = clipboardData.items;
  if (items && items.length) {
    for (const item of Array.from(items)) {
      const kind = item?.kind;
      const type = item?.type;
      if (kind === "file" && type && String(type).startsWith("image/")) {
        const file = item.getAsFile?.();
        if (file) return file;
      }
    }
  }
  const files = clipboardData.files;
  if (files && files.length) {
    const file = files[0];
    if (file && file.type && String(file.type).startsWith("image/")) return file;
  }
  return null;
}

async function handleProductChatSelectedImageFile(file: File) {
  if (!productChatThreadId.value || productChatSending.value) return;
  if (!file?.type?.startsWith("image/")) return;

  productChatUploadingImage.value = true;
  try {
    const fd = new FormData();
    fd.append("file", file);

    const res = await $fetch("/api/upload/chat-image", {
      method: "POST",
      body: fd,
    });

    const url = String(res?.url || "");
    if (!url) return;

    const caption = productChatDraft.value.trim();
    await sendProductChatMessage({ contentText: caption, imageUrl: url });
  } finally {
    productChatUploadingImage.value = false;
  }
}

async function onProductChatPaste(e: ClipboardEvent) {
  if (productChatSending.value || productChatUploadingImage.value) return;
  if (!productChatThreadId.value) return;

  const file = getImageFileFromClipboardData(e?.clipboardData || null);
  if (!file) return;

  e.preventDefault();
  await handleProductChatSelectedImageFile(file);
}

async function sendProductChatMessage({
  contentText,
  imageUrl = "",
}: {
  contentText: string;
  imageUrl?: string;
}) {
  if (!productChatThreadId.value || productChatSending.value) return;

  const text = String(contentText || "").trim();
  const safeImageUrl = String(imageUrl || "").trim();
  if (!text && !safeImageUrl) return;

  productChatSending.value = true;
  try {
    if (
      productChatWs &&
      productChatWs.readyState === WebSocket.OPEN &&
      productChatWsConnected
    ) {
      productChatWs.send(
        JSON.stringify({
          type: "message",
          threadId: productChatThreadId.value,
          content: text,
          imageUrl: safeImageUrl || undefined,
        }),
      );
      productChatDraft.value = "";
    } else {
      // Fallback: keep UX working if WS chưa sẵn sàng.
      await $fetch("/api/support/messages", {
        method: "POST",
        body: {
          thread_id: productChatThreadId.value,
          content: text,
          imageUrl: safeImageUrl || undefined,
        },
      });
      productChatDraft.value = "";
      await loadProductChatMessages();
    }
  } catch {
    // ignore
  } finally {
    productChatSending.value = false;
  }
}

async function sendProductChat() {
  if (!productChatThreadId.value || productChatSending.value) return;
  const text = productChatDraft.value.trim();
  if (!text) return;
  await sendProductChatMessage({ contentText: text });
}

function setupProductChatWebSocket() {
  if (typeof window === "undefined") return;
  if (!productChatThreadId.value) return;

  if (
    productChatWs &&
    (productChatWs.readyState === WebSocket.OPEN ||
      productChatWs.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  productChatWsManuallyClosed = false;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/support`;

  productChatWs = new WebSocket(url);

  productChatWs.addEventListener("open", () => {
    if (productChatWsReconnectTimer) {
      clearTimeout(productChatWsReconnectTimer);
      productChatWsReconnectTimer = null;
    }
    productChatWsConnected = false;
    productChatWsAuthToken = "";

    $fetch("/api/support/ws-token")
      .then((res) => {
        productChatWsAuthToken = String(res?.token || "");
      })
      .finally(() => {
        if (!productChatWsAuthToken) {
          try {
            productChatWs.close();
          } catch {}
          return;
        }
        productChatWs.send(
          JSON.stringify({
            type: "auth",
            token: productChatWsAuthToken,
          }),
        );
      });
  });

  productChatWs.addEventListener("message", async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.type === "auth_ok") {
        productChatWsConnected = true;
        if (productChatThreadId.value && productChatWs) {
          productChatWs.send(
            JSON.stringify({
              type: "subscribe",
              threadId: productChatThreadId.value,
            }),
          );
        }
        return;
      }
      if (data?.type === "error") {
        productChatWsConnected = false;
        return;
      }
      if (
        data.type === "support_message" &&
        Number(data.threadId) === Number(productChatThreadId.value) &&
        data.message
      ) {
        productChatMessages.value.push(data.message);
        if (productChatMessagesEl.value) {
          await nextTick();
          productChatMessagesEl.value.scrollTop =
            productChatMessagesEl.value.scrollHeight || 0;
        }
        const lastAt = new Date(
          data.message.created_at || data.message.createdAt,
        ).getTime();
        if (productChatOpen.value) {
          productChatLastSeen.value = lastAt;
          productChatHasUnread.value = 0;
        } else if (lastAt > productChatLastSeen.value) {
          productChatHasUnread.value += 1;
        }
      }
    } catch {
      // ignore
    }
  });

  productChatWs.addEventListener("close", () => {
    productChatWs = null;
    productChatWsConnected = false;
    if (!productChatWsManuallyClosed) {
      productChatWsReconnectTimer = setTimeout(() => {
        setupProductChatWebSocket();
      }, 5000);
    }
  });

  productChatWs.addEventListener("error", () => {
    try {
      productChatWs && productChatWs.close();
    } catch {
      // ignore
    }
  });
}

watch(
  () => productChatOpen.value,
  async (val) => {
    if (val && productChatMessagesEl.value) {
      await nextTick();
      productChatMessagesEl.value.scrollTop =
        productChatMessagesEl.value.scrollHeight || 0;
    }
  },
);

watch(
  () => productChatMessages.value.length,
  async () => {
    if (productChatOpen.value && productChatMessagesEl.value) {
      await nextTick();
      productChatMessagesEl.value.scrollTop =
        productChatMessagesEl.value.scrollHeight || 0;
    }
  },
);

onUnmounted(() => {
  productChatWsManuallyClosed = true;
  if (productChatWsReconnectTimer) {
    clearTimeout(productChatWsReconnectTimer);
    productChatWsReconnectTimer = null;
  }
  if (productChatWs) {
    try {
      productChatWs.close();
    } catch {
      // ignore
    }
    productChatWs = null;
  }
});

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDuration(v) {
  if (v === "lifetime") return "Lifetime";
  return String(v)
    .replace(/\b(\d+)\s*d\b/gi, "$1 ngày")
    .replace(/\b(\d+)\s*h\b/gi, "$1 giờ");
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
  clampQuantity();
  const duration = selectedDuration.value || null;
  const qty = quantity.value || 1;
  const safeQty =
    !Number.isFinite(Number(qty)) || Number(qty) <= 0
      ? 1
      : Math.min(maxQty.value, 100, Number(qty));

  add(
    {
      ...p,
      price: currentPrice.value,
    },
    {
      duration,
      qty: safeQty,
    },
  );
  showToast(t("cart.addedToCart"), "success");
}

function openConfirm(p) {
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/cart`);
    return;
  }
  clampQuantity();
  const duration = selectedDuration.value || null;
  const qty = quantity.value || 1;
  const safeQty =
    !Number.isFinite(Number(qty)) || Number(qty) <= 0
      ? 1
      : Math.min(maxQty.value, 100, Number(qty));

  // Nút Mua ngay: thêm vào giỏ và chuyển sang trang giỏ hàng
  add(
    {
      ...p,
      price: currentPrice.value,
    },
    {
      duration,
      qty: safeQty,
    },
  );
  navigateTo("/cart");
}

async function doPurchase(payload) {
  const p = payload?.product || payload;
  const duration = payload?.duration || null;
  const qty = payload?.quantity || quantity.value || 1;
  if (!p) return;
  buying.value = true;
  try {
    let sellerRef: string | undefined;
    if (route.query.ref && typeof route.query.ref === "string") {
      const fromUrl = String(route.query.ref).trim();
      if (fromUrl) {
        setProductRef(p.id, fromUrl);
        sellerRef = fromUrl;
      }
    } else {
      const stored = getProductRef(p.id);
      if (stored) sellerRef = stored;
    }
    const res = await $fetch("/api/orders/create", {
      method: "POST",
      body: { product_id: p.id, duration, quantity: qty, ...(sellerRef ? { seller_ref: sellerRef } : {}) },
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

function getYoutubeVideoId(url: string) {
  if (!url || typeof url !== "string") return "";
  const u = String(url).trim();
  const idOnly = u.match(/^[a-zA-Z0-9_-]{11}$/);
  if (idOnly) return idOnly[0];
  const m = u.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : "";
}

function extractYoutubeVideoIds(raw: string) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const ids: string[] = [];

  // Ưu tiên mỗi dòng 1 link; vẫn hỗ trợ trường hợp dán lộn nhiều link cùng dòng.
  const lines = text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter((s) => !!s);

  for (const line of lines) {
    const direct = getYoutubeVideoId(line);
    if (direct) {
      ids.push(direct);
      continue;
    }

    // Quét toàn dòng để bắt nhiều URL/ID YouTube nếu có.
    const rx =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})|(?:^|\s)([a-zA-Z0-9_-]{11})(?=$|\s)/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(line)) !== null) {
      const id = m[1] || m[2];
      if (id) ids.push(id);
    }
  }

  return Array.from(new Set(ids));
}

const videoIds = computed<string[]>(() => {
  const raw = String(product.value?.youtube_url || "").trim();
  if (!raw) return [];
  return extractYoutubeVideoIds(raw);
});

const hasVideo = computed(() => videoIds.value.length > 0);
const activeVideoId = computed(() => {
  return videoIds.value[currentVideoIndex.value] || videoIds.value[0] || "";
});

function setActiveVideo(idx: number) {
  if (idx < 0 || idx >= videoIds.value.length) return;
  currentVideoIndex.value = idx;
}

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

async function fetchProduct(opts?: { silent?: boolean }) {
  const id = Number(route.params.id);
  const silent = !!opts?.silent;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const url = silent ? `/api/products/${id}?refresh=1` : `/api/products/${id}`;
    const res = await $fetch(url);
    product.value = res?.success ? res.data : null;
    if (!silent) {
      if (!product.value) {
        error.value = t("admin.noData");
      } else {
        currentImageIndex.value = 0;
        currentVideoIndex.value = 0;
        mediaView.value = "image";
      }
    }
  } catch (e) {
    if (!silent) error.value = e?.data?.statusMessage || t("product.loadError");
  } finally {
    if (!silent) loading.value = false;
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
  if (isCustomerRole(role)) {
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

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([
    fetchProduct(),
    initUser(),
    fetchReviews(),
    fetchSimilar(),
  ]);
  // Lưu ref theo sản phẩm nếu truy cập qua link có ?ref=
  if (route.query.ref && typeof route.query.ref === "string") {
    const fromUrl = String(route.query.ref).trim();
    if (fromUrl) {
      const pid = Number(route.params.id || product.value?.id);
      if (pid) setProductRef(pid, fromUrl);
    }
  }
  autoRefreshTimer = setInterval(() => {
    fetchProduct({ silent: true });
  }, 5000);
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

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});

watch(
  () => route.params.id,
  async () => {
    showConfirm.value = false;
    buying.value = false;
    currentImageIndex.value = 0;
    currentVideoIndex.value = 0;
    mediaView.value = "image";
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
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  background: rgba(2, 6, 23, 0.55);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.6),
    0 0 40px rgb(var(--accent-rgb) / 0.12);
}
.media-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 40% 0%,
    rgb(var(--accent-rgb) / 0.08),
    transparent 55%
  );
  opacity: 0.9;
}

.media-view-tabs {
  display: flex;
  gap: 0;
  padding: 0 12px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.media-view-tab {
  padding: 8px 16px;
  border: none;
  border-radius: 10px 10px 0 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.media-view-tab:hover {
  color: var(--text-primary);
  background: rgb(var(--accent-rgb) / 0.1);
}

.media-view-tab.active {
  background: rgb(var(--accent-rgb) / 0.2);
  color: #bfdbfe;
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  border-bottom-color: transparent;
  margin-bottom: -1px;
}

.detail-video-wrap {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  background: #000;
}

.detail-video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
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
  border-color: rgb(var(--accent-rgb) / 0.85);
  box-shadow: 0 0 0 2px rgb(var(--accent-rgb) / 0.18);
}
.video-thumb-strip {
  padding-top: 10px;
}
.video-thumb-btn {
  position: relative;
}
.video-play-icon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.75);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
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
  border-color: rgb(var(--accent-rgb) / 0.7);
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
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 30px rgb(var(--accent-rgb) / 0.15);
}
.buy-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 18px;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgb(var(--accent-rgb) / 0.3),
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
.detail-badge-out-of-stock {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 8px;
}
.detail-title {
  margin: 0 0 8px;
  font-size: 1.55rem;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: 0.01em;
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
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.buy-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.buy-meta-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.buy-duration-label,
.buy-qty-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.buy-stock-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.buy-duration-select,
.buy-qty-input {
  min-width: 140px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.95);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.buy-duration-select:focus,
.buy-qty-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.9);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.65);
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.detail-actions .btn-primary,
.detail-actions .btn-secondary {
  min-height: 42px;
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
  background: rgb(var(--accent-rgb) / 0.16);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
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
    rgb(var(--accent-rgb) / 0.95)
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
    rgb(var(--accent-rgb) / 0.35),
    rgba(2, 6, 23, 0.7)
  );
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
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
  border-color: rgb(var(--accent-rgb) / 0.55);
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
  max-width: 550px;
  background:
    radial-gradient(
      circle at top left,
      rgba(56, 189, 248, 0.18),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(37, 99, 235, 0.22),
      var(--bg-card)
    );
  border-radius: 1rem;
  padding: 1.5rem 1.75rem;
  box-shadow: var(--neon-shadow);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
}

.detail-contact-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.detail-contact-header-main {
  flex: 1;
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

.detail-contact-close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.3rem;
  cursor: pointer;
}

.detail-contact-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

/* Chat hỗ trợ sản phẩm */
.detail-contact-chat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 0.35rem;
}

.detail-contact-messages {
  height: 380px;
  padding: 6px 6px 6px 4px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(30, 64, 175, 0.7);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.9);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-contact-messages::-webkit-scrollbar {
  width: 3px;
}

.detail-contact-messages::-webkit-scrollbar-track {
  background: transparent;
}

.detail-contact-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}

.detail-contact-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.detail-contact-message {
  max-width: 88%;
  align-self: flex-start;
}

.detail-contact-message--mine {
  align-self: flex-end;
}

.detail-contact-message-content {
  padding: 6px 9px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(51, 65, 85, 0.9);
  font-size: 0.82rem;
  line-height: 1.45;
}

.detail-contact-chat-image {
  max-width: 260px;
  max-height: 260px;
  width: auto;
  height: auto;
  border-radius: 10px;
  display: block;
  margin: 0 0 6px;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.detail-contact-message--mine .detail-contact-message-content {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.95),
    rgba(56, 189, 248, 0.95)
  );
  border-color: rgba(59, 130, 246, 0.9);
  color: #e5f3ff;
}

.detail-contact-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.detail-contact-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-contact-image-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.65);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.detail-contact-image-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-contact-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 6px 10px;
}

.detail-contact-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.detail-contact-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.support-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .detail-main {
    padding: 92px 20px 40px;
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

@media (max-width: 640px) {
  .detail-main {
    padding: 92px 12px 28px;
  }
  .detail-hero {
    gap: 14px;
  }
  .detail-thumb {
    height: 220px;
    object-fit: cover;
  }
  .thumb-strip {
    padding: 8px;
    gap: 8px;
  }
  .thumb-btn {
    width: 70px;
    height: 52px;
  }
  .buy-card {
    padding: 12px 10px;
    border-radius: 14px;
  }
  .detail-title {
    font-size: 1.28rem;
    margin-bottom: 6px;
  }
  .detail-short {
    font-size: 0.86rem;
    margin-bottom: 12px;
  }
  .buy-price .price {
    font-size: 1.45rem;
  }
  .buy-meta-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .buy-duration-select,
  .buy-qty-input {
    min-width: 0;
    width: 100%;
  }
  .detail-actions {
    margin-bottom: 14px;
  }
  .detail-actions .btn-primary,
  .detail-actions .btn-secondary {
    width: 100%;
  }
  .detail-panels {
    border-radius: 14px;
    padding: 12px;
  }
  .panel-card {
    padding: 10px;
  }
  .review-item {
    padding: 10px;
  }
  .similar-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .detail-main {
    padding: 88px 10px 18px;
  }
  .media-card,
  .buy-card,
  .detail-panels,
  .panel-card,
  .review-item,
  .similar-card {
    border-radius: 12px;
  }
  .detail-actions .btn-primary,
  .detail-actions .btn-secondary {
    min-height: 40px;
  }
  .review-textarea {
    font-size: 16px;
  }
}
</style>

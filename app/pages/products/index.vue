<template>
  <div class="products-page">
    <SiteHeader />

    <main class="products-main">
      <section class="products-hero">
        <div class="products-hero-inner">
          <div>
            <h1 class="products-hero-title">{{ $t("product.heroTitle") }}</h1>
            <p class="products-hero-subtitle">
              {{ $t("product.heroSubtitle") }}
            </p>
          </div>
          <div class="products-hero-tags">
            <span class="hero-tag">⚡ {{ $t("product.tagInstant") }}</span>
            <span class="hero-tag">🛡 {{ $t("product.tagSafe") }}</span>
            <span class="hero-tag">🤝 {{ $t("product.tagSupport") }}</span>
          </div>
        </div>
      </section>

      <section class="products-grid-wrap">
        <div
          v-if="!loading && !error && products.length"
          class="products-toolbar"
        >
          <div class="toolbar-left">
            <div class="toolbar-group">
              <label>{{ $t("admin.search") }}</label>
              <input
                v-model="search"
                type="text"
                class="input input--sm"
                :placeholder="$t('admin.search')"
              />
            </div>
            <div class="toolbar-group">
              <label>{{ $t("admin.productType") }}</label>
              <select v-model="filterType" class="input input--sm">
                <option value="">{{ $t("admin.all") }}</option>
                <option value="tool">tool</option>
                <option value="account">account</option>
                <option value="service">service</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>
        </div>
        <AppLoading v-if="loading" />
        <div v-else-if="error" class="state-text state-text--error">
          {{ error }}
        </div>
        <div v-else-if="!products.length" class="state-text">
          {{ $t("admin.noData") }}
        </div>
        <div v-else>
          <div v-if="!filteredProducts.length" class="state-text">
            {{ $t("admin.noData") }}
          </div>
          <div class="products-list">
            <article
              v-for="p in filteredProducts"
              :key="p.id"
              class="product-card"
              @click="goDetail(p.id)"
            >
              <p
                v-if="getStockForProduct(p) != null"
                class="product-stock-badge"
              >
                {{ $t("product.stockRemaining") || "Còn dư" }}: {{ getStockForProduct(p) }}
              </p>
              <div class="product-left">
                <div class="product-thumb-wrap">
                  <NuxtImg
                    v-if="p.thumbnail_url"
                    :src="p.thumbnail_url"
                    :alt="p.name"
                    class="product-thumb"
                    loading="lazy"
                  />
                  <div v-else class="product-thumb placeholder">
                    <span>{{ p.name.charAt(0).toUpperCase() }}</span>
                  </div>
                </div>
                <p class="product-price">
                  {{ formatVnd(getPriceForProduct(p)) }}
                  <span class="product-price-unit">
                    {{ $t("product.points") }}
                  </span>
                </p>
              </div>

              <div class="product-main">
                <div class="product-header-row">
                  <span class="badge-type">
                    {{ p.type || "tool" }}
                  </span>
                  <span
                    v-if="getTotalStock(p) <= 0"
                    class="badge-out-of-stock"
                  >
                    {{ $t("product.outOfStock") || "Hết hàng" }}
                  </span>
                  <h2 class="product-name">
                    {{ p.name }}
                  </h2>
                </div>
                <div class="product-row">
                  <p class="product-desc">
                    {{ (p.description || "-").slice(0, 140)
                    }}{{ (p.description || "").length > 140 ? "…" : "" }}
                  </p>
                  <div class="product-actions">
                    <div class="product-meta-row">
                      <div class="product-meta-col">
                        <label class="product-duration-label">Loại key</label>
                        <select
                          class="product-duration-select"
                          :value="durationByProduct[p.id] || getDefaultDurationForProduct(p)"
                          @click.stop
                          @change="onChangeDuration(p.id, $event.target.value)"
                        >
                          <option
                            v-for="opt in getDurationOptionsForProduct(p)"
                            :key="opt"
                            :value="opt"
                          >
                            {{ formatDuration(opt) }}
                          </option>
                        </select>
                      </div>
                      <div class="product-meta-col">
                        <label class="product-qty-label">Số lượng</label>
                        <input
                          v-model.number="qtyByProduct[p.id]"
                          type="number"
                          :min="1"
                          :max="getMaxQtyForProduct(p)"
                          class="product-qty-input"
                          @click.stop
                          @input="clampQtyForProduct(p.id)"
                        />
                      </div>
                    </div>
                    <div class="product-actions-row">
                      <button
                        type="button"
                        class="btn-secondary"
                        :disabled="getStockForProduct(p) <= 0 || buyingId === p.id"
                        @click.stop="addToCart(p)"
                      >
                        {{ $t("product.addToCart") }}
                      </button>
                      <button
                        type="button"
                        class="btn-primary"
                        :disabled="buyingId === p.id || getStockForProduct(p) <= 0"
                        @click.stop="openConfirm(p)"
                      >
                        {{ buyingId === p.id ? "..." : $t("auth.getStarted") }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>

    <ConfirmPurchaseModal
      v-model="showConfirmModal"
      :product="confirmProduct"
      :balance="currentUser?.credit"
      @confirm="doPurchase"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import SiteHeader from "~/components/SiteHeader.vue";
import { setProductRef, getProductRef } from "~/composables/useProductRef";
const ConfirmPurchaseModal = defineAsyncComponent(
  () => import("~/components/product/ConfirmPurchaseModal.vue")
);

const { locale, t } = useI18n();
const { show: showToast } = useToast();

const products = ref([]);
const loading = ref(false);
const error = ref("");
const buyingId = ref<number | null>(null);
const currentUser = ref(null);
const showConfirmModal = ref(false);
const confirmProduct = ref<any | null>(null);
const confirmDuration = ref("2h");
const confirmQuantity = ref(1);
const { add } = useCart();
const search = ref("");
const filterType = ref("");

const durationOptions = [
  "2h",
  "12h",
  "1d",
  "3d",
  "7d",
  "10d",
  "30d",
  "90d",
  "lifetime",
];
const defaultDuration = "2h";
const durationByProduct = ref({});
const qtyByProduct = ref<Record<number, number>>({});

const filteredProducts = computed(() => {
  let list = products.value || [];
  const term = search.value.trim().toLowerCase();

  if (filterType.value) {
    list = list.filter((p) => p.type === filterType.value);
  }

  if (term) {
    list = list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(term) || desc.includes(term);
    });
  }

  return list;
});

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getDurationOptionsForProduct(p) {
  const map = p?.duration_prices || {};
  const keys = Object.keys(map || {});
  if (keys.length) {
    return keys;
  }
  return durationOptions;
}

function getDefaultDurationForProduct(p) {
  const opts = getDurationOptionsForProduct(p);
  if (!opts.length) return defaultDuration;
  if (opts.includes("2h")) return "2h";
  return opts[0];
}

function getPriceForProduct(p) {
  const map = p?.duration_prices || {};
  const current =
    durationByProduct.value[p.id] ||
    getDefaultDurationForProduct(p);
  if (typeof map[current] === "number") {
    return map[current];
  }
  const fallback = getDefaultDurationForProduct(p);
  if (typeof map[fallback] === "number") {
    return map[fallback];
  }
  // fallback bất kỳ giá nào (nếu có)
  const anyPrice = Object.values(map)[0];
  return typeof anyPrice === "number" ? anyPrice : 0;
}

function getStockForProduct(p) {
  const stock = p?.duration_stock || {};
  const current =
    durationByProduct.value[p.id] || getDefaultDurationForProduct(p);
  const n = stock[current];
  return typeof n === "number" ? n : 0;
}

function getTotalStock(p) {
  const stock = p?.duration_stock || {};
  return Object.values(stock).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

function getMaxQtyForProduct(p) {
  const s = getStockForProduct(p);
  if (s <= 0) return 0;
  return Math.min(100, s);
}

function clampQtyForProduct(productId) {
  const p = (products.value || []).find((x) => x.id === productId);
  if (!p) return;
  const max = getMaxQtyForProduct(p);
  const q = qtyByProduct.value[productId];
  if (typeof q !== "number" || !Number.isFinite(q) || q < 0) {
    qtyByProduct.value = { ...qtyByProduct.value, [productId]: max >= 1 ? 1 : 0 };
    return;
  }
  if (q > max) {
    qtyByProduct.value = { ...qtyByProduct.value, [productId]: max };
  }
}

function formatDuration(v) {
  if (v === "lifetime") return "Lifetime";
  return String(v)
    .replace(/\b(\d+)\s*d\b/gi, "$1 ngày")
    .replace(/\b(\d+)\s*h\b/gi, "$1 giờ");
}

async function fetchProducts(opts?: { silent?: boolean }) {
  const silent = !!opts?.silent;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const url = silent ? "/api/products?refresh=1" : "/api/products";
    const res = await $fetch(url);
    products.value = res?.success && Array.isArray(res.data) ? res.data : [];
    for (const p of products.value as any[]) {
      const id = p?.id;
      if (id != null && qtyByProduct.value[id] == null) {
        qtyByProduct.value[id] = 1;
      }
    }
  } catch (e) {
    if (!silent) {
      error.value =
        e?.data?.statusMessage ||
        t("admin.noData") ||
        "Không tải được danh sách sản phẩm";
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

function goDetail(id) {
  navigateTo(`/products/${id}`);
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

function openConfirm(p) {
  if (!p) return;
  clampQtyForProduct(p.id);
  const duration =
    durationByProduct.value[p.id] || getDefaultDurationForProduct(p);
  const qty = qtyByProduct.value[p.id] ?? 1;
  const safeQty =
    !Number.isFinite(Number(qty)) || Number(qty) <= 0
      ? 1
      : Math.min(getMaxQtyForProduct(p), 100, Number(qty));

  add(
    {
      ...p,
      price: getPriceForProduct(p),
    },
    {
      duration,
      qty: safeQty,
    },
  );
  navigateTo("/cart");
}

function addToCart(p) {
  if (!p) return;
  clampQtyForProduct(p.id);
  const duration =
    durationByProduct.value[p.id] || getDefaultDurationForProduct(p);
  const qty = qtyByProduct.value[p.id] ?? 1;
  const safeQty =
    !Number.isFinite(Number(qty)) || Number(qty) <= 0
      ? 1
      : Math.min(getMaxQtyForProduct(p), 100, Number(qty));

  add(
    {
      ...p,
      price: getPriceForProduct(p),
    },
    {
      duration,
      qty: safeQty,
    },
  );
  showToast(t("cart.addedToCart"), "success");
}

async function doPurchase(payload) {
  const product = payload?.product || payload;
  const duration =
    payload?.duration ||
    durationByProduct.value[product.id] ||
    getDefaultDurationForProduct(product);
  const quantity =
    payload?.quantity ||
    qtyByProduct.value[product.id] ||
    1;
  if (!product) return;
  buyingId.value = product.id;
  try {
    const route = useRoute();
    let sellerRef: string | undefined;
    if (route.query.ref && typeof route.query.ref === "string") {
      const fromUrl = String(route.query.ref).trim();
      if (fromUrl) {
        setProductRef(product.id, fromUrl);
        sellerRef = fromUrl;
      }
    } else {
      const stored = getProductRef(product.id);
      if (stored) sellerRef = stored;
    }
    const res = await $fetch("/api/orders/create", {
      method: "POST",
      body: {
        product_id: product.id,
        duration,
        quantity,
        ...(sellerRef ? { seller_ref: sellerRef } : {}),
      },
    });
    const successMsg =
      locale.value === "vi"
        ? "Tạo đơn hàng thành công. Bạn có thể xem trong lịch sử đơn hàng."
        : "Order created successfully. You can view it in your order history.";
    showToast(successMsg, "success");
    if (currentUser.value && typeof res?.newCredit === "number") {
      currentUser.value.credit = res.newCredit;
    }
    // reset qty về 1 sau khi mua
    qtyByProduct.value = {
      ...qtyByProduct.value,
      [product.id]: 1,
    };
  } catch (e) {
    const msg =
      e?.data?.statusMessage ||
      (locale.value === "vi"
        ? "Mua sản phẩm thất bại"
        : "Failed to purchase product");
    showToast(msg, "error");
    if (
      e?.statusCode === 400 &&
      msg.toLowerCase().includes("số dư") &&
      locale.value === "vi"
    ) {
      showToast("Số dư không đủ, hãy vào Thông tin để nạp thêm.", "info");
    }
  } finally {
    buyingId.value = null;
  }
}

function onChangeDuration(id, value) {
  durationByProduct.value = {
    ...durationByProduct.value,
    [id]: value,
  };
}

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([fetchProducts(), initUser()]);
  autoRefreshTimer = setInterval(() => {
    fetchProducts({ silent: true });
  }, 5000);
});

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<style scoped>
.products-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.products-main {
  flex: 1;
  padding: 96px 150px 60px; /* chừa khoảng dưới header fixed */
}

.products-hero {
  margin-top: 8px;
  margin-bottom: 10px;
}

.products-hero-inner {
  border-radius: 18px;
  padding: 16px 18px 16px;
  background:
    radial-gradient(circle at 0 0, rgb(var(--accent-rgb) / 0.24), transparent 55%),
    rgba(5, 15, 35, 0.92);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.products-hero-title {
  margin: 0 0 4px;
  font-size: 1.5rem;
  font-weight: 650;
}

.products-hero-subtitle {
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
  color: var(--text-primary);
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.products-grid-wrap {
  margin-top: 16px;
}

.products-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 8px;
  color: var(--text-primary);
  background: rgba(5, 15, 35, 0.95);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  border-radius: 10px;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.input--sm {
  padding: 0.45rem 0.75rem;
  min-width: 170px;
  color: var(--text-primary);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.state-text {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
}

.state-text--error {
  color: #fca5a5;
}

.products-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;

  border-radius: 12px;
}

.product-card {
  position: relative;
  color: var(--text-primary);
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  box-shadow: 0 0 18px rgb(var(--accent-rgb) / 0.16);
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr); /* ảnh+giá | mô tả+nút */
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  background: rgba(5, 15, 35, 0.95);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.product-card:hover {
  border-color: rgb(var(--accent-rgb) / 0.62);
  box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.24);
  transform: translateY(-1px);
}

.product-stock-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.product-left {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.product-thumb-wrap {
  width: 130px;
  height: 130px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.4);
  flex-shrink: 0;
  /* sát mép trái card */
  margin-left: 0;
}
.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.product-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--blue-bright);
}

.product-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.product-header-row {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
}

.badge-main {
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--text-primary);
  color: #bbf7d0;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-type {
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.badge-out-of-stock {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 6px;
}

.product-name {
  font-size: 1rem;
  margin: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.product-name a {
  color: inherit;
  text-decoration: none;
}
.product-name a:hover {
  color: var(--blue-bright);
}

.product-desc {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  min-height: 40px;
  flex: 1;
}

.product-price {
  margin: 6px 0 0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  width: 100%;
}

.product-price-unit {
  margin-left: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.product-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-meta-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-duration-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.product-duration-select {
  min-width: 150px;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgb(var(--accent-rgb) / 0.55);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  font-size: 0.86rem;
  outline: none;
}

.product-duration-select:focus {
  border-color: var(--blue-bright);
  box-shadow: 0 0 0 1px rgb(var(--accent-rgb) / 0.6);
}

.product-actions-row {
  display: flex;
  gap: 8px;
}

.product-actions-row .btn-secondary,
.product-actions-row .btn-primary {
  min-width: 130px;
}

.product-qty-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.product-qty-input {
  width: 80px;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  font-size: 0.85rem;
}

@media (max-width: 1024px) {
  .products-main {
    padding: 92px 20px 40px;
  }
  .products-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .products-hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .products-toolbar {
    padding: 0.65rem 0.75rem;
  }
  .toolbar-left {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-group {
    flex-direction: column;
    align-items: stretch;
  }
  .input--sm {
    min-width: 0;
    width: 100%;
  }
  .product-card {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }
  .product-left {
    align-items: center;
  }
  .product-thumb-wrap {
    width: 110px;
    height: 110px;
  }
  .product-row {
    flex-direction: column;
    gap: 10px;
  }
  .product-actions {
    width: 100%;
    align-items: stretch;
  }
  .product-meta-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .product-duration-select,
  .product-qty-input {
    width: 100%;
  }
  .product-actions-row {
    width: 100%;
  }
  .product-actions-row .btn-secondary,
  .product-actions-row .btn-primary {
    flex: 1;
    min-width: 0;
  }
  .products-hero-title {
    font-size: 1.2rem;
  }
  .products-hero-subtitle {
    font-size: 0.84rem;
  }
  .product-name {
    font-size: 0.95rem;
  }
  .product-desc {
    font-size: 0.84rem;
    min-height: 0;
  }
  .product-stock-badge {
    position: static;
    margin-bottom: 2px;
  }
}

@media (max-width: 480px) {
  .products-main {
    padding: 88px 10px 18px;
  }
  .products-hero-inner,
  .products-toolbar,
  .product-card {
    border-radius: 12px;
  }
  .product-actions-row .btn-secondary,
  .product-actions-row .btn-primary {
    min-height: 40px;
  }
}
</style>

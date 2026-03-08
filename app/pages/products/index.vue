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
                  {{ formatVnd(p.price) }}
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
                    <button
                      type="button"
                      class="btn-secondary"
                      @click.stop="addToCart(p)"
                    >
                      {{ $t("product.addToCart") }}
                    </button>
                    <button
                      type="button"
                      class="btn-primary"
                      :disabled="buyingId === p.id"
                      @click.stop="openConfirm(p)"
                    >
                      {{ buyingId === p.id ? "..." : $t("auth.getStarted") }}
                    </button>
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

<script setup>
import { defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import SiteHeader from "~/components/SiteHeader.vue";
const ConfirmPurchaseModal = defineAsyncComponent(
  () => import("~/components/product/ConfirmPurchaseModal.vue")
);

const { locale, t } = useI18n();
const { show: showToast } = useToast();

const products = ref([]);
const loading = ref(false);
const error = ref("");
const buyingId = ref(null);
const currentUser = ref(null);
const showConfirmModal = ref(false);
const confirmProduct = ref(null);
const { add } = useCart();
const search = ref("");
const filterType = ref("");

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

async function fetchProducts() {
  loading.value = true;
  error.value = "";
  try {
    const res = await $fetch("/api/products");
    products.value = res?.success && Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error.value =
      e?.data?.statusMessage ||
      t("admin.noData") ||
      "Không tải được danh sách sản phẩm";
  } finally {
    loading.value = false;
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
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/products`);
    return;
  }
  confirmProduct.value = p;
  showConfirmModal.value = true;
}

function addToCart(p) {
  if (!p) return;
  add(p);
  showToast(t("cart.addedToCart"), "success");
}

async function doPurchase(product) {
  if (!product) return;
  buyingId.value = product.id;
  try {
    const res = await $fetch("/api/orders/create", {
      method: "POST",
      body: { product_id: product.id },
    });
    const successMsg =
      locale.value === "vi"
        ? "Tạo đơn hàng thành công. Bạn có thể xem trong lịch sử đơn hàng."
        : "Order created successfully. You can view it in your order history.";
    showToast(successMsg, "success");
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

onMounted(async () => {
  await Promise.all([fetchProducts(), initUser()]);
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
    radial-gradient(circle at 0 0, rgba(1, 123, 251, 0.24), transparent 55%),
    rgba(5, 15, 35, 0.92);
  border: 1px solid rgba(1, 123, 251, 0.4);
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
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  border: 1px solid rgba(1, 123, 251, 0.3);
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
  color: var(--text-primary);
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(1, 123, 251, 0.35);
  box-shadow: 0 0 18px rgba(1, 123, 251, 0.16);
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr); /* ảnh+giá | mô tả+nút */
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  background: rgba(5, 15, 35, 0.95);
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
  gap: 6px;
  align-items: flex-end;
}

@media (max-width: 1024px) {
  .header {
    padding: 18px 24px;
  }
  .products-main {
    padding: 28px 24px 40px;
  }
  .products-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

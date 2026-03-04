<template>
  <div class="products-page">
    <SiteHeader />

    <main class="products-main">
      <section class="products-grid-wrap">
        <div v-if="loading" class="state-text">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="error" class="state-text state-text--error">
          {{ error }}
        </div>
        <div v-else-if="!products.length" class="state-text">
          {{ $t("admin.noData") }}
        </div>
        <div v-else>
          <div class="products-list">
            <article v-for="p in products" :key="p.id" class="product-card">
              <div class="product-left">
                <div class="product-thumb-wrap">
                  <img
                    v-if="p.thumbnail_url"
                    :src="p.thumbnail_url"
                    :alt="p.name"
                    class="product-thumb"
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
                  <span class="badge-main">
                    {{ locale === "vi" ? "Sản phẩm" : "Product" }}
                  </span>
                  <span class="badge-type">
                    {{ p.type || "tool" }}
                  </span>
                  <h2 class="product-name">
                    <NuxtLink :to="`/products/${p.id}`">
                      {{ p.name }}
                    </NuxtLink>
                  </h2>
                </div>
                <div class="product-row">
                  <p class="product-desc">
                    {{ (p.description || "-").slice(0, 140)
                    }}{{ (p.description || "").length > 140 ? "…" : "" }}
                  </p>
                  <div class="product-actions">
                    <NuxtLink
                      :to="`/products/${p.id}`"
                      class="btn-secondary as-link"
                    >
                      {{ $t("product.viewDetail") }}
                    </NuxtLink>
                    <button
                      type="button"
                      class="btn-primary"
                      :disabled="buyingId === p.id"
                      @click="openConfirm(p)"
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
import { useI18n } from "vue-i18n";
import SiteHeader from "~/components/SiteHeader.vue";
import ConfirmPurchaseModal from "~/components/product/ConfirmPurchaseModal.vue";

const { locale, t } = useI18n();
const { show: showToast } = useToast();

const products = ref([]);
const loading = ref(false);
const error = ref("");
const buyingId = ref(null);
const currentUser = ref(null);
const showConfirmModal = ref(false);
const confirmProduct = ref(null);

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

function goProfile() {
  navigateTo("/profile");
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

function onBuyFromDetail(p) {
  showDetailModal.value = false;
  confirmProduct.value = p;
  showConfirmModal.value = true;
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top, rgba(1, 123, 251, 0.2), transparent),
    var(--bg-deep);
  color: var(--text-primary);
}

.products-main {
  flex: 1;
  padding: 40px 150px 60px;
}

.products-grid-wrap {
  margin-top: 16px;
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
}

.product-card {
  background: rgba(5, 15, 35, 0.9);
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(1, 123, 251, 0.35);
  box-shadow: 0 0 18px rgba(1, 123, 251, 0.16);
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr); /* ảnh+giá | mô tả+nút */
  align-items: flex-start;
  gap: 16px;
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
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.9), #020617);
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
  background: rgba(34, 197, 94, 0.15);
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

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: var(--blue-bright);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  box-shadow: 0 0 16px rgba(1, 123, 251, 0.35);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.btn-primary:disabled {
  opacity: 0.8;
  cursor: wait;
}

.btn-secondary {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-secondary.as-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.btn-secondary:hover {
  border-color: rgba(1, 123, 251, 0.5);
  color: var(--text-primary);
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

<template>
  <div class="product-detail-page" v-if="!loading && product">
    <SiteHeader />

    <main class="detail-main">
      <section class="detail-layout">
        <div class="detail-media">
          <div class="detail-thumb-wrap">
            <img
              v-if="product.thumbnail_url"
              :src="product.thumbnail_url"
              :alt="product.name"
              class="detail-thumb"
            />
            <div v-else class="detail-thumb placeholder">
              <span>{{ product.name.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          <div v-if="product.images && product.images.length" class="detail-gallery">
            <h3 class="section-title">{{ $t("product.gallery") }}</h3>
            <div class="gallery-grid">
              <img
                v-for="(img, idx) in product.images"
                :key="idx"
                :src="img"
                :alt="product.name + ' screenshot ' + (idx + 1)"
                class="gallery-item"
              />
            </div>
          </div>
        </div>

        <section class="detail-info">
          <p class="detail-type">{{ product.type || "tool" }}</p>
          <h1 class="detail-title">{{ product.name }}</h1>
          <p class="detail-short" v-if="product.description">
            {{ product.description }}
          </p>
          <p v-else class="detail-short muted">
            {{ $t("product.noDescription") }}
          </p>

          <p class="detail-price">
            {{ formatVnd(product.price) }}
            <span class="unit">{{ $t("product.points") }}</span>
          </p>

          <div class="detail-actions">
            <button type="button" class="btn-ghost" @click="addToCart(product)">
              {{ inCart(product) ? $t("product.inCart") : $t("product.addToCart") }}
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="buying"
              @click="openConfirm(product)"
            >
              {{ buying ? "..." : $t("auth.getStarted") }}
            </button>
          </div>

          <section v-if="product.long_description" class="detail-long">
            <h3 class="section-title">{{ $t("product.longDescriptionTitle") }}</h3>
            <p class="detail-long-text">
              {{ product.long_description }}
            </p>
          </section>
        </section>
      </section>
    </main>

    <ConfirmPurchaseModal
      v-model="showConfirm"
      :product="product"
      :balance="currentUser?.credit"
      @confirm="doPurchase"
    />
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
const loading = ref(true);
const error = ref("");
const currentUser = ref(null);
const showConfirm = ref(false);
const buying = ref(false);

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

async function fetchProduct() {
  loading.value = true;
  error.value = "";
  try {
    const id = Number(route.params.id);
    const res = await $fetch(`/api/products/${id}`);
    product.value = res?.success ? res.data : null;
    if (!product.value) {
      error.value = t("admin.noData");
    }
  } catch (e) {
    error.value = e?.data?.statusMessage || t("product.loadError");
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

onMounted(async () => {
  await Promise.all([fetchProduct(), initUser()]);
});
</script>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top, rgba(1, 123, 251, 0.2), transparent),
    var(--bg-deep);
  color: var(--text-primary);
}
.detail-main {
  flex: 1;
  padding: 32px 150px 64px;
}
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.2fr);
  gap: 40px;
  align-items: flex-start;
}
.detail-media {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.detail-thumb-wrap {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(1, 123, 251, 0.4);
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.9), #020617);
}
.detail-thumb {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 260px;
}
.detail-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  font-size: 3rem;
  font-weight: 700;
  color: var(--blue-bright);
}
.detail-gallery {
  margin-top: 8px;
}
.section-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}
.gallery-item {
  width: 100%;
  height: 70px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.5);
}
.detail-info {
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(1, 123, 251, 0.35);
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 0 30px rgba(1, 123, 251, 0.15);
}
.detail-type {
  margin: 0 0 6px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}
.detail-title {
  margin: 0 0 8px;
  font-size: 1.6rem;
}
.detail-short {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}
.detail-short.muted {
  opacity: 0.8;
}
.detail-price {
  margin: 0 0 16px;
  font-size: 1.5rem;
  font-weight: 700;
}
.detail-price .unit {
  margin-left: 4px;
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
  background: var(--blue-bright);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(1, 123, 251, 0.4);
}
.btn-ghost {
  padding: 0.55rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.8);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
}
.detail-long {
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  padding-top: 16px;
  margin-top: 4px;
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

@media (max-width: 1024px) {
  .detail-main {
    padding: 24px 20px 40px;
  }
  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
}
</style>


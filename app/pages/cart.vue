<template>
  <div class="cart-page">
    <SiteHeader />

    <main class="cart-main">
      <header class="cart-header">
        <h1 class="cart-title">{{ $t("cart.title") }}</h1>
        <div class="cart-actions">
          <NuxtLink to="/products" class="btn-ghost">
            {{ $t("cart.continueShopping") }}
          </NuxtLink>
          <button
            type="button"
            class="btn-danger"
            :disabled="!cart.length"
            @click="clearCart"
          >
            {{ $t("cart.clear") }}
          </button>
        </div>
      </header>

      <div v-if="!cart.length" class="cart-empty">
        {{ $t("cart.empty") }}
      </div>

      <div v-else class="cart-grid">
        <section class="cart-items">
          <div class="cart-toolbar">
            <label class="select-all">
              <input
                type="checkbox"
                class="select-checkbox"
                :checked="allSelected"
                @change="toggleSelectAll($event.target.checked)"
              />
              <span>
                {{
                  allSelected ? $t("cart.unselectAll") : $t("cart.selectAll")
                }}
              </span>
            </label>
            <span class="select-count">
              {{ selectedItems.length }}/{{ cart.length }}
              {{ $t("cart.itemsSelected") }}
            </span>
          </div>

          <article
            v-for="item in cart"
            :key="`${item.id}-${item.duration || 'default'}`"
            class="cart-item"
          >
            <div class="select-cell">
              <input
                type="checkbox"
                class="select-checkbox"
                :checked="!!selected[itemKey(item)]"
                @change="toggleSelect(item, $event.target.checked)"
              />
            </div>
            <div class="thumb">
              <NuxtImg
                v-if="item.thumbnail_url"
                :src="item.thumbnail_url"
                :alt="item.name"
                loading="lazy"
              />
              <div v-else class="thumb placeholder">
                <span>{{ item.name?.charAt(0)?.toUpperCase() }}</span>
              </div>
            </div>
            <div class="info">
              <NuxtLink :to="`/products/${item.id}`" class="name">
                {{ item.name }}
              </NuxtLink>
              <div class="meta">
                <span class="type">{{ item.type || "tool" }}</span>
                <span
                  v-if="isItemOutOfStock(item)"
                  class="cart-item-out-of-stock"
                >
                  {{ $t("product.outOfStock") || "Hết hàng" }}
                </span>
              </div>
            </div>
            <div class="price">
              {{ formatVnd(getItemUnitPrice(item) * (item.qty || 1)) }}
              <span class="unit">{{ $t("product.points") }}</span>
            </div>
            <div class="actions">
              <p v-if="getItemStock(item) != null" class="actions-stock-hint">
                {{ $t("product.stockRemaining") || "Còn dư" }}:
                {{ getItemStock(item) }}
              </p>
              <label class="actions-label">Loại key</label>
              <select
                class="actions-select"
                v-model="item.duration"
                @change="onChangeQty(item)"
              >
                <option
                  v-for="opt in getDurationOptions(item)"
                  :key="opt"
                  :value="opt"
                >
                  {{ formatDuration(opt) }}
                </option>
              </select>

              <label class="actions-label">Số lượng</label>
              <input
                v-model.number="item.qty"
                type="number"
                :min="getItemMaxQty(item) >= 1 ? 1 : 0"
                :max="getItemMaxQty(item)"
                class="actions-qty-input"
                @input="clampItemQty(item)"
                @change="onChangeQty(item)"
                @blur="onChangeQty(item)"
              />

              <button
                type="button"
                class="btn-danger"
                @click="remove(item.id, item.duration)"
              >
                {{ $t("cart.remove") }}
              </button>
              <button
                type="button"
                class="btn-primary"
                :disabled="isItemOutOfStock(item)"
                @click="buySingle(item)"
              >
                {{ $t("auth.getStarted") }}
              </button>
            </div>
          </article>
        </section>

        <aside class="cart-summary">
          <h3 class="summary-title">{{ $t("cart.summaryTitle") }}</h3>
          <p class="summary-selected">
            {{ selectedItems.length }}/{{ cart.length }}
            {{ $t("cart.itemsSelected") }}
          </p>
          <p class="summary-total">
            {{ formatVnd(selectedTotal) }}
            <span class="unit">{{ $t("product.points") }}</span>
          </p>
          <p class="summary-note">
            {{ $t("cart.summaryHint") }}
          </p>

          <button
            type="button"
            class="btn-primary summary-btn"
            :disabled="!selectedItems.length || hasSelectedOutOfStock"
            @click="checkoutSelected"
          >
            {{ $t("cart.checkoutSelected") }}
          </button>

          <hr class="summary-sep" />
        </aside>
      </div>
    </main>

    <ConfirmPurchaseModal
      v-model="showConfirm"
      :product="confirmProduct"
      :balance="currentUser?.credit"
      :quantity="confirmProduct?.qty || 1"
      @confirm="doPurchase"
    />

    <Teleport to="body">
      <div
        v-if="showCheckoutAll"
        class="checkout-overlay"
        @click.self="showCheckoutAll = false"
      >
        <div class="checkout-modal">
          <h3 class="checkout-title">{{ $t("cart.confirmTitle") }}</h3>
          <p class="checkout-text">
            {{
              $t("cart.confirmText", {
                count: checkoutItems.length,
                total: formatVnd(checkoutTotal),
              })
            }}
          </p>
          <p v-if="currentUser?.credit != null" class="checkout-balance">
            {{ $t("product.balance") }}: {{ formatVnd(currentUser.credit) }}
            {{ $t("product.points") }}
          </p>
          <div class="checkout-actions">
            <button
              type="button"
              class="btn-ghost"
              @click="showCheckoutAll = false"
            >
              {{ $t("admin.cancel") }}
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="buyingAll"
              @click="confirmCheckoutAll"
            >
              {{ buyingAll ? "..." : $t("cart.checkoutAll") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from "vue";
import SiteHeader from "~/components/SiteHeader.vue";
import { useCartStore } from "~/stores/cart";
import { setProductRef, getProductRef } from "~/composables/useProductRef";
const ConfirmPurchaseModal = defineAsyncComponent(
  () => import("~/components/product/ConfirmPurchaseModal.vue"),
);

const { locale, t } = useI18n();
const { show: showToast } = useToast();
const { cart, remove, clear, total } = useCart();
const cartStore = useCartStore();

const currentUser = ref(null);
const showConfirm = ref(false);
const confirmProduct = ref(null);
const showCheckoutAll = ref(false);
const buyingAll = ref(false);
const checkoutMode = ref("all"); // 'all' | 'selected'

const selected = ref({});

function itemKey(item) {
  return `${item.id}-${item.duration || "default"}`;
}

const selectedItems = computed(() =>
  cart.value.filter((item) => selected.value[itemKey(item)]),
);

const hasSelectedOutOfStock = computed(() =>
  selectedItems.value.some((item) => isItemOutOfStock(item)),
);

function getCurrentDuration(item) {
  const options = getDurationOptions(item);
  if (!options.length) return null;
  if (item?.duration && options.includes(item.duration)) return item.duration;
  if (options.includes("2h")) return "2h";
  return options[0];
}

function getItemUnitPrice(item) {
  const map = item?.duration_prices || {};
  const duration = getCurrentDuration(item);
  if (duration && typeof map[duration] === "number") {
    return Number(map[duration] || 0);
  }
  return Number(item?.price || 0);
}

const selectedTotal = computed(() =>
  selectedItems.value.reduce(
    (sum, item) => sum + getItemUnitPrice(item) * Number(item.qty || 1),
    0,
  ),
);

const allSelected = computed(
  () =>
    cart.value.length > 0 &&
    cart.value.every((item) => selected.value[itemKey(item)]),
);

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

watch(
  cart,
  (newCart) => {
    const map = { ...selected.value };
    // Ensure all items exist in map; default to selected
    for (const item of newCart) {
      const key = itemKey(item);
      if (map[key] === undefined) {
        map[key] = true;
      }
    }
    // Clean up removed items
    for (const key in map) {
      if (!newCart.find((i) => itemKey(i) === key)) {
        delete map[key];
      }
    }
    selected.value = map;
  },
  { immediate: true },
);

function toggleSelect(item, checked) {
  const key = itemKey(item);
  selected.value = {
    ...selected.value,
    [key]: checked,
  };
}

function toggleSelectAll(checked) {
  if (!checked) {
    selected.value = {};
    return;
  }
  const map = {};
  for (const item of cart.value) {
    map[itemKey(item)] = true;
  }
  selected.value = map;
}

function clearCart() {
  clear();
  showToast(t("cart.cleared"), "success");
}

function buySingle(item) {
  if (!item) return;
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/cart`);
    return;
  }
  confirmProduct.value = item;
  showConfirm.value = true;
}

function formatDuration(v) {
  if (v === "lifetime") return "Lifetime";
  return v;
}

function getItemStock(item) {
  const stock = item?.duration_stock?.[item?.duration];
  return typeof stock === "number" ? stock : null;
}

function getItemMaxQty(item) {
  const stock = item?.duration_stock?.[item?.duration];
  if (typeof stock !== "number") return 100;
  if (stock <= 0) return 0;
  return Math.min(100, stock);
}

function isItemOutOfStock(item) {
  const stock = item?.duration_stock?.[item?.duration];
  if (typeof stock !== "number") return false;
  return stock <= 0;
}

function clampItemQty(item) {
  const max = getItemMaxQty(item);
  let q = Number(item.qty);
  if (typeof q !== "number" || !Number.isFinite(q) || q < 0) {
    item.qty = max >= 1 ? 1 : 0;
    return;
  }
  if (q > max) item.qty = max;
}

async function onChangeQty(item) {
  clampItemQty(item);
  const q = Number(item.qty ?? 0);
  const max = getItemMaxQty(item);
  const safeQty = max >= 1 ? Math.max(1, Math.min(q, max)) : 0;
  item.qty = safeQty;

  // Giữ trạng thái chọn cho dòng này ngay lập tức (không đợi đồng bộ server)
  const newKey = itemKey(item);
  const nextSelected = {};
  for (const [key, val] of Object.entries(selected.value)) {
    // Xóa các key cũ của cùng product (nếu đổi duration) nhưng giữ lựa chọn item khác
    if (!key.startsWith(`${item.id}-`)) {
      nextSelected[key] = val;
    }
  }
  if (safeQty >= 1) {
    nextSelected[newKey] = true;
  }
  selected.value = nextSelected;

  if (process.client) {
    const role = useCookie("user_role", { path: "/" }).value;
    if (role === "user" && safeQty >= 1) {
      try {
        await $fetch("/api/cart/add", {
          method: "POST",
          body: {
            product_id: item.id,
            qty: safeQty,
            duration: item.duration || null,
          },
        });
      } catch {
        // ignore sync error
      }
    }
  }
}

function checkoutAll() {
  if (!cart.value.length) return;
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/cart`);
    return;
  }
  checkoutMode.value = "all";
  showCheckoutAll.value = true;
}

function checkoutSelected() {
  if (!selectedItems.value.length) return;
  if (!currentUser.value) {
    const msg =
      locale.value === "vi"
        ? "Vui lòng đăng nhập để mua sản phẩm"
        : "Please log in to purchase";
    showToast(msg, "info");
    navigateTo(`/login?next=/cart`);
    return;
  }
  checkoutMode.value = "selected";
  showCheckoutAll.value = true;
}

const checkoutItems = computed(() =>
  checkoutMode.value === "all" ? cart.value : selectedItems.value,
);

const checkoutTotal = computed(() =>
  checkoutItems.value.reduce(
    (sum, item) => sum + getItemUnitPrice(item) * Number(item.qty || 1),
    0,
  ),
);

const baseDurationOptions = [
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

function getDurationOptions(item) {
  const map = item?.duration_prices || {};
  const keys = Object.keys(map || {});
  if (keys.length) return keys;
  return baseDurationOptions;
}

async function confirmCheckoutAll() {
  if (buyingAll.value) return;
  buyingAll.value = true;
  try {
    const items = [...checkoutItems.value];
    let ok = 0;
    let fail = 0;

    for (const item of items) {
      try {
        const route = useRoute();
        let sellerRef;
        if (route.query.ref && typeof route.query.ref === "string") {
          const fromUrl = String(route.query.ref).trim();
          if (fromUrl) {
            setProductRef(item.id, fromUrl);
            sellerRef = fromUrl;
          }
        } else {
          const stored = getProductRef(item.id);
          if (stored) sellerRef = stored;
        }
        const res = await $fetch("/api/orders/create", {
          method: "POST",
          body: {
            product_id: item.id,
            duration: item.duration || null,
            quantity: item.qty || 1,
            ...(sellerRef ? { seller_ref: sellerRef } : {}),
          },
        });
        ok++;
        remove(item.id, item.duration);
        if (currentUser.value && typeof res?.newCredit === "number") {
          currentUser.value.credit = res.newCredit;
        }
      } catch {
        fail++;
      }
    }

    if (fail === 0) {
      showToast(t("cart.successAll", { count: ok }), "success");
    } else {
      showToast(t("cart.partialSuccess", { ok, fail }), "info");
    }
    showCheckoutAll.value = false;
  } catch (e) {
    showToast(e?.data?.statusMessage || t("cart.purchaseFailed"), "error");
  } finally {
    buyingAll.value = false;
  }
}

async function doPurchase(payload) {
  const p = payload?.product || payload;
  const duration = payload?.duration || p.duration || null;
  const quantity = payload?.quantity || p.qty || 1;
  if (!p) return;
  try {
    const route = useRoute();
    let sellerRef;
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
      body: { product_id: p.id, duration, quantity, ...(sellerRef ? { seller_ref: sellerRef } : {}) },
    });
    showToast(t("cart.purchaseSuccessHistory"), "success");
    remove(p.id, p.duration ?? duration);
    if (currentUser.value && typeof res?.newCredit === "number") {
      currentUser.value.credit = res.newCredit;
    }
  } catch (e) {
    showToast(e?.data?.statusMessage || t("cart.purchaseFailed"), "error");
  }
}

let autoRefreshTimer = null;

async function refreshCartFromServer() {
  const role = useCookie("user_role", { path: "/" }).value;
  if (role !== "user") return;
  try {
    const res = await $fetch("/api/cart/my");
    if (res?.success && Array.isArray(res.items)) {
      cartStore.setItems(res.items);
    }
  } catch {
    // silent
  }
}

onMounted(() => {
  initUser();
  refreshCartFromServer();
  autoRefreshTimer = setInterval(refreshCartFromServer, 5000);
});

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<style scoped>
.cart-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}
.cart-main {
  flex: 1;
  padding: 96px 150px 64px; /* chừa khoảng dưới header cố định */
}
.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 20px;
  background: rgba(5, 15, 35, 0.95);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  border-radius: 12px;
}
.cart-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 500;
}
.cart-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.cart-empty {
  padding: 60px 24px;
  text-align: center;
  color: var(--text-secondary);
  background: rgba(5, 15, 35, 0.95);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  border-radius: 12px;
}
.cart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(5, 15, 35, 0.95);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  border-radius: 12px;
}

.cart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.select-count {
  color: var(--text-muted);
}
.cart-item {
  display: grid;
  grid-template-columns: 32px 64px minmax(0, 1fr) 160px 420px;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  background: rgba(8, 20, 45, 0.9);
  color: var(--text-primary);
}

.select-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--blue-bright);
  cursor: pointer;
}
.thumb {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  color: var(--blue-bright);
  font-weight: 700;
  font-size: 1.3rem;
}
.info .name {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info .name:hover {
  color: var(--blue-bright);
}
.meta {
  margin-top: 4px;
}
.type {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.cart-item-out-of-stock {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 600;
}
.price {
  font-weight: 700;
  font-size: 1rem;
}
.price .unit {
  margin-left: 4px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.actions-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.actions-stock-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.actions-select {
  min-width: 120px;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.95);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.actions-qty-input {
  width: 72px;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.95);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.actions-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-primary {
  padding: 0.5rem 1.1rem;
  color: var(--text-primary);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
}

.btn-outline {
  color: var(--text-primary);
  border: 1px solid var(--blue-bright);
  color: var(--text-primary);
}
.btn-ghost {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  color: var(--text-primary);
  color: var(--text-secondary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-danger {
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.8);
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-link {
  color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  cursor: pointer;
}
.cart-summary {
  border-radius: 14px;
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  background: rgba(5, 15, 35, 0.95);
  color: var(--text-primary);
  padding: 16px;
}
.summary-title {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.summary-selected {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.summary-total {
  margin: 0 0 10px;
  font-size: 1.4rem;
  font-weight: 800;
}
.summary-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}

.summary-sep {
  margin: 10px 0 8px;
  border: none;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}

.summary-btn {
  width: 100%;
  margin-top: 8px;
}

.checkout-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.checkout-modal {
  width: 100%;
  max-width: 420px;
  background: rgba(5, 15, 35, 0.98);
  color: var(--text-primary);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  border-radius: 14px;
  box-shadow: 0 0 40px rgb(var(--accent-rgb) / 0.2);
  padding: 1.25rem;
}

.checkout-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-weight: 700;
}

.checkout-text {
  margin: 0 0 0.75rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.checkout-balance {
  margin: 0 0 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.checkout-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .cart-main {
    padding: 92px 20px 40px;
  }
  .cart-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .cart-item {
    grid-template-columns: 64px minmax(0, 1fr);
    grid-template-rows: auto auto;
  }
  .price {
    grid-column: 1 / -1;
    text-align: right;
  }
  .actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .cart-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 14px;
  }
  .cart-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .cart-items {
    padding: 12px;
  }
  .cart-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .cart-item {
    grid-template-columns: 28px 54px minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    gap: 10px;
    padding: 10px;
  }
  .price {
    grid-column: 1 / -1;
    text-align: left;
  }
  .actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
    gap: 8px;
  }
  .actions-select,
  .actions-qty-input {
    width: 100%;
  }
  .actions .btn-danger,
  .actions .btn-primary {
    width: 100%;
    justify-content: center;
  }
  .cart-item-out-of-stock {
    margin-left: 0;
    margin-top: 4px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .cart-title {
    font-size: 1.2rem;
  }
  .summary-total {
    font-size: 1.2rem;
  }
  .cart-summary {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .cart-main {
    padding: 88px 10px 18px;
  }
  .cart-header,
  .cart-items,
  .cart-summary {
    border-radius: 10px;
  }
  .cart-item {
    border-radius: 10px;
  }
  .actions .btn-danger,
  .actions .btn-primary,
  .summary-btn {
    min-height: 40px;
  }
}
</style>

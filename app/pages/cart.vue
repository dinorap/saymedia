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

          <article v-for="item in cart" :key="item.id" class="cart-item">
            <div class="select-cell">
              <input
                type="checkbox"
                class="select-checkbox"
                :checked="!!selected[item.id]"
                @change="toggleSelect(item.id, $event.target.checked)"
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
              </div>
            </div>
            <div class="price">
              {{ formatVnd(item.price) }}
              <span class="unit">{{ $t("product.points") }}</span>
            </div>
            <div class="actions">
              <button type="button" class="btn-danger" @click="remove(item.id)">
                {{ $t("cart.remove") }}
              </button>
              <button
                type="button"
                class="btn-primary"
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
            :disabled="!selectedItems.length"
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
const ConfirmPurchaseModal = defineAsyncComponent(
  () => import("~/components/product/ConfirmPurchaseModal.vue"),
);

const { locale, t } = useI18n();
const { show: showToast } = useToast();
const { cart, remove, clear, total } = useCart();

const currentUser = ref(null);
const showConfirm = ref(false);
const confirmProduct = ref(null);
const showCheckoutAll = ref(false);
const buyingAll = ref(false);
const checkoutMode = ref("all"); // 'all' | 'selected'

const selected = ref({});

const selectedItems = computed(() =>
  cart.value.filter((item) => selected.value[item.id]),
);

const selectedTotal = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + Number(item.price || 0), 0),
);

const allSelected = computed(
  () =>
    cart.value.length > 0 &&
    cart.value.every((item) => selected.value[item.id]),
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
      if (map[item.id] === undefined) {
        map[item.id] = true;
      }
    }
    // Clean up removed items
    for (const key in map) {
      if (!newCart.find((i) => i.id === Number(key))) {
        delete map[key];
      }
    }
    selected.value = map;
  },
  { immediate: true },
);

function toggleSelect(id, checked) {
  selected.value = {
    ...selected.value,
    [id]: checked,
  };
}

function toggleSelectAll(checked) {
  if (!checked) {
    selected.value = {};
    return;
  }
  const map = {};
  for (const item of cart.value) {
    map[item.id] = true;
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

function onChangeDuration(id, value) {
  durationByProduct[id] = value;
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
  checkoutItems.value.reduce((sum, item) => sum + Number(item.price || 0), 0),
);

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
const defaultDuration = "30d";
const durationByProduct = reactive({});

async function confirmCheckoutAll() {
  if (buyingAll.value) return;
  buyingAll.value = true;
  try {
    const items = [...checkoutItems.value];
    let ok = 0;
    let fail = 0;

    for (const item of items) {
      try {
        const res = await $fetch("/api/orders/create", {
          method: "POST",
          body: {
            product_id: item.id,
            duration: durationByProduct[item.id] || defaultDuration,
          },
        });
        ok++;
        remove(item.id);
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
  const duration =
    payload?.duration || durationByProduct[p.id] || defaultDuration;
  if (!p) return;
  try {
    const res = await $fetch("/api/orders/create", {
      method: "POST",
      body: { product_id: p.id, duration },
    });
    showToast(t("cart.purchaseSuccessHistory"), "success");
    remove(p.id);
    if (currentUser.value && typeof res?.newCredit === "number") {
      currentUser.value.credit = res.newCredit;
    }
  } catch (e) {
    showToast(e?.data?.statusMessage || t("cart.purchaseFailed"), "error");
  }
}

onMounted(initUser);
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
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  grid-template-columns: 32px 64px minmax(0, 1fr) 160px 220px;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  justify-content: flex-end;
  gap: 10px;
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
  border: 1px solid rgba(1, 123, 251, 0.25);
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
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 14px;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
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
    padding: 24px 20px 40px;
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
</style>

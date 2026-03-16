<template>
  <div class="partners-page">
    <div v-if="isSuperAdmin" class="subtabs">
      <button
        type="button"
        class="subtab-btn"
        :class="{ 'subtab-btn--active': activeTab === 'shops' }"
        @click="activeTab = 'shops'"
      >
        Shop
      </button>
      <button
        type="button"
        class="subtab-btn"
        :class="{ 'subtab-btn--active': activeTab === 'owner' }"
        @click="activeTab = 'owner'"
      >
        Chủ
      </button>
    </div>

    <div class="card summary-card">
      <template v-if="!isSuperAdmin || activeTab === 'shops'">
        <h2 class="card-title">Tổng quan theo shop</h2>
        <div v-if="loading" class="table-loading">Đang tải...</div>
        <div v-else-if="!shopPartners.length" class="table-empty">
          Chưa có dữ liệu
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Đơn sản phẩm shop</th>
              <th>Doanh thu SP shop (credit)</th>
              <th>Phí sàn (credit)</th>
              <th>Net SP shop (credit)</th>
              <th>Đơn bán hộ</th>
              <th>Doanh thu bán hộ (credit)</th>
              <th>Doanh thu bán hộ thực nhận (credit)</th>
              <th>Số dư cần chuyển (credit)</th>
              <th>Số dư (VND)</th>
              <th v-if="isSuperAdmin">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in shopPartners" :key="p.admin_id">
              <td>
                <strong>{{ p.username || "—" }}</strong>
              </td>
              <td>{{ formatNum(p.self_order_count || 0) }}</td>
              <td>{{ formatNum(p.self_gross_amount || 0) }}</td>
              <td>{{ formatNum(p.self_platform_fee || 0) }}</td>
              <td>{{ formatNum(p.self_net_amount || 0) }}</td>
              <td>{{ formatNum(p.affiliate_order_count || 0) }}</td>
              <td>{{ formatNum(p.affiliate_gross_amount || 0) }}</td>
              <td>{{ formatNum(p.affiliate_received_credit || 0) }}</td>
              <td>{{ formatNum(p.balance_credit) }}</td>
              <td>{{ formatVnd(p.balance_vnd) }}</td>
              <td>
                <button
                  type="button"
                  class="btn-small"
                  @click="showByProduct(p.admin_id)"
                >
                  Xem theo SP
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="shopPartners.length" class="vnd-note">
          1 credit = {{ vndPerCredit.toLocaleString("vi-VN") }} VND (quy đổi cuối
          tháng để chuyển tiền cho shop).
        </p>
      </template>

      <template v-else>
        <h2 class="card-title">Chủ – theo sản phẩm</h2>
        <div v-if="ownerLoading" class="table-loading">Đang tải...</div>
        <div v-else-if="!ownerProducts.length" class="table-empty">
          Chưa có dữ liệu
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Tổng key đã bán</th>
              <th>Tổng doanh thu (credit)</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in ownerProducts" :key="p.id">
              <td>{{ p.name }}</td>
              <td>{{ formatNum(p.total_sold_keys || 0) }}</td>
              <td>{{ formatNum(p.total_sold_credit || 0) }}</td>
              <td>
                <button type="button" class="btn-small" @click="openOwnerKeyDetails(p)">
                  Chi tiết key
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="showByProductModal"
        class="modal-overlay"
        @click.self="closeByProductModal"
      >
        <div class="modal">
          <h3 class="modal-title">
            Doanh thu theo sản phẩm
            <span v-if="currentPartnerName">– {{ currentPartnerName }}</span>
          </h3>
          <div class="modal-body">
            <div v-if="byProductLoading" class="table-loading">Đang tải...</div>
            <div v-else-if="!byProduct.length" class="table-empty">
              Chưa có đơn nào
            </div>
            <template v-else>
              <div class="modal-tabs">
                <button
                  type="button"
                  class="subtab-btn"
                  :class="{ 'subtab-btn--active': byProductSubtab === 'self' }"
                  @click="byProductSubtab = 'self'"
                >
                  Shop tự bán
                </button>
                <button
                  type="button"
                  class="subtab-btn"
                  :class="{ 'subtab-btn--active': byProductSubtab === 'affiliate' }"
                  @click="byProductSubtab = 'affiliate'"
                >
                  Bán hộ
                </button>
              </div>

              <table v-if="byProductSubtab === 'self'" class="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số đơn</th>
                    <th>Doanh thu SP shop (credit)</th>
                    <th>Phí sàn (credit)</th>
                    <th>CREDIT chia cho shop</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in selfByProduct" :key="`self-${r.product_id}`">
                    <td>{{ r.product_name }}</td>
                    <td>{{ r.order_count }}</td>
                    <td>{{ formatNum(r.total_gross_amount) }}</td>
                    <td>{{ formatNum(r.total_platform_fee || 0) }}</td>
                    <td>{{ formatNum(r.total_credit_share) }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn-small"
                        @click="openKeyDetails(r)"
                      >
                        Chi tiết key
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!selfByProduct.length">
                    <td colspan="6" class="table-empty">Chưa có đơn tự bán</td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số đơn bán hộ</th>
                    <th>Doanh thu bán hộ (credit)</th>
                    <th>CREDIT thực nhận (credit)</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in affiliateByProduct"
                    :key="`aff-${r.product_id}`"
                  >
                    <td>{{ r.product_name }}</td>
                    <td>{{ r.order_count }}</td>
                    <td>{{ formatNum(r.total_gross_amount) }}</td>
                    <td>{{ formatNum(r.total_credit_share) }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn-small"
                        @click="openKeyDetails(r)"
                      >
                        Chi tiết key
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!affiliateByProduct.length">
                    <td colspan="5" class="table-empty">Chưa có đơn bán hộ</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-primary"
              @click="closeByProductModal"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showKeyDetailsModal"
        class="modal-overlay"
        @click.self="closeKeyDetailsModal"
      >
        <div class="modal">
          <h3 class="modal-title">
            Chi tiết key theo loại
            <span v-if="currentProductName">– {{ currentProductName }}</span>
          </h3>
          <div class="modal-body">
            <div v-if="keyDetailsLoading" class="table-loading">
              Đang tải...
            </div>
            <div v-else-if="!keyDetails.length" class="table-empty">
              Chưa có đơn key nào
            </div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>Loại key</th>
                  <th>Giá/1 key (credit)</th>
                  <th>Số key</th>
                  <th>Doanh thu (credit)</th>
                  <th>Phí sàn (credit)</th>
                  <th>Số dư cần chuyển (credit)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in keyDetails" :key="item.duration">
                  <td>{{ item.duration }}</td>
                  <td>{{ formatNum(item.unit_price) }}</td>
                  <td>{{ item.total_keys }}</td>
                  <td>{{ formatNum(item.total_gross_amount) }}</td>
                  <td>{{ formatNum(item.total_platform_fee || 0) }}</td>
                  <td>{{ formatNum(item.total_credit_share) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-primary"
              @click="closeKeyDetailsModal"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["admin"] });
const { t } = useI18n();

const loading = ref(true);
const byProductLoading = ref(false);
const partners = ref<any[]>([]);
const activeTab = ref<"shops" | "owner">("shops");
const vndPerCredit = ref(1000);
const fromDate = ref("");
const toDate = ref("");
const selectedPartnerId = ref<number | null>(null);
const currentPartnerName = ref<string>("");
const currentProductName = ref<string>("");
const byProduct = ref<any[]>([]);
const showByProductModal = ref(false);
const byProductSubtab = ref<"self" | "affiliate">("self");
const showKeyDetailsModal = ref(false);
const keyDetails = ref<any[]>([]);
const keyDetailsLoading = ref(false);

const currentUser = ref<any>(null);
const isSuperAdmin = computed(() => currentUser.value?.role === "admin_0");
const shopPartners = computed(() =>
  (partners.value || []).filter((p: any) => String(p?.role || "") !== "admin_0"),
);
let autoRefreshTimer: any = null;

const ownerLoading = ref(false);
const ownerProducts = ref<any[]>([]);
const selfByProduct = computed(() =>
  (byProduct.value || []).filter(
    (r: any) => r.owner_admin_id && r.owner_admin_id === selectedPartnerId.value,
  ),
);
const affiliateByProduct = computed(() =>
  (byProduct.value || []).filter(
    (r: any) => !r.owner_admin_id || r.owner_admin_id !== selectedPartnerId.value,
  ),
);

function formatNum(n: number) {
  return Number(n).toLocaleString("vi-VN");
}
function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n || 0);
}

async function fetchSummary(opts: { silent?: boolean } = {}) {
  const silent = !!opts.silent;
  if (!silent) loading.value = true;
  try {
    const q: Record<string, string> = {};
    if (fromDate.value) q.from = fromDate.value;
    if (toDate.value) q.to = toDate.value;
    const res = await $fetch<{ partners: any[]; vnd_per_credit: number }>(
      "/api/admin/earnings/summary",
      { query: q },
    );
    partners.value = res.partners || [];
    vndPerCredit.value = res.vnd_per_credit || 1000;
    if (!isSuperAdmin.value && res.partners?.length) {
      selectedPartnerId.value = res.partners[0].admin_id;
      await fetchByProduct();
    }
  } catch (e) {
    console.error(e);
    partners.value = [];
  } finally {
    if (!silent) loading.value = false;
  }
}

async function fetchOwnerProducts() {
  if (!isSuperAdmin.value || !currentUser.value?.id) return;
  ownerLoading.value = true;
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>(
      "/api/admin/products",
      {
        query: {
          admin_id: String(currentUser.value.id),
          limit: "50",
          page: "1",
        },
      },
    );
    ownerProducts.value = res?.data || [];
  } catch (e) {
    console.error(e);
    ownerProducts.value = [];
  } finally {
    ownerLoading.value = false;
  }
}

async function showByProduct(adminId: number) {
  const p = partners.value.find((x) => x.admin_id === adminId);
  selectedPartnerId.value = adminId;
  currentPartnerName.value = p?.username || "";
  byProductSubtab.value = "self";
  await fetchByProduct();
  showByProductModal.value = true;
}

function closeByProductModal() {
  showByProductModal.value = false;
}

function closeKeyDetailsModal() {
  showKeyDetailsModal.value = false;
}

async function fetchByProduct() {
  const aid = selectedPartnerId.value ?? currentUser.value?.id;
  if (!aid) return;
  byProductLoading.value = true;
  try {
    const q: Record<string, string> = { admin_id: String(aid) };
    if (fromDate.value) q.from = fromDate.value;
    if (toDate.value) q.to = toDate.value;
    const res = await $fetch<{ by_product: any[] }>(
      "/api/admin/earnings/by-product",
      { query: q },
    );
    byProduct.value = res.by_product || [];
  } catch (e) {
    console.error(e);
    byProduct.value = [];
  } finally {
    byProductLoading.value = false;
  }
}

async function openKeyDetails(row: any) {
  if (!row?.product_id) return;
  const aid = selectedPartnerId.value ?? currentUser.value?.id;
  if (!aid) return;
  keyDetailsLoading.value = true;
  keyDetails.value = [];
  currentProductName.value = row.product_name || "";
  showKeyDetailsModal.value = true;
  try {
    const q: Record<string, string> = {
      admin_id: String(aid),
      product_id: String(row.product_id),
    };
    if (fromDate.value) q.from = fromDate.value;
    if (toDate.value) q.to = toDate.value;
    const res = await $fetch<{
      items: {
        duration: string;
        total_keys: number;
        total_paid_part: number;
        total_amount: number;
        unit_price: number;
      }[];
    }>("/api/admin/earnings/by-product-keys", {
      query: q,
    });
    keyDetails.value = res.items || [];
  } catch (e) {
    console.error(e);
    keyDetails.value = [];
  } finally {
    keyDetailsLoading.value = false;
  }
}

async function openOwnerKeyDetails(product: any) {
  if (!product?.id) return;
  selectedPartnerId.value = currentUser.value?.id ?? null;
  currentPartnerName.value = "Chủ";
  currentProductName.value = product.name || "";
  keyDetailsLoading.value = true;
  keyDetails.value = [];
  showKeyDetailsModal.value = true;
  try {
    const q: Record<string, string> = {
      admin_id: String(selectedPartnerId.value),
      product_id: String(product.id),
    };
    if (fromDate.value) q.from = fromDate.value;
    if (toDate.value) q.to = toDate.value;
    const res = await $fetch<{ items: any[] }>("/api/admin/earnings/by-product-keys", {
      query: q,
    });
    keyDetails.value = res.items || [];
  } catch (e) {
    console.error(e);
    keyDetails.value = [];
  } finally {
    keyDetailsLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const me = await $fetch("/api/auth/me");
    currentUser.value = me?.user ?? me;
  } catch {
    currentUser.value = null;
  }
  await fetchSummary();
  if (isSuperAdmin.value) {
    await fetchOwnerProducts();
  }
  autoRefreshTimer = setInterval(() => {
    fetchSummary({ silent: true });
  }, 5000);
});

let summaryTimer: any = null;
watch([fromDate, toDate], () => {
  if (summaryTimer) clearTimeout(summaryTimer);
  summaryTimer = setTimeout(() => {
    fetchSummary({ silent: true });
  }, 300);
});

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === "owner") {
      await fetchOwnerProducts();
    }
  },
);

onUnmounted(() => {
  if (summaryTimer) {
    clearTimeout(summaryTimer);
    summaryTimer = null;
  }
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<style scoped>
.subtabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.subtab-btn {
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  cursor: pointer;
}
.subtab-btn--active {
  border-color: rgba(59, 130, 246, 0.9);
  background: rgba(1, 123, 251, 0.2);
  color: #e5e7eb;
}
.modal-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.partners-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.toolbar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  padding: 0.75rem 1rem;
  background: rgba(5, 15, 35, 0.5);
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.input--sm {
  min-width: 160px;
  padding: 0.45rem 0.75rem;
}
.btn-primary {
  padding: 0.4rem 0.75rem;
  background: rgba(1, 123, 251, 0.9);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-primary:hover {
  background: rgba(1, 123, 251, 1);
}
.btn-refresh {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  cursor: pointer;
}
.btn-refresh:hover {
  border-color: rgba(59, 130, 246, 0.9);
}
.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  background: rgba(1, 123, 251, 0.2);
  color: var(--blue-bright, #017bfb);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 4px;
  cursor: pointer;
}
.btn-small:hover {
  background: rgba(1, 123, 251, 0.3);
}
.card {
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.card-title {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary, #1e293b);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(1, 123, 251, 0.15);
}
.data-table th {
  font-weight: 600;
  color: var(--text-secondary, #475569);
}
.table-loading,
.table-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-secondary, #64748b);
}
.vnd-note {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  width: min(900px, 95vw);
  max-height: 80vh;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.6);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.9);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.modal-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #e5e7eb;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.modal-body {
  flex: 1;
  overflow: auto;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
</style>

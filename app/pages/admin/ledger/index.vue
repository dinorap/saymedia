<template>
  <div class="ledger-page">
    <div class="toolbar">
      <div class="filter-group">
        <label>Từ ngày</label>
        <input v-model="fromDate" type="date" class="input input--sm" />
      </div>
      <div class="filter-group">
        <label>Đến ngày</label>
        <input v-model="toDate" type="date" class="input input--sm" />
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.transactionType") || "Loại giao dịch" }}</label>
        <input
          v-model="typeFilter"
          class="input input--sm"
          :placeholder="$t('admin.search')"
        />
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.userId") || "User ID" }}</label>
        <input v-model="userIdFilter" class="input input--sm" placeholder="1" />
      </div>
      <button class="btn-refresh" @click="fetchLedger(1)">↻</button>
      <div class="filter-group">
        <button
          type="button"
          class="btn-export-csv"
          :disabled="exportingCsv"
          @click="exportCsv"
        >
          {{ exportingCsv ? "Đang xuất..." : "Xuất CSV" }}
        </button>
      </div>
    </div>

    <div class="table-wrap card">
      <div v-if="loading" class="table-loading">{{ $t("admin.loading") }}</div>
      <div v-else-if="!items.length" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ $t("admin.username") }}</th>
            <th>{{ $t("admin.transactionType") || "Loại" }}</th>
            <th>{{ $t("admin.deltaCredit") || "Biến động" }}</th>
            <th>{{ $t("admin.beforeAfter") || "Trước/Sau" }}</th>
            <th>{{ $t("admin.description") }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row.id">
            <td>#{{ row.id }}</td>
            <td>{{ row.user_username }} ({{ row.user_id }})</td>
            <td>{{ typeLabel(row.transaction_type) }}</td>
            <td :class="Number(row.delta) >= 0 ? 'text-up' : 'text-down'">
              {{ Number(row.delta) >= 0 ? "+" : "" }}{{ formatVnd(row.delta) }}
            </td>
            <td>
              {{ formatVnd(row.balance_before) }} →
              {{ formatVnd(row.balance_after) }}
            </td>
            <td class="note">{{ row.note || "-" }}</td>
            <td>{{ formatDate(row.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.total > 0" class="pagination">
      <div class="page-left">
        <label>{{ $t("admin.records") }} / page</label>
        <select
          v-model.number="pageSize"
          class="input input--sm"
          @change="changePageSize"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
      <span class="page-info">
        {{ $t("admin.page") }} {{ pagination.page }} {{ $t("admin.of") }}
        {{ pagination.totalPages }} ({{ pagination.total }}
        {{ $t("admin.records") }})
      </span>
      <div class="page-right">
        <button
          class="btn-page"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >
          {{ $t("admin.prev") }}
        </button>
        <button
          class="btn-page"
          :disabled="pagination.page >= pagination.totalPages"
          @click="goToPage(pagination.page + 1)"
        >
          {{ $t("admin.next") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const { t } = useI18n();
const items = ref([]);
const loading = ref(false);
const typeFilter = ref("");
const userIdFilter = ref("");
const fromDate = ref("");
const toDate = ref("");
const exportingCsv = ref(false);
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
let timer = null;
let autoRefreshTimer = null;

async function fetchLedger(page = 1, opts = { silent: false }) {
  if (!opts?.silent) loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize.value || 20));
    if (typeFilter.value.trim()) params.set("type", typeFilter.value.trim());
    if (userIdFilter.value.trim()) params.set("user_id", userIdFilter.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const res = await $fetch(`/api/admin/credit-ledger?${params.toString()}`);
    items.value = Array.isArray(res?.data) ? res.data : [];
    if (res?.pagination) pagination.value = res.pagination;
  } catch {
    items.value = [];
    pagination.value = { page: 1, limit: 10, total: 0, totalPages: 1 };
  } finally {
    if (!opts?.silent) loading.value = false;
  }
}

watch(
  () => [typeFilter.value, userIdFilter.value, fromDate.value, toDate.value],
  () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fetchLedger(1), 300);
  },
);

async function exportCsv() {
  exportingCsv.value = true;
  try {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (typeFilter.value.trim()) params.set("type", typeFilter.value.trim());
    if (userIdFilter.value.trim()) params.set("user_id", userIdFilter.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const url = `/api/admin/credit-ledger?${params.toString()}`;
    const csv = await $fetch(url);
    const blob = new Blob([String(csv)], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "admin-credit-ledger.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error("[admin ledger export]", e);
  } finally {
    exportingCsv.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) fetchLedger(page);
}

function changePageSize() {
  pagination.value.page = 1;
  fetchLedger(1);
}

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(val) {
  if (!val) return "-";
  const d =
    typeof val === "string" && val.includes(" ")
      ? new Date(val.replace(" ", "T") + "Z")
      : new Date(val);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(type) {
  if (type === "deposit") return "Nạp tiền";
  if (type === "purchase") return "Mua sản phẩm";
  if (type === "refund") return "Hoàn tiền";
  if (type === "admin_adjust") return "Admin điều chỉnh";
  return type || "-";
}

onMounted(() => {
  fetchLedger(1);
  autoRefreshTimer = setInterval(
    () => fetchLedger(pagination.value.page || 1, { silent: true }),
    5000,
  );
});
onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});
</script>

<style scoped>
.ledger-page {
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
.btn-refresh {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.4);
  background: rgba(1, 123, 251, 0.2);
  color: #fff;
}
.btn-export-csv {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(34, 197, 94, 0.5);
  background: rgba(22, 163, 74, 0.2);
  color: #86efac;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-export-csv:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  padding: 1rem;
  max-height: 71vh;
}
.table-loading,
.table-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(1, 123, 251, 0.15);
}
.data-table th {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
}
.note {
  max-width: 380px;
  white-space: pre-wrap;
  word-break: break-word;
}
.text-up {
  color: #27ae60;
}
.text-down {
  color: #ff6b6b;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem;
  margin-top: 0.5rem;
}
.page-left,
.page-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.page-left label {
  min-width: 110px;
}
.btn-page {
  padding: 0.4rem 1rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
}
.btn-page:hover:not(:disabled) {
  background: rgba(1, 123, 251, 0.3);
}
.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
</style>

<template>
  <div class="logs-page">
    <div class="list-toolbar">
      <div class="search-group">
        <label>Từ ngày</label>
        <input v-model="fromDate" type="date" class="input input--sm" />
      </div>
      <div class="search-group">
        <label>Đến ngày</label>
        <input v-model="toDate" type="date" class="input input--sm" />
      </div>
      <div class="search-group">
        <label>{{ $t("admin.search") }}</label>
        <input
          v-model="actionFilter"
          type="text"
          class="input input--sm"
          :placeholder="$t('admin.logAction') || 'Action'"
        />
      </div>
      <div class="search-group">
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
            <th>{{ $t("admin.id") }}</th>
            <th>{{ $t("admin.logActor") || "Người thao tác" }}</th>
            <th>{{ $t("admin.logAction") || "Hành động" }}</th>
            <th>{{ $t("admin.logTarget") || "Đối tượng" }}</th>
            <th>{{ $t("admin.description") }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>#{{ item.id }}</td>
            <td>{{ formatActor(item) }}</td>
            <td>{{ item.action }}</td>
            <td>{{ formatTarget(item) }}</td>
            <td class="metadata">{{ formatMetadata(item.metadata) }}</td>
            <td>{{ formatDate(item.created_at) }}</td>
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

const items = ref([]);
const loading = ref(false);
const actionFilter = ref("");
const fromDate = ref("");
const toDate = ref("");
const exportingCsv = ref(false);
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
let timer = null;
let autoRefreshTimer = null;

async function fetchLogs(page = 1, opts = { silent: false }) {
  if (!opts?.silent) loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize.value || 20));
    if (actionFilter.value.trim())
      params.set("action", actionFilter.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const res = await $fetch(`/api/admin/logs?${params.toString()}`);
    items.value = Array.isArray(res?.data) ? res.data : [];
    if (res?.pagination) {
      pagination.value = res.pagination;
    }
  } catch (e) {
    items.value = [];
    pagination.value = { page: 1, limit: 10, total: 0, totalPages: 1 };
  } finally {
    if (!opts?.silent) loading.value = false;
  }
}

watch(
  () => [actionFilter.value, fromDate.value, toDate.value],
  () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fetchLogs(1), 300);
  },
);

async function exportCsv() {
  exportingCsv.value = true;
  try {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (actionFilter.value.trim())
      params.set("action", actionFilter.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const url = `/api/admin/logs?${params.toString()}`;
    const csv = await $fetch(url);
    const blob = new Blob([String(csv)], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "admin-logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error("[admin logs export]", e);
  } finally {
    exportingCsv.value = false;
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.totalPages) return;
  fetchLogs(page);
}

function changePageSize() {
  pagination.value.page = 1;
  fetchLogs(1);
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

function formatActor(item) {
  const actorType = item?.actor_type || "system";
  const actorId = item?.actor_id != null ? `#${item.actor_id}` : "";
  return [actorType, actorId].filter(Boolean).join(" ");
}

function formatTarget(item) {
  if (!item?.target_type) return "-";
  return `${item.target_type}${item?.target_id ? `#${item.target_id}` : ""}`;
}

function formatMetadata(metadata) {
  if (!metadata) return "-";
  try {
    const data = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    return JSON.stringify(data);
  } catch {
    return String(metadata);
  }
}

onMounted(() => {
  fetchLogs(1);
  autoRefreshTimer = setInterval(
    () => fetchLogs(pagination.value.page || 1, { silent: true }),
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
.logs-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-toolbar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  padding: 0.75rem 1rem;
  background: rgba(5, 15, 35, 0.5);
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
  border-radius: 10px;
}
.search-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.search-group label {
  width: 95px;
}
.input--sm {
  padding: 0.45rem 0.75rem;
  min-width: 220px;
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
.table-loading,
.table-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
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
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.15);
}
.data-table th {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
}
.metadata {
  max-width: 420px;
  white-space: pre-wrap;
  word-break: break-word;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}
.page-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.page-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-page {
  padding: 0.4rem 1rem;
  background: rgb(var(--accent-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
}
.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

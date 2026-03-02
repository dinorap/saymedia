<template>
  <div class="orders-page">
    <div class="orders-toolbar">
      <div v-if="isSuperAdmin" class="filter-group">
        <label>{{ $t("admin.filterByAdmin") }}</label>
        <select
          v-model="filterAdmin"
          class="input input--sm"
          @change="() => fetchOrders(1)"
        >
          <option value="">{{ $t("admin.allAdmins") }}</option>
          <option v-for="a in admins" :key="a.id" :value="a.id">
            {{ a.username }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.status") }}</label>
        <select
          v-model="filterStatus"
          class="input input--sm"
          @change="() => fetchOrders(1)"
        >
          <option value="">{{ $t("admin.noData") }}</option>
          <option value="pending">pending</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
    </div>

    <div class="table-wrap card">
      <div v-if="loading" class="table-loading">
        {{ $t("admin.loading") }}
      </div>
      <div v-else-if="!orders.length" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ $t("admin.id") }}</th>
            <th>{{ $t("admin.username") }}</th>
            <th v-if="isSuperAdmin">{{ $t("admin.email") }}</th>
            <th v-if="isSuperAdmin">{{ $t("admin.adminId") }}</th>
            <th>{{ $t("payment.history.amount") }}</th>
            <th>{{ $t("admin.status") }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(o, idx) in orders" :key="o.id">
            <td>
              {{ (pagination.page - 1) * pagination.limit + idx + 1 }}
            </td>
            <td>{{ o.user_username }}</td>
            <td v-if="isSuperAdmin">{{ o.user_email }}</td>
            <td v-if="isSuperAdmin">{{ o.admin_username || "-" }}</td>
            <td>{{ formatVnd(o.amount) }}</td>
            <td>
              <span class="badge" :class="statusClass(o.status)">
                {{ o.status }}
              </span>
            </td>
            <td>{{ formatDate(o.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.totalPages > 1" class="pagination">
      <button
        type="button"
        class="btn-page"
        :disabled="pagination.page <= 1"
        @click="goToPage(pagination.page - 1)"
      >
        {{ $t("admin.prev") }}
      </button>
      <span class="page-info">
        {{ $t("admin.page") }} {{ pagination.page }} {{ $t("admin.of") }}
        {{ pagination.totalPages }} ({{ pagination.total }}
        {{ $t("admin.records") }})
      </span>
      <button
        type="button"
        class="btn-page"
        :disabled="pagination.page >= pagination.totalPages"
        @click="goToPage(pagination.page + 1)"
      >
        {{ $t("admin.next") }}
      </button>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const { t } = useI18n();
const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");

const admins = ref([]);
const orders = ref([]);
const loading = ref(true);

const filterAdmin = ref("");
const filterStatus = ref("");
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });

async function fetchAdmins() {
  if (!isSuperAdmin.value) return;
  try {
    const res = await $fetch("/api/admin/admins");
    if (res?.success && res.data) admins.value = res.data;
  } catch (e) {
    console.error("[admin orders admins]", e);
  }
}

async function fetchOrders(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (isSuperAdmin.value && filterAdmin.value) {
      params.set("admin_id", String(filterAdmin.value));
    }
    const res = await $fetch(`/api/admin/orders?${params.toString()}`);
    if (res?.success && res.data) orders.value = res.data;
    if (res?.pagination) pagination.value = res.pagination;
  } catch (e) {
    console.error("[admin orders]", e);
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    fetchOrders(page);
  }
}

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(val) {
  if (!val) return "-";
  let d;
  if (typeof val === "string" && val.includes(" ")) {
    d = new Date(val.replace(" ", "T") + "Z");
  } else {
    d = new Date(val);
  }
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status) {
  if (status === "completed") return "badge--success";
  if (status === "pending") return "badge--primary";
  if (status === "cancelled") return "badge--muted";
  return "badge--muted";
}

onMounted(async () => {
  await fetchAdmins();
  await fetchOrders(1);
});
</script>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.orders-toolbar {
  display: flex;
  flex-wrap: wrap;
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

.filter-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.input--sm {
  padding: 0.45rem 0.75rem;
  min-width: 140px;
}

.table-wrap {
  overflow-x: auto;
  padding: 1rem;
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
  border-bottom: 1px solid rgba(1, 123, 251, 0.15);
}

.data-table th {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data-table td {
  color: var(--text-primary);
}

.data-table tbody tr:hover {
  background: rgba(1, 123, 251, 0.05);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge--primary {
  background: rgba(1, 123, 251, 0.25);
  color: var(--blue-bright);
}

.badge--success {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.badge--muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  margin-top: 0.5rem;
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


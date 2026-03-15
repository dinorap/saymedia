<template>
  <div class="revenue-page">
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">{{ $t("admin.totalUsers") }}</div>
        <div class="kpi-value">{{ summary.totalUsers }}</div>
      </div>
      <div v-if="summary.isSuperAdmin" class="kpi-card">
        <div class="kpi-label">{{ $t("admin.totalAdmins") }}</div>
        <div class="kpi-value">{{ summary.totalAdmins }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ $t("admin.orders") }}</div>
        <div class="kpi-value">{{ summary.totalOrders }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">
          {{ $t("admin.revenueCompletedOrders") }}
        </div>
        <div class="kpi-value">{{ summary.completedOrders }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">
          {{ $t("admin.revenueTotalDeposits") }}
        </div>
        <div class="kpi-value">{{ formatVnd(summary.totalDepositAmount) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">
          {{ $t("admin.revenueCompletedAmount") }}
        </div>
        <div class="kpi-value">{{ formatVnd(summary.completedAmount) }}</div>
      </div>
    </div>

    <div class="grid-row">
      <div class="card">
        <h2 class="card-title">
          {{ $t("admin.revenueRecentDeposits") }}
        </h2>
        <div v-if="loading" class="table-loading">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="!summary.recentDeposits.length" class="table-empty">
          {{ $t("admin.noData") }}
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>{{ $t("admin.username") }}</th>
              <th>{{ $t("payment.history.amount") }}</th>
              <th>{{ $t("admin.status") }}</th>
              <th>{{ $t("admin.createdAt") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in summary.recentDeposits" :key="d.id">
              <td>{{ d.user_username }}</td>
              <td>{{ formatVnd(d.actual_amount || d.amount) }}</td>
              <td>{{ d.status }}</td>
              <td>{{ formatDate(d.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2 class="card-title">
          {{ $t("admin.revenueRecentOrders") }}
        </h2>
        <div v-if="loading" class="table-loading">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="!summary.recentOrders.length" class="table-empty">
          {{ $t("admin.noData") }}
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>{{ $t("admin.username") }}</th>
              <th>{{ $t("payment.history.amount") }}</th>
              <th>{{ $t("admin.status") }}</th>
              <th>{{ $t("admin.createdAt") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in summary.recentOrders" :key="o.id">
              <td>{{ o.user_username }}</td>
              <td>{{ formatVnd(o.amount) }}</td>
              <td>{{ o.status }}</td>
              <td>{{ formatDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="card detail-section">
      <div class="detail-tabs">
        <button
          type="button"
          class="detail-tab"
          :class="{ active: activeView === 'day' }"
          @click="activeView = 'day'"
        >
          {{ $t("admin.revenueViewByDay") }}
        </button>
        <button
          type="button"
          class="detail-tab"
          :class="{ active: activeView === 'month' }"
          @click="activeView = 'month'"
        >
          {{ $t("admin.revenueViewByMonth") }}
        </button>
        <button
          type="button"
          class="detail-tab"
          :class="{ active: activeView === 'year' }"
          @click="activeView = 'year'"
        >
          {{ $t("admin.revenueViewByYear") }}
        </button>
      </div>
      <div class="detail-filters">
        <span>{{ $t("admin.revenueRangeLabel") }}:</span>
        <input v-model="fromDate" type="date" class="input input--sm" />
        <span>-</span>
        <input v-model="toDate" type="date" class="input input--sm" />
      </div>
      <div v-if="!currentSeries.length" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="detail-table">
        <thead>
          <tr>
            <th>{{ $t("admin.revenuePeriod") }}</th>
            <th>{{ $t("admin.revenueOrdersCount") }}</th>
            <th>{{ $t("admin.revenueCompletedCount") }}</th>
            <th class="detail-amount">
              {{ $t("admin.revenueCompletedRevenue") }}
            </th>
            <th class="detail-amount">
              {{ $t("admin.revenueTotalDepositAmount") }}
            </th>
            <th class="detail-bar-cell">
              {{ $t("admin.revenueRatio") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in currentSeries" :key="row.period">
            <td>{{ row.period }}</td>
            <td>{{ row.totalOrders }}</td>
            <td>{{ row.completedOrders }}</td>
            <td class="detail-amount">{{ formatVnd(row.completedAmount) }}</td>
            <td class="detail-amount">
              {{ formatVnd(row.totalDepositAmount) }}
            </td>
            <td class="detail-bar-cell">
              <div class="detail-bar-track">
                <div
                  class="detail-bar-fill"
                  :style="{
                    width: `${
                      row.completedAmount && maxCompletedAmount
                        ? Math.max(
                            5,
                            Math.round(
                              (row.completedAmount / maxCompletedAmount) * 100,
                            ),
                          )
                        : 0
                    }%`,
                  }"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const loading = ref(true);
let autoRefreshTimer = null;
const summary = reactive({
  totalUsers: 0,
  totalAdmins: 0,
  totalOrders: 0,
  completedOrders: 0,
  completedAmount: 0,
  successfulDeposits: 0,
  totalDepositAmount: 0,
  recentOrders: [],
  recentDeposits: [],
  byDay: [],
  byMonth: [],
  byYear: [],
  isSuperAdmin: false,
});
const activeView = ref("day");
const fromDate = ref("");
const toDate = ref("");

async function fetchSummary(opts = { silent: false }) {
  if (!opts?.silent) loading.value = true;
  try {
    const res = await $fetch("/api/admin/revenue-summary");
    if (res?.success && res.data) {
      Object.assign(summary, res.data);
    }
  } finally {
    if (!opts?.silent) loading.value = false;
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

onMounted(() => {
  fetchSummary();
  autoRefreshTimer = setInterval(() => fetchSummary({ silent: true }), 5000);
});
onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});

const currentSeries = computed(() => {
  let base = [];
  if (activeView.value === "day") base = summary.byDay || [];
  else if (activeView.value === "month") base = summary.byMonth || [];
  else base = summary.byYear || [];

  let items = base.slice();
  const from = fromDate.value;
  const to = toDate.value;

  if (from) {
    items = items.filter((row) => {
      const p = String(row.period || "");
      if (!p) return false;
      if (activeView.value === "day") return p >= from;
      if (activeView.value === "month")
        return p.slice(0, 7) >= from.slice(0, 7);
      return p.slice(0, 4) >= from.slice(0, 4);
    });
  }

  if (to) {
    items = items.filter((row) => {
      const p = String(row.period || "");
      if (!p) return false;
      if (activeView.value === "day") return p <= to;
      if (activeView.value === "month") return p.slice(0, 7) <= to.slice(0, 7);
      return p.slice(0, 4) <= to.slice(0, 4);
    });
  }

  return items;
});

const maxCompletedAmount = computed(() => {
  const list = currentSeries.value || [];
  if (!list.length) return 0;
  return list.reduce(
    (max, row) => Math.max(max, Number(row.completedAmount || 0)),
    0,
  );
});
</script>

<style scoped>
.revenue-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.kpi-card {
  background: rgba(5, 15, 35, 0.7);
  border: 1px solid rgba(1, 123, 251, 0.25);
  border-radius: 10px;
  padding: 0.85rem 1rem;
}
.kpi-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.kpi-value {
  margin-top: 0.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}
.grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 1000px) {
  .grid-row {
    grid-template-columns: 1fr;
  }
}
.card {
  background: rgba(5, 15, 35, 0.7);
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
  padding: 1rem;
}
.card-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.data-table th,
.data-table td {
  padding: 0.6rem 0.55rem;
  border-bottom: 1px solid rgba(1, 123, 251, 0.15);
  text-align: left;
}
.data-table th {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.76rem;
}
.table-loading,
.table-empty {
  padding: 1rem 0;
  color: var(--text-muted);
}

.detail-section {
  margin-top: 1.25rem;
}
.detail-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.detail-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0 0.85rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.detail-filters span:first-child {
  min-width: 110px;
}
.detail-filters .input--sm {
  min-width: 190px;
  max-width: 220px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}
.detail-filters input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}
.detail-tab {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}
.detail-tab.active {
  border-color: var(--blue-bright);
  background: rgba(1, 123, 251, 0.16);
  color: #fff;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.detail-table th,
.detail-table td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
}
.detail-table th {
  color: var(--text-secondary);
  font-size: 0.78rem;
  text-transform: uppercase;
}
.detail-amount {
  text-align: right;
}
.detail-bar-cell {
  width: 180px;
}
.detail-bar-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(1, 123, 251, 0.3);
  overflow: hidden;
}
.detail-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0ea5e9, #22c55e);
}
</style>

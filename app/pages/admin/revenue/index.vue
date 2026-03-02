<template>
  <div class="revenue-page">
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">{{ $t("admin.totalUsers") }}</div>
        <div class="kpi-value">{{ summary.totalUsers }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ $t("admin.orders") }}</div>
        <div class="kpi-value">{{ summary.totalOrders }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Đơn hoàn thành</div>
        <div class="kpi-value">{{ summary.completedOrders }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tổng nạp thành công</div>
        <div class="kpi-value">{{ formatVnd(summary.totalDepositAmount) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Doanh thu đơn hoàn thành</div>
        <div class="kpi-value">{{ formatVnd(summary.completedAmount) }}</div>
      </div>
    </div>

    <div class="grid-row">
      <div class="card">
        <h2 class="card-title">Nạp tiền gần đây</h2>
        <div v-if="loading" class="table-loading">{{ $t("admin.loading") }}</div>
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
        <h2 class="card-title">Đơn hàng gần đây</h2>
        <div v-if="loading" class="table-loading">{{ $t("admin.loading") }}</div>
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
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const loading = ref(true);
const summary = reactive({
  totalUsers: 0,
  totalOrders: 0,
  completedOrders: 0,
  completedAmount: 0,
  successfulDeposits: 0,
  totalDepositAmount: 0,
  recentOrders: [],
  recentDeposits: [],
});

async function fetchSummary() {
  loading.value = true;
  try {
    const res = await $fetch("/api/admin/revenue-summary");
    if (res?.success && res.data) {
      Object.assign(summary, res.data);
    }
  } finally {
    loading.value = false;
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

onMounted(fetchSummary);
</script>

<style scoped>
.revenue-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
</style>

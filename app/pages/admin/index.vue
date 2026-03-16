<template>
  <div class="dashboard">
    <!-- CREDIT overview -->
    <div class="credit-overview card">
      <div class="overview-item">
        <span class="label">Tổng CREDIT đang lưu hành</span>
        <span class="value">{{ formatCredit(stats.total_balance) }}</span>
        <span class="sub">
          Paid: {{ formatCredit(stats.total_paid_credit) }} · Bonus:
          {{ formatCredit(stats.total_bonus_credit) }}
        </span>
      </div>
      <div class="overview-item">
        <span class="label">CREDIT từ nạp (tích lũy)</span>
        <span class="value">{{ formatCredit(stats.total_deposit_credit) }}</span>
        <span class="sub">
          Người đã từng nạp: {{ stats.deposit_user_count }} (Tổng credit:
          {{ formatCredit(stats.deposit_credit_sum) }})
        </span>
      </div>
      <div class="overview-item">
        <span class="label">CREDIT khuyến mại (tích lũy)</span>
        <span class="value">{{ formatCredit(stats.total_promotion_credit) }}</span>
        <span class="sub">
          Tài khoản tạo cưỡng chế: {{ stats.forced_user_count }}
        </span>
      </div>
      <div class="overview-item">
        <span class="label">Nạp hôm nay</span>
        <span class="value">
          {{ formatCredit(stats.today_deposit_credit) }} credit
        </span>
        <span class="sub">
          {{ stats.today_deposit_tx_count }} giao dịch
        </span>
      </div>
      <div class="overview-item">
        <span class="label">Nạp trong tháng này</span>
        <span class="value">
          {{ formatCredit(stats.month_deposit_credit) }} credit
        </span>
        <span class="sub">
          {{ stats.month_deposit_tx_count }} giao dịch
        </span>
      </div>
      <div class="overview-item">
        <span class="label">Quy mô hệ thống</span>
        <span class="value">
          {{ stats.total_users }} user · {{ stats.total_shops }} shop
        </span>
      </div>
    </div>

    <!-- Activity KPIs -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">User mới hôm nay</div>
        <div class="kpi-value">{{ dash.new_users_today }}</div>
        <div class="kpi-sub">
          7 ngày qua: {{ dash.new_users_last7d }}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Đơn hoàn thành</div>
        <div class="kpi-value">{{ dash.completed_orders_today }}</div>
        <div class="kpi-sub">
          Tháng này: {{ dash.completed_orders_month }}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Doanh thu đơn (CREDIT)</div>
        <div class="kpi-value">
          {{ formatCredit(dash.completed_amount_today) }}
        </div>
        <div class="kpi-sub">
          Tháng này: {{ formatCredit(dash.completed_amount_month) }}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tiền nạp (VNĐ)</div>
        <div class="kpi-value">
          {{ formatVnd(dash.deposits_today_amount) }}
        </div>
        <div class="kpi-sub">
          Tháng này: {{ formatVnd(dash.deposits_month_amount) }}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">CREDIT treo cho shop</div>
        <div class="kpi-value">
          {{ formatCredit(dash.pending_shop_credit) }}
        </div>
        <div class="kpi-sub">
          Tổng công nợ cần trả
        </div>
      </div>
    </div>

    <!-- Recent activity tables -->
    <div class="grid-row">
      <div class="card">
        <h2 class="card-title">Nạp gần đây</h2>
        <div v-if="recent.depositsLoading" class="table-empty">
          Đang tải...
        </div>
        <div v-else-if="!recent.deposits.length" class="table-empty">
          Chưa có giao dịch nạp nào
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Số tiền (VNĐ)</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in recent.deposits" :key="d.id">
              <td>{{ d.user_username }}</td>
              <td>{{ formatVnd(d.actual_amount || d.amount) }}</td>
              <td>{{ d.status }}</td>
              <td>{{ formatDate(d.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2 class="card-title">Đơn gần đây</h2>
        <div v-if="recent.ordersLoading" class="table-empty">
          Đang tải...
        </div>
        <div v-else-if="!recent.orders.length" class="table-empty">
          Chưa có đơn nào
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Sản phẩm</th>
              <th>Số tiền (CREDIT)</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in recent.orders" :key="o.id">
              <td>{{ o.user_username }}</td>
              <td>{{ o.product_name || "-" }}</td>
              <td>{{ formatCredit(o.amount) }}</td>
              <td>{{ o.status }}</td>
              <td>{{ formatDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reconciliation / alerts (tạm ẩn) -->
    <div v-if="false && reconLoaded" class="recon-card card">
      <h2 class="card-title">Cảnh báo & đối soát</h2>
      <div v-if="recon.alerts && recon.alerts.length" class="recon-alerts">
        <p class="recon-alert-title">Có cảnh báo lệch số:</p>
        <ul>
          <li v-for="(m, idx) in recon.alerts" :key="idx">{{ m }}</li>
        </ul>
      </div>
      <div v-else class="recon-ok">
        Không phát hiện lệch số lớn giữa nạp, ledger và số dư user.
      </div>
      <div class="recon-grid">
        <div class="recon-item">
          <span class="label">Tiền nạp (VNĐ) thành công</span>
          <span class="value">{{ formatVnd(recon.total_deposit_vnd) }}</span>
          <span class="sub">
            Quy đổi ra CREDIT (theo {{ recon.vnd_per_credit }} VND):
            {{ formatCredit(recon.expected_credit_from_vnd) }}
          </span>
        </div>
        <div class="recon-item">
          <span class="label">CREDIT nạp ghi trong ledger</span>
          <span class="value">
            {{ formatCredit(recon.total_deposit_credit) }}
          </span>
          <span class="sub">
            Lệch so với quy đổi: {{ formatCredit(recon.diff_deposit_credit) }}
          </span>
        </div>
        <div class="recon-item">
          <span class="label">Tổng CREDIT trên users</span>
          <span class="value">
            {{ formatCredit(recon.total_users_credit) }}
          </span>
        </div>
        <div class="recon-item">
          <span class="label">Tổng delta credit_ledger</span>
          <span class="value">
            {{ formatCredit(recon.net_ledger_delta) }}
          </span>
          <span class="sub">
            Lệch: {{ formatCredit(recon.diff_users_vs_ledger) }}
          </span>
        </div>
        <div class="recon-item">
          <span class="label">CREDIT treo cho shop (admin_wallet)</span>
          <span class="value">
            {{ formatCredit(recon.pending_shop_credit) }}
          </span>
          <span class="sub">Công nợ cần trả cho các shop</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

const stats = ref({
  total_balance: 0,
  total_paid_credit: 0,
  total_bonus_credit: 0,
  total_deposit_credit: 0,
  total_promotion_credit: 0,
  forced_user_count: 0,
  deposit_user_count: 0,
  deposit_credit_sum: 0,
  today_deposit_tx_count: 0,
  today_deposit_credit: 0,
  month_deposit_tx_count: 0,
  month_deposit_credit: 0,
  total_users: 0,
  total_shops: 0,
});

const dash = ref({
  new_users_today: 0,
  new_users_last7d: 0,
  completed_orders_today: 0,
  completed_orders_month: 0,
  completed_amount_today: 0,
  completed_amount_month: 0,
  deposits_today_count: 0,
  deposits_today_amount: 0,
  deposits_month_count: 0,
  deposits_month_amount: 0,
  pending_shop_credit: 0,
});

const recent = reactive({
  deposits: [],
  orders: [],
  depositsLoading: false,
  ordersLoading: false,
});

const recon = ref({
  vnd_per_credit: 0,
  total_deposit_vnd: 0,
  total_deposit_credit: 0,
  expected_credit_from_vnd: 0,
  diff_deposit_credit: 0,
  total_users_credit: 0,
  net_ledger_delta: 0,
  diff_users_vs_ledger: 0,
  pending_shop_credit: 0,
  alerts: [],
});
const reconLoaded = ref(false);

async function fetchStats() {
  try {
    const res = await $fetch("/api/admin/credit-stats");
    if (res?.success && res.data) {
      stats.value = res.data;
    }
  } catch (e) {
    console.error("[admin dashboard credit stats]", e);
  }
}

function formatCredit(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatVnd(v) {
  const n = Number(v) || 0;
  return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
}

async function fetchDashboard() {
  try {
    const res = await $fetch("/api/admin/dashboard-stats");
    if (res?.success && res.data) {
      dash.value = res.data;
    }
  } catch (e) {
    console.error("[admin dashboard stats]", e);
  }
}

async function fetchRecent() {
  try {
    // silent refresh: không nháy loading khi auto refresh
    // (loading chỉ dùng cho lần load đầu hoặc khi cần)
    const res = await $fetch("/api/admin/revenue-summary");
    if (res?.success && res.data) {
      recent.deposits = res.data.recentDeposits || [];
      recent.orders = res.data.recentOrders || [];
    } else {
      recent.deposits = [];
      recent.orders = [];
    }
  } catch (e) {
    console.error("[admin dashboard recent]", e);
    recent.deposits = [];
    recent.orders = [];
  }
}

async function fetchReconciliation() {
  try {
    const res = await $fetch("/api/admin/credit-reconciliation");
    if (res?.success && res.data) {
      recon.value = res.data;
    }
  } catch (e) {
    // Không cần log lỗi 403 (admin_1), chỉ bỏ qua
    if (e?.statusCode !== 403 && e?.status !== 403) {
      console.error("[admin credit reconciliation]", e);
    }
  } finally {
    reconLoaded.value = true;
  }
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
  fetchStats();
  fetchDashboard();
  fetchRecent();
  // Đối soát chỉ dành cho admin_0, backend tự chặn role khác
  fetchReconciliation();

  // Auto refresh 5s, silent (không bật loading để tránh nháy)
  const timer = setInterval(() => {
    fetchStats();
    fetchDashboard();
    fetchRecent();
    fetchReconciliation();
  }, 5000);

  onUnmounted(() => clearInterval(timer));
});
</script>

<style scoped>
/* admin dashboard content only, styles come from app/assets/css/layouts/admin.css */
.credit-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.overview-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.overview-item .label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.overview-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}
.overview-item .sub {
  margin-top: 2px;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}
.kpi-card {
  background: rgba(5, 15, 35, 0.7);
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
}
.kpi-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.kpi-value {
  margin-top: 0.2rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}
.kpi-sub {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.25rem;
}
@media (max-width: 900px) {
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
  font-weight: 600;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.data-table th,
.data-table td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  text-align: left;
}
.data-table th {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
}
.table-empty {
  padding: 1rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.recon-card {
  margin-top: 1.25rem;
}
.recon-alerts {
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.6);
  background: rgba(127, 29, 29, 0.5);
  color: #fecaca;
  font-size: 0.9rem;
}
.recon-alerts ul {
  margin: 0.3rem 0 0;
  padding-left: 1.1rem;
}
.recon-alert-title {
  margin: 0;
  font-weight: 600;
}
.recon-ok {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.recon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
.recon-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.recon-item .label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.recon-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}
.recon-item .sub {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>

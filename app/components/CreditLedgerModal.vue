<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal card">
        <div class="head">
          <h3>{{ $t("admin.creditLedger") || "Sổ sao kê tín chỉ" }}</h3>
          <button class="close-btn" @click="close">×</button>
        </div>
        <div class="body">
          <div class="toolbar">
            <div class="filter-group">
              <label>{{
                $t("admin.transactionType") || "Loại giao dịch"
              }}</label>
              <select v-model="typeFilter">
                <option value="">{{ $t("admin.all") || "Tất cả" }}</option>
                <option value="deposit">Nạp tiền</option>
                <option value="purchase">Mua sản phẩm</option>
                <option value="refund">Hoàn tiền</option>
                <option value="admin_adjust">Admin điều chỉnh</option>
                <option value="system_adjust">Hệ thống điều chỉnh</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Từ ngày</label>
              <input v-model="fromDate" type="date" />
            </div>
            <div class="filter-group">
              <label>Đến ngày</label>
              <input v-model="toDate" type="date" />
            </div>
            <div class="filter-group filter-search">
              <label>Tìm kiếm</label>
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="Loại, số tiền, ngày..."
                class="filter-search-input"
              />
            </div>
          </div>

          <div v-if="loading" class="state">{{ $t("admin.loading") }}</div>
          <div v-else-if="!items.length" class="state">
            {{ $t("admin.noData") }}
          </div>
          <div v-else-if="!filteredItems.length" class="state">
            Không có bản ghi nào phù hợp với bộ lọc.
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ $t("admin.transactionType") || "Loại" }}</th>
                <th>{{ $t("admin.deltaCredit") || "Biến động" }}</th>
                <th>{{ $t("admin.beforeAfter") || "Trước/Sau" }}</th>
                <th>{{ $t("admin.createdAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredItems" :key="row.id">
                <td>#{{ row.id }}</td>
                <td>{{ row.transaction_type }}</td>
                <td :class="Number(row.delta) >= 0 ? 'up' : 'down'">
                  {{ Number(row.delta) >= 0 ? "+" : ""
                  }}{{ formatVnd(row.delta) }}
                </td>
                <td>
                  {{ formatVnd(row.balance_before) }} →
                  {{ formatVnd(row.balance_after) }}
                </td>
                <td>{{ formatDate(row.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const items = ref([]);
const loading = ref(false);
const typeFilter = ref("");
const fromDate = ref("");
const toDate = ref("");
const searchKeyword = ref("");
let filterTimer = null;

const filteredItems = computed(() => {
  let list = items.value;
  const q = (searchKeyword.value || "").trim().toLowerCase();
  if (q) {
    list = list.filter((row) => {
      const typeStr = (row.transaction_type || "").toLowerCase();
      const deltaStr = (Number(row.delta) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const beforeStr = (Number(row.balance_before) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const afterStr = (Number(row.balance_after) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const dateStr = formatDate(row.created_at).toLowerCase();
      return typeStr.includes(q) || deltaStr.includes(q) || beforeStr.includes(q) || afterStr.includes(q) || dateStr.includes(q);
    });
  }
  return list;
});

let autoRefreshTimer = null;

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      fetchData({});
      autoRefreshTimer = setInterval(() => fetchData({ silent: true }), 5000);
    } else {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    }
  },
);

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
});

async function fetchData(opts) {
  const silent = !!opts?.silent;
  if (!silent) loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (typeFilter.value) params.set("type", typeFilter.value);
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value + " 23:59:59");

    const res = await $fetch(`/api/credit-ledger/my?${params.toString()}`);
    items.value = Array.isArray(res?.data) ? res.data : [];
  } catch {
    if (!silent) items.value = [];
  } finally {
    if (!silent) loading.value = false;
  }
}

watch(
  () => [typeFilter.value, fromDate.value, toDate.value],
  () => {
    if (!props.modelValue) return;
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      fetchData();
    }, 300);
  },
);

function reload() {
  fetchData();
}

function close() {
  emit("update:modelValue", false);
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
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}
.modal {
  width: min(960px, 95vw);
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.2);
}
.head h3 {
  margin: 0;
}
.close-btn {
  background: transparent;
  border: 0;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
}
.body {
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.25rem;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.filter-group select,
.filter-group input[type="date"],
.filter-group .filter-search-input {
  min-width: 140px;
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
}
.filter-search .filter-search-input {
  min-width: 180px;
}
.state {
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
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.15);
  text-align: left;
}
.data-table th {
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.78rem;
}
.up {
  color: #27ae60;
}
.down {
  color: #ff6b6b;
}
</style>

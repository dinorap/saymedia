<template>
  <Teleport to="body">
    <div v-if="modelValue" class="history-overlay" @click.self="handleClose">
      <div class="history-modal">
        <header class="history-header">
          <h3 class="history-title">
            {{ $t("payment.history.title") }}
          </h3>
          <button type="button" class="history-close" @click="handleClose">
            ×
          </button>
        </header>

        <section class="history-body">
          <div class="history-filters">
            <div class="filter-group">
              <label>Từ ngày</label>
              <input v-model="fromDate" type="date" />
            </div>
            <div class="filter-group">
              <label>Đến ngày</label>
              <input v-model="toDate" type="date" />
            </div>
            <div class="history-filter-actions">
              <button
                type="button"
                class="btn-export"
                :disabled="exporting"
                @click="exportCsv"
              >
                {{ exporting ? "Đang xuất..." : "Xuất CSV" }}
              </button>
            </div>
          </div>

          <div v-if="loading" class="history-state">
            {{ $t("auth.loading") }}
          </div>
          <div v-else-if="error" class="history-state history-state--error">
            {{ error }}
          </div>
          <div v-else-if="!items.length" class="history-state">
            {{ $t("payment.history.empty") }}
          </div>
          <div v-else class="history-table-wrap">
            <table class="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ $t("payment.history.time") }}</th>
                  <th>{{ $t("payment.history.amount") }}</th>
                  <th>{{ $t("payment.history.actualAmount") }}</th>
                  <th>{{ $t("payment.history.status") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(tx, idx) in items" :key="tx.id">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ formatDate(tx.created_at) }}</td>
                  <td>{{ formatVnd(tx.amount) }}</td>
                  <td>{{ formatVnd(tx.actual_amount || tx.amount) }}</td>
                  <td>
                    <span class="status-badge" :class="'status-' + tx.status">
                      {{ tx.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer class="history-footer">
          <button type="button" class="btn-secondary" @click="handleClose">
            {{ $t("admin.cancel") }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const { t } = useI18n();

const items = ref([]);
const loading = ref(false);
const error = ref("");
const fromDate = ref("");
const toDate = ref("");
const exporting = ref(false);
let filterTimer = null;

async function loadHistory(opts) {
  const silent = !!opts?.silent;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value + " 23:59:59");

    const res = await $fetch(`/api/payment/history?${params.toString()}`);
    if (res?.success && Array.isArray(res.data)) {
      items.value = res.data;
    } else {
      items.value = [];
    }
  } catch (e) {
    if (!silent) {
      error.value =
        e?.data?.statusMessage ||
        t("payment.history.loadError") ||
        "Không lấy được lịch sử nạp";
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

function reload() {
  loadHistory();
}

async function exportCsv() {
  exporting.value = true;
  try {
    const params = new URLSearchParams();
    params.set("limit", "500");
    params.set("format", "csv");
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value + " 23:59:59");

    const url = `/api/payment/history?${params.toString()}`;
    const res = await fetch(url);
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deposit-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch {
    // ignore export error
  } finally {
    exporting.value = false;
  }
}

let autoRefreshTimer = null;

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadHistory({});
      autoRefreshTimer = setInterval(() => loadHistory({ silent: true }), 5000);
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

watch(
  () => [fromDate.value, toDate.value],
  () => {
    if (!props.modelValue) return;
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      loadHistory();
    }, 300);
  },
);

function handleClose() {
  emit("update:modelValue", false);
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
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.history-modal {
  width: 100%;
  max-width: 720px;
  max-height: 80vh;
  background: var(--bg-card);
  border-radius: 1rem;
  border: 1px solid var(--blue-border);
  box-shadow: var(--neon-shadow);
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.history-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.history-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
}

.history-body {
  padding: 0.75rem 1.5rem 1rem;
  flex: 1;
  overflow: hidden;
}

.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.filter-group input[type="date"] {
  min-width: 150px;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.history-filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-filter,
.btn-export {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.7);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-export {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(22, 163, 74, 0.15);
  color: #bbf7d0;
}

.history-state {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.history-state--error {
  color: #fca5a5;
}

.history-table-wrap {
  max-height: 48vh;
  overflow: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.history-table th,
.history-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.6);
  text-align: left;
}

.history-table th {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.history-table td {
  color: var(--text-primary);
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-success {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}

.status-pending {
  background: rgba(250, 204, 21, 0.18);
  color: #facc15;
}

.status-expired,
.status-cancelled {
  background: rgba(148, 163, 184, 0.2);
  color: #9ca3af;
}

.history-footer {
  padding: 0.75rem 1.5rem 1.25rem;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  justify-content: flex-end;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.3rem;
  border-radius: 999px;
  border: 1px solid var(--btn-secondary-border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
}
</style>

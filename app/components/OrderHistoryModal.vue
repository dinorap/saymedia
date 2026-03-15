<template>
  <Teleport to="body">
    <div v-if="modelValue" class="history-overlay" @click.self="handleClose">
      <div class="history-modal">
        <header class="history-header">
          <h3 class="history-title">
            {{ $t("admin.orders") }}
          </h3>
          <button type="button" class="history-close" @click="handleClose">
            ×
          </button>
        </header>

        <section class="history-body">
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
                  <th>{{ $t("admin.productName") || "Sản phẩm" }}</th>
                  <th>{{ $t("payment.history.time") }}</th>
                  <th>{{ $t("payment.history.amount") }}</th>
                  <th>{{ $t("payment.history.status") }}</th>
                  <th>{{ $t("admin.orderNote") || "Ghi chú" }}</th>
                  <th>{{ $t("admin.reason") || "Lý do" }}</th>
                  <th>{{ $t("orderHistory.link") || "Link" }}</th>
                  <th>{{ $t("admin.actions") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(o, idx) in items" :key="o.id">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ o.product_name || "-" }}</td>
                  <td>{{ formatDate(o.created_at) }}</td>
                  <td>{{ formatVnd(o.amount) }}</td>
                  <td>
                    <span class="status-badge" :class="'status-' + o.status">
                      {{ o.status }}
                    </span>
                  </td>
                  <td class="history-note">
                    {{ o.note || "-" }}
                  </td>
                  <td class="history-note">
                    {{ o.refund_reason || o.refund_request_reason || "-" }}
                  </td>
                  <td class="history-link-cell">
                    <a
                      v-if="isUrl(o.product_download_url)"
                      :href="o.product_download_url"
                      target="_blank"
                      rel="noopener"
                      class="history-link-btn"
                    >
                      {{ $t("orderHistory.openLink") || "Mở link tải" }}
                    </a>
                    <span v-else>—</span>
                  </td>
                  <td class="history-link-cell">
                    <button
                      class="history-link-btn refund-btn"
                      :disabled="requestingId === o.id || !canRequestRefund(o)"
                      @click="openRefundModal(o)"
                    >
                      {{
                        o.refund_request_status === "pending"
                          ? "Đã gửi yêu cầu"
                          : o.refunded_at
                            ? "Đã hoàn tiền"
                            : "Yêu cầu hoàn"
                      }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer class="history-footer">
          <div v-if="refundTarget" class="refund-box">
            <p class="refund-title">
              Yêu cầu hoàn tiền đơn #{{ refundTarget.id }}
            </p>
            <textarea
              v-model="refundReason"
              class="refund-textarea"
              rows="3"
              placeholder="Nhập lý do hoàn tiền"
            />
            <div class="refund-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="closeRefundModal"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button
                type="button"
                class="btn-secondary refund-confirm"
                :disabled="
                  requestingId === refundTarget.id || !refundReason.trim()
                "
                @click="submitRefundRequest"
              >
                {{ requestingId === refundTarget.id ? "..." : "Gửi yêu cầu" }}
              </button>
            </div>
          </div>
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
const { show: showToast } = useToast();
const { confirm: askConfirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const error = ref("");
const refundTarget = ref(null);
const refundReason = ref("");
const requestingId = ref(null);

async function loadHistory(opts) {
  const silent = !!opts?.silent;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const res = await $fetch("/api/orders/my");
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
        "Không lấy được lịch sử đơn hàng";
    }
  } finally {
    if (!silent) loading.value = false;
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

function handleClose() {
  emit("update:modelValue", false);
  closeRefundModal();
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

function isUrl(val) {
  if (!val || typeof val !== "string") return false;
  return /^https?:\/\//i.test(val.trim());
}

function canRequestRefund(order) {
  if (!order) return false;
  if (order.refunded_at) return false;
  if (order.refund_request_status === "pending") return false;
  return order.status === "pending" || order.status === "completed";
}

function openRefundModal(order) {
  if (!canRequestRefund(order)) return;
  refundTarget.value = order;
  refundReason.value = "";
}

function closeRefundModal() {
  refundTarget.value = null;
  refundReason.value = "";
}

async function submitRefundRequest() {
  if (!refundTarget.value) return;
  const id = refundTarget.value.id;
  const ok = await askConfirm({
    title: "Xác nhận",
    message: `Gửi yêu cầu hoàn tiền cho đơn #${id}?`,
    confirmText: "Gửi yêu cầu",
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  requestingId.value = id;
  try {
    await $fetch(`/api/orders/${id}/refund-request`, {
      method: "POST",
      body: { reason: refundReason.value.trim() },
    });
    const order = items.value.find((x) => x.id === id);
    if (order) {
      order.refund_request_reason = refundReason.value.trim();
      order.refund_request_status = "pending";
      order.refund_requested_at = new Date().toISOString();
    }
    closeRefundModal();
    showToast("Đã gửi yêu cầu hoàn tiền", "success");
  } catch (e) {
    error.value = e?.data?.statusMessage || "Không gửi được yêu cầu hoàn tiền";
    showToast(error.value, "error");
  } finally {
    requestingId.value = null;
  }
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
  max-width: 1240px;
  max-height: 90vh;
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
  max-height: 62vh;
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

.history-note {
  max-width: 320px;
  white-space: pre-line;
  color: var(--text-secondary);
}

.history-note-hint {
  color: var(--text-muted);
}

.history-link-cell {
  white-space: nowrap;
}

.history-link-btn {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.5);
  color: var(--blue-electric);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  transition: var(--transition-fast);
}

.history-link-btn:hover {
  background: rgba(1, 123, 251, 0.35);
  color: var(--text-primary);
  border-color: var(--blue-bright);
}
.refund-btn {
  border-color: rgba(255, 159, 67, 0.5);
  color: #ffb266;
}
.refund-box {
  width: 100%;
  margin-right: auto;
  margin-bottom: 0.75rem;
}
.refund-title {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
}
.refund-textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.3);
  background: rgba(5, 15, 35, 0.8);
  color: var(--text-primary);
  padding: 0.55rem 0.7rem;
}
.refund-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.refund-confirm {
  border-color: rgba(255, 159, 67, 0.5);
  color: #ffb266;
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-completed {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}

.status-pending {
  background: rgba(250, 204, 21, 0.18);
  color: #facc15;
}

.status-cancelled {
  background: rgba(148, 163, 184, 0.2);
  color: #9ca3af;
}

.history-footer {
  padding: 0.75rem 1.5rem 1.25rem;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: flex-end;
}

.history-footer > .btn-secondary {
  margin-left: auto;
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
  white-space: nowrap;
  min-width: 96px;
  flex-shrink: 0;
}
</style>

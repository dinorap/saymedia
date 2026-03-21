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
          <div class="history-filters">
            <div class="filter-group">
              <label>Từ ngày</label>
              <input v-model="fromDate" type="date" />
            </div>
            <div class="filter-group">
              <label>Đến ngày</label>
              <input v-model="toDate" type="date" />
            </div>
            <div class="filter-group">
              <label>{{ $t("payment.history.status") }}</label>
              <select v-model="statusFilter" class="filter-select">
                <option value="">{{ $t("admin.all") || "Tất cả" }}</option>
                <option value="pending">Đang chờ</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div class="filter-group filter-search">
              <label>Tìm kiếm</label>
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="Sản phẩm, ghi chú, số tiền..."
                class="filter-search-input"
              />
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
          <div v-else-if="!filteredItems.length" class="history-state">
            Không có bản ghi nào phù hợp với bộ lọc.
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
                <tr v-for="(o, idx) in filteredItems" :key="o.id">
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
                    <div
                      class="history-note-preview"
                      @mouseenter="onNoteMouseEnter($event, o)"
                      @mouseleave="onNoteMouseLeave"
                    >
                      {{ formatNotePreview(o.note) }}
                    </div>
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

        <!-- Popover xem đầy đủ ghi chú đơn (hover) -->
        <Teleport to="body">
          <Transition name="note-popover">
            <div
              v-if="notePopoverOrder"
              class="note-popover"
              :style="notePopoverStyle"
              @mouseenter="clearNotePopoverLeaveTimer"
              @mouseleave="onNoteMouseLeave"
            >
              <div class="note-popover-title">
                Ghi chú đơn #{{ notePopoverOrder.id }}
              </div>
              <div class="note-popover-body">
                <template
                  v-if="
                    parsedNote.duration !== null ||
                    parsedNote.qty !== null ||
                    parsedNote.keys.length
                  "
                >
                  <p v-if="parsedNote.customText" class="note-popover-custom">
                    {{ parsedNote.customText }}
                  </p>
                  <p
                    v-if="parsedNote.duration !== null"
                    class="note-popover-row"
                  >
                    <span class="note-popover-label">Loại key:</span>
                    <span class="note-popover-value">{{
                      parsedNote.duration
                    }}</span>
                  </p>
                  <p
                    v-if="parsedNote.qty !== null || parsedNote.keys.length"
                    class="note-popover-row"
                  >
                    <span class="note-popover-label">Số lượng:</span>
                    <span class="note-popover-value">{{
                      parsedNote.qty ?? parsedNote.keys.length
                    }}</span>
                  </p>
                  <template v-if="parsedNote.keys.length">
                    <p class="note-popover-label">Key:</p>
                    <div class="note-popover-keys">
                      <div
                        v-for="(k, i) in parsedNote.keys"
                        :key="i"
                        class="note-popover-key-line"
                      >
                        {{ k }}
                      </div>
                    </div>
                  </template>
                </template>
                <template v-else>
                  <pre class="note-popover-raw">{{
                    notePopoverOrder.note || "—"
                  }}</pre>
                </template>
              </div>
            </div>
          </Transition>
        </Teleport>

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
const fromDate = ref("");
const toDate = ref("");
const statusFilter = ref("");
const searchKeyword = ref("");

const notePopoverOrder = ref(null);
const notePopoverStyle = ref({});
let notePopoverLeaveTimer = null;

function parseOrderNote(note) {
  const result = {
    customText: null,
    duration: null,
    qty: null,
    keys: [],
    isStructured: false,
  };
  if (!note || typeof note !== "string") return result;
  const raw = note.trim();
  if (!raw) return result;
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const loaiKeyIdx = lines.findIndex((l) => /^Loại key:\s*/i.test(l));
  if (loaiKeyIdx >= 0) {
    result.isStructured = true;
    const customParts = lines.slice(0, loaiKeyIdx).filter(Boolean);
    result.customText = customParts.length ? customParts.join(" ") : null;
    const m = lines[loaiKeyIdx].match(/^Loại key:\s*(.+)$/i);
    result.duration = m ? m[1].trim() || null : null;
    const soLuongIdx = lines.findIndex(
      (l, i) => i > loaiKeyIdx && /^Số lượng:\s*/i.test(l),
    );
    if (soLuongIdx >= 0) {
      const qm = lines[soLuongIdx].match(/^Số lượng:\s*(\d+)/i);
      result.qty = qm ? parseInt(qm[1], 10) : null;
    }
    const keyLabelIdx = lines.findIndex(
      (l, i) => i > loaiKeyIdx && /^Key:\s*$/i.test(l.replace(/\s+$/, "")),
    );
    if (keyLabelIdx >= 0) {
      result.keys = lines.slice(keyLabelIdx + 1).filter(Boolean);
    }
    return result;
  }
  const parts = raw.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const val = part.slice(eq + 1).trim();
    if (key === "duration") {
      result.duration = val || null;
      result.isStructured = true;
    } else if (key === "qty") {
      const n = parseInt(val, 10);
      result.qty = Number.isFinite(n) ? n : null;
      result.isStructured = true;
    } else if (key === "keys") {
      result.keys = val
        ? val
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [];
      result.isStructured = true;
    }
  }
  return result;
}

const parsedNote = computed(() => {
  if (!notePopoverOrder.value?.note)
    return { customText: null, duration: null, qty: null, keys: [] };
  return parseOrderNote(notePopoverOrder.value.note);
});

function formatNotePreview(note) {
  if (!note || typeof note !== "string") return "—";
  const trimmed = note.trim();
  if (!trimmed) return "—";
  const parsed = parseOrderNote(note);
  if (parsed.isStructured) {
    const parts = [];
    if (parsed.customText)
      parts.push(
        parsed.customText.slice(0, 25) +
          (parsed.customText.length > 25 ? "…" : ""),
      );
    if (parsed.duration) parts.push(parsed.duration);
    if (parsed.qty != null) parts.push(`${parsed.qty} key`);
    if (parsed.keys.length && parsed.qty == null)
      parts.push(`${parsed.keys.length} key`);
    return parts.length
      ? parts.join(" · ")
      : trimmed.slice(0, 40) + (trimmed.length > 40 ? "…" : "");
  }
  return trimmed.length > 35 ? trimmed.slice(0, 35) + "…" : trimmed;
}

function onNoteMouseEnter(ev, order) {
  if (notePopoverLeaveTimer) {
    clearTimeout(notePopoverLeaveTimer);
    notePopoverLeaveTimer = null;
  }
  notePopoverOrder.value = order;
  const rect = ev.currentTarget?.getBoundingClientRect?.();
  if (rect) {
    notePopoverStyle.value = {
      top: `${rect.bottom + 6}px`,
      left: `${rect.left}px`,
      minWidth: `${Math.min(320, Math.max(rect.width, 200))}px`,
    };
  } else {
    notePopoverStyle.value = {};
  }
}

function onNoteMouseLeave() {
  notePopoverLeaveTimer = setTimeout(() => {
    notePopoverOrder.value = null;
    notePopoverLeaveTimer = null;
  }, 100);
}

function clearNotePopoverLeaveTimer() {
  if (notePopoverLeaveTimer) {
    clearTimeout(notePopoverLeaveTimer);
    notePopoverLeaveTimer = null;
  }
}

function parseOrderDate(order) {
  const raw = order?.created_at;
  if (!raw) return null;
  const s =
    typeof raw === "string" && raw.includes(" ")
      ? raw.replace(" ", "T") + "Z"
      : raw;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

const filteredItems = computed(() => {
  let list = items.value;
  if (fromDate.value) {
    list = list.filter((o) => {
      const d = parseOrderDate(o);
      return d && d >= fromDate.value;
    });
  }
  if (toDate.value) {
    list = list.filter((o) => {
      const d = parseOrderDate(o);
      return d && d <= toDate.value;
    });
  }
  if (statusFilter.value) {
    list = list.filter(
      (o) =>
        (o.status || "").toLowerCase() === statusFilter.value.toLowerCase(),
    );
  }
  const q = (searchKeyword.value || "").trim().toLowerCase();
  if (q) {
    list = list.filter((o) => {
      const product = (o.product_name || "").toLowerCase();
      const note = (o.note || "").toLowerCase();
      const reason = (
        o.refund_reason ||
        o.refund_request_reason ||
        ""
      ).toLowerCase();
      const amountStr = (Number(o.amount) || 0)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return (
        product.includes(q) ||
        note.includes(q) ||
        reason.includes(q) ||
        amountStr.includes(q)
      );
    });
  }
  return list;
});

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
  notePopoverOrder.value = null;
  if (notePopoverLeaveTimer) {
    clearTimeout(notePopoverLeaveTimer);
    notePopoverLeaveTimer = null;
  }
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
  z-index: 1000;
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

.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.filter-group input[type="date"],
.filter-group .filter-select,
.filter-group .filter-search-input {
  min-width: 140px;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.filter-search .filter-search-input {
  min-width: 200px;
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
  max-width: 200px;
  color: var(--text-secondary);
}

.history-note-preview {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
  font-size: 0.88rem;
}
.history-note-preview:hover {
  color: var(--blue-bright);
}

/* Popover ghi chú đơn (hover) */
.note-popover {
  position: fixed;
  z-index: 1001;
  background: rgba(8, 20, 45, 0.98);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 20px rgb(var(--accent-rgb) / 0.15);
  padding: 0;
  max-width: 360px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.note-popover-title {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.25);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--blue-bright);
}
.note-popover-body {
  padding: 0.85rem 1rem;
  overflow-y: auto;
  font-size: 0.88rem;
  color: var(--text-primary);
}
.note-popover-custom {
  margin: 0 0 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--text-primary);
  font-size: 0.9rem;
}
.note-popover-row {
  margin: 0 0 0.4rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.note-popover-label {
  color: var(--text-secondary);
  min-width: 5.5rem;
  flex-shrink: 0;
}
.note-popover-value {
  color: var(--text-primary);
}
.note-popover-keys {
  margin-top: 0.35rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgb(var(--accent-rgb) / 0.4);
}
.note-popover-key-line {
  padding: 0.2rem 0;
  font-family: ui-monospace, monospace;
  font-size: 0.82rem;
  word-break: break-all;
  color: var(--text-primary);
}
.note-popover-raw {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.note-popover-enter-active,
.note-popover-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.note-popover-enter-from,
.note-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  background: rgb(var(--accent-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  color: var(--blue-electric);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  transition: var(--transition-fast);
}

.history-link-btn:hover {
  background: rgb(var(--accent-rgb) / 0.35);
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
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
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

@media (max-width: 768px) {
  .history-overlay {
    padding: 0.6rem;
  }
  .history-header,
  .history-body,
  .history-footer {
    padding-left: 0.85rem;
    padding-right: 0.85rem;
  }
  .history-table {
    font-size: 0.82rem;
  }
  .history-table th,
  .history-table td {
    padding: 0.45rem 0.5rem;
  }
  .filter-group {
    width: 100%;
  }
  .filter-group input[type="date"],
  .filter-group .filter-select,
  .filter-group .filter-search-input {
    min-width: 0;
    width: 100%;
  }
  .filter-search .filter-search-input {
    min-width: 0;
  }
}
</style>

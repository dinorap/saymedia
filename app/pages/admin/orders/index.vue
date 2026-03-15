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
          <option value="">{{ $t("admin.all") }}</option>
          <option value="pending">pending</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Từ ngày</label>
        <input v-model="fromDate" type="date" class="input input--sm" />
      </div>
      <div class="filter-group">
        <label>Đến ngày</label>
        <input v-model="toDate" type="date" class="input input--sm" />
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.search") }}</label>
        <input
          v-model="search"
          type="text"
          class="input input--sm"
          :placeholder="$t('admin.search')"
        />
      </div>
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
            <th>{{ $t("admin.productName") || "Sản phẩm" }}</th>
            <th>Người giới thiệu</th>
            <th>{{ $t("payment.history.amount") }}</th>
            <th>{{ $t("admin.status") }}</th>
            <th>{{ $t("admin.orderNote") || "Ghi chú" }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
            <th>{{ $t("admin.actions") }}</th>
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
            <td>{{ o.product_name || "-" }}</td>
            <td>
              <span
                v-if="o.seller_admin_id && o.seller_admin_id !== o.product_owner_admin_id"
              >
                {{ o.seller_username || "-" }}
              </span>
              <span v-else>-</span>
            </td>
            <td>{{ formatVnd(o.amount) }}</td>
            <td>
              <span class="badge" :class="statusClass(o.status)">
                {{ o.status }}
              </span>
              <div
                class="refund-status"
                v-if="o.refunded_at || o.refund_request_status"
              >
              <span v-if="o.refunded_at" class="badge badge--refund-done">
                {{ $t("admin.orderRefunded") }}
              </span>
                <span
                  v-else-if="o.refund_request_status === 'pending'"
                  class="badge badge--refund-pending"
                >
                  {{ $t("admin.orderRefundPending") }}
                </span>
              </div>
            </td>
            <td class="order-note">
              <div
                class="order-note-preview"
                @mouseenter="onNoteMouseEnter($event, o)"
                @mouseleave="onNoteMouseLeave"
              >
                {{ formatNotePreview(o.note) }}
              </div>
              <div v-if="o.refund_request_reason" class="refund-request-hint">
                {{ $t("admin.orderRefundRequest") }}:
                {{ o.refund_request_reason }}
              </div>
              <div
                v-if="o.refunded_at && o.refunded_by_admin_username"
                class="refund-refunded-by"
              >
                {{ $t("admin.orderRefundedBy") }}:
                {{ o.refunded_by_admin_username }}
              </div>
            </td>
            <td>{{ formatDate(o.created_at) }}</td>
            <td>
              <button
                type="button"
                class="btn-edit-note"
                :disabled="savingNoteId === o.id"
                @click="openEditNote(o)"
              >
                {{ savingNoteId === o.id ? "..." : $t("admin.editNote") }}
              </button>
              <button
                type="button"
                class="btn-edit-note btn-refund"
                :disabled="savingNoteId === o.id || !!o.refunded_at"
                @click="openRefundModal(o)"
              >
                {{ o.refunded_at ? "Đã hoàn" : "Hoàn tiền" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal sửa ghi chú -->
    <Teleport to="body">
      <div
        v-if="editNoteOrder"
        class="edit-note-overlay"
        @click.self="editNoteOrder = null"
      >
        <div class="edit-note-modal">
          <h3 class="edit-note-title">
            {{ $t("admin.editNote") }} #{{ editNoteOrder.id }}
          </h3>
          <textarea
            v-model="editNoteText"
            class="edit-note-textarea"
            rows="4"
            :placeholder="$t('admin.orderNote')"
          />
          <select v-model="editStatus" class="edit-status-select">
            <option value="pending">pending</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <div class="edit-note-actions">
            <button
              type="button"
              class="btn-cancel"
              @click="editNoteOrder = null"
            >
              {{ $t("admin.cancel") }}
            </button>
            <button
              type="button"
              class="btn-save"
              :disabled="savingNoteId === editNoteOrder?.id"
              @click="saveNote"
            >
              {{
                savingNoteId === editNoteOrder?.id ? "..." : $t("admin.save")
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal hoàn tiền -->
    <Teleport to="body">
      <div
        v-if="refundModalOrder"
        class="edit-note-overlay"
        @click.self="refundModalOrder = null"
      >
        <div class="edit-note-modal">
          <h3 class="edit-note-title">
            {{ $t("admin.orderRefundTitle") }} #{{ refundModalOrder.id }}
          </h3>
          <p class="refund-info">
            {{ refundModalOrder.user_username }} -
            {{ refundModalOrder.product_name || $t("admin.productName") }}
          </p>
          <p class="refund-info">
            {{ $t("admin.orderRefundAmount") }}:
            {{ formatVnd(refundModalOrder.amount) }}
          </p>
          <textarea
            v-model="refundReason"
            class="edit-note-textarea"
            rows="3"
            :placeholder="$t('admin.orderRefundReasonPlaceholder')"
          />
          <div class="edit-note-actions">
            <button
              type="button"
              class="btn-cancel"
              @click="refundModalOrder = null"
            >
              {{ $t("admin.cancel") }}
            </button>
            <button
              type="button"
              class="btn-save btn-refund-action"
              :disabled="
                savingNoteId === refundModalOrder?.id || !refundReason.trim()
              "
                @click="refundOrder"
              >
                {{
                  savingNoteId === refundModalOrder?.id
                    ? "..."
                    : $t("admin.orderRefundConfirm")
                }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
          type="button"
          class="btn-page"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >
          {{ $t("admin.prev") }}
        </button>
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

    <!-- Popover xem đầy đủ ghi chú đơn (hover) -->
    <Teleport to="body">
      <Transition name="note-popover">
        <div
          v-if="notePopoverOrder"
          class="note-popover"
          :style="notePopoverStyle"
          @mouseenter="notePopoverLeaveTimer = null"
          @mouseleave="onNoteMouseLeave"
        >
          <div class="note-popover-title">Ghi chú đơn #{{ notePopoverOrder.id }}</div>
          <div class="note-popover-body">
            <template v-if="parsedNote.duration !== null || parsedNote.qty !== null || parsedNote.keys.length">
              <p v-if="parsedNote.customText" class="note-popover-custom">
                {{ parsedNote.customText }}
              </p>
              <p v-if="parsedNote.duration !== null" class="note-popover-row">
                <span class="note-popover-label">Loại key:</span>
                <span class="note-popover-value">{{ parsedNote.duration }}</span>
              </p>
              <p v-if="parsedNote.qty !== null || parsedNote.keys.length" class="note-popover-row">
                <span class="note-popover-label">Số lượng:</span>
                <span class="note-popover-value">{{ parsedNote.qty ?? parsedNote.keys.length }}</span>
              </p>
              <template v-if="parsedNote.keys.length">
                <p class="note-popover-label">Key:</p>
                <div class="note-popover-keys">
                  <div v-for="(k, i) in parsedNote.keys" :key="i" class="note-popover-key-line">{{ k }}</div>
                </div>
              </template>
            </template>
            <template v-else>
              <pre class="note-popover-raw">{{ notePopoverOrder.note || "—" }}</pre>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
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
const search = ref("");
const fromDate = ref("");
const toDate = ref("");
const exportingCsv = ref(false);
let searchTimer = null;
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
const editNoteOrder = ref(null);
const editNoteText = ref("");
const editStatus = ref("pending");
const refundReason = ref("");
const savingNoteId = ref(null);
const refundModalOrder = ref(null);
let autoRefreshTimer = null;

const notePopoverOrder = ref(null);
const notePopoverStyle = ref({});
let notePopoverLeaveTimer = null;

function parseOrderNote(note) {
  const result = { customText: null, duration: null, qty: null, keys: [], isStructured: false };
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
    const soLuongIdx = lines.findIndex((l, i) => i > loaiKeyIdx && /^Số lượng:\s*/i.test(l));
    if (soLuongIdx >= 0) {
      const qm = lines[soLuongIdx].match(/^Số lượng:\s*(\d+)/i);
      result.qty = qm ? parseInt(qm[1], 10) : null;
    }
    const keyLabelIdx = lines.findIndex((l, i) => i > loaiKeyIdx && /^Key:\s*$/i.test(l.replace(/\s+$/, "")));
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
      result.keys = val ? val.split(",").map((k) => k.trim()).filter(Boolean) : [];
      result.isStructured = true;
    }
  }
  return result;
}

const parsedNote = computed(() => {
  if (!notePopoverOrder.value?.note) return { customText: null, duration: null, qty: null, keys: [] };
  return parseOrderNote(notePopoverOrder.value.note);
});

function formatNotePreview(note) {
  if (!note || typeof note !== "string") return "—";
  const trimmed = note.trim();
  if (!trimmed) return "—";
  const parsed = parseOrderNote(note);
  if (parsed.isStructured) {
    const parts = [];
    if (parsed.customText) parts.push(parsed.customText.slice(0, 25) + (parsed.customText.length > 25 ? "…" : ""));
    if (parsed.duration) parts.push(parsed.duration);
    if (parsed.qty != null) parts.push(`${parsed.qty} key`);
    if (parsed.keys.length && parsed.qty == null) parts.push(`${parsed.keys.length} key`);
    return parts.length ? parts.join(" · ") : trimmed.slice(0, 40) + (trimmed.length > 40 ? "…" : "");
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

async function fetchAdmins() {
  if (!isSuperAdmin.value) return;
  try {
    const res = await $fetch("/api/admin/admins");
    if (res?.success && res.data) admins.value = res.data;
  } catch (e) {
    console.error("[admin orders admins]", e);
  }
}

async function fetchOrders(page = 1, opts = { silent: false }) {
  if (!opts?.silent) {
    loading.value = true;
  }
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize.value));
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (isSuperAdmin.value && filterAdmin.value) {
      params.set("admin_id", String(filterAdmin.value));
    }
    if (search.value.trim()) params.set("search", search.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const res = await $fetch(`/api/admin/orders?${params.toString()}`);
    if (res?.success && res.data) orders.value = res.data;
    if (res?.pagination) pagination.value = res.pagination;
  } catch (e) {
    console.error("[admin orders]", e);
    orders.value = [];
  } finally {
    if (!opts?.silent) {
      loading.value = false;
    }
  }
}

watch(
  () => [search.value, fromDate.value, toDate.value],
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchOrders(1), 300);
  },
);

async function exportCsv() {
  exportingCsv.value = true;
  try {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (isSuperAdmin.value && filterAdmin.value) params.set("admin_id", String(filterAdmin.value));
    if (search.value.trim()) params.set("search", search.value.trim());
    if (fromDate.value) params.set("from", fromDate.value);
    if (toDate.value) params.set("to", toDate.value);
    const url = `/api/admin/orders?${params.toString()}`;
    const csv = await $fetch(url);
    const blob = new Blob([String(csv)], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "admin-orders.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error("[admin orders export]", e);
  } finally {
    exportingCsv.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    fetchOrders(page);
  }
}

function changePageSize() {
  pagination.value.page = 1;
  fetchOrders(1);
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

function openEditNote(order) {
  editNoteOrder.value = order;
  editNoteText.value = order.note || "";
  editStatus.value = order.status || "pending";
}

function openRefundModal(order) {
  if (order.refunded_at) return;
  refundModalOrder.value = order;
  refundReason.value = order.refund_reason || order.refund_request_reason || "";
}

async function saveNote() {
  if (!editNoteOrder.value) return;
  const id = editNoteOrder.value.id;
  savingNoteId.value = id;
  try {
    await $fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      body: { note: editNoteText.value, status: editStatus.value },
    });
    const o = orders.value.find((x) => x.id === id);
    if (o) {
      o.note = editNoteText.value;
      o.status = editStatus.value;
    }
    editNoteOrder.value = null;
    const { show } = useToast();
    show(t("admin.updateSuccess"), "success");
  } catch (e) {
    const { show } = useToast();
    show(e?.data?.statusMessage || "Cập nhật thất bại", "error");
  } finally {
    savingNoteId.value = null;
  }
}

async function refundOrder() {
  if (!refundModalOrder.value) return;
  const id = refundModalOrder.value.id;
  if (!refundReason.value.trim()) {
    const { show } = useToast();
    show(t("admin.orderRefundReasonRequired"), "error");
    return;
  }
  savingNoteId.value = id;
  try {
    await $fetch(`/api/admin/orders/${id}/refund`, {
      method: "POST",
      body: { reason: refundReason.value.trim() },
    });
    const o = orders.value.find((x) => x.id === id);
    if (o) {
      o.status = "cancelled";
      o.refund_reason = refundReason.value.trim();
      o.refunded_at = new Date().toISOString();
    }
    refundModalOrder.value = null;
    const { show } = useToast();
    show(t("admin.orderRefundSuccess"), "success");
  } catch (e) {
    const { show } = useToast();
    show(e?.data?.statusMessage || t("admin.orderRefundFailed"), "error");
  } finally {
    savingNoteId.value = null;
  }
}

onMounted(async () => {
  await fetchAdmins();
  await fetchOrders(1);
  autoRefreshTimer = setInterval(() => {
    fetchOrders(pagination.value.page || 1, { silent: true });
  }, 5000);
});

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
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

.btn-search {
  padding: 0.45rem 0.75rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-sort-direction {
  padding-inline: 0.75rem;
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

.order-note {
  max-width: 200px;
  color: var(--text-secondary);
}
.order-note-preview {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
  font-size: 0.9rem;
}
.order-note-preview:hover {
  color: var(--blue-bright);
}
.refund-request-hint {
  margin-top: 0.35rem;
  color: #ffb266;
  font-size: 0.8rem;
}

.refund-refunded-by {
  margin-top: 0.2rem;
  color: #6ee7b7;
  font-size: 0.8rem;
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
.badge--refund-done {
  margin-top: 4px;
  background: rgba(39, 174, 96, 0.18);
  color: #2ecc71;
}
.badge--refund-pending {
  margin-top: 4px;
  background: rgba(250, 204, 21, 0.18);
  color: #facc15;
}
.refund-status {
  margin-top: 2px;
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

.btn-edit-note {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.5);
  border-radius: 6px;
  color: var(--blue-bright);
  cursor: pointer;
}

.btn-edit-note:hover:not(:disabled) {
  background: rgba(1, 123, 251, 0.3);
}
.btn-refund {
  margin-left: 0.4rem;
  border-color: rgba(255, 159, 67, 0.5);
  color: #ff9f43;
}
.btn-refund-action {
  background: #ff9f43;
}

.btn-edit-note:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Popover ghi chú đơn (hover) */
.note-popover {
  position: fixed;
  z-index: 1001;
  background: rgba(8, 20, 45, 0.98);
  border: 1px solid rgba(1, 123, 251, 0.45);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(1, 123, 251, 0.15);
  padding: 0;
  max-width: 360px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.note-popover-title {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(1, 123, 251, 0.25);
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
  border-left: 2px solid rgba(1, 123, 251, 0.4);
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
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.note-popover-enter-from,
.note-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.edit-note-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.edit-note-modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
}

.edit-note-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.refund-info {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.edit-note-textarea {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: vertical;
}

.edit-status-select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.edit-note-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-save {
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: none;
  background: var(--blue-bright);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

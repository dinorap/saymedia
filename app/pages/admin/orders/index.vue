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
      <div class="filter-group">
        <label>{{ $t("admin.search") }}</label>
        <input
          v-model="search"
          type="text"
          class="input input--sm"
          :placeholder="$t('admin.search')"
        />
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
            <td>{{ formatVnd(o.amount) }}</td>
            <td>
              <span class="badge" :class="statusClass(o.status)">
                {{ o.status }}
              </span>
            </td>
            <td class="order-note">{{ o.note || "-" }}</td>
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
          <h3 class="edit-note-title">{{ $t("admin.editNote") }} #{{ editNoteOrder.id }}</h3>
          <textarea
            v-model="editNoteText"
            class="edit-note-textarea"
            rows="4"
            :placeholder="$t('admin.orderNote')"
          />
          <div class="edit-note-actions">
            <button type="button" class="btn-cancel" @click="editNoteOrder = null">
              {{ $t("admin.cancel") }}
            </button>
            <button
              type="button"
              class="btn-save"
              :disabled="savingNoteId === editNoteOrder?.id"
              @click="saveNote"
            >
              {{ savingNoteId === editNoteOrder?.id ? "..." : $t("admin.save") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="pagination.totalPages > 1" class="pagination">
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
let searchTimer = null;
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
const editNoteOrder = ref(null);
const editNoteText = ref("");
const savingNoteId = ref(null);

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
    params.set("limit", String(pageSize.value));
    if (filterStatus.value) params.set("status", filterStatus.value);
    if (isSuperAdmin.value && filterAdmin.value) {
      params.set("admin_id", String(filterAdmin.value));
    }
    if (search.value.trim()) {
      params.set("search", search.value.trim());
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

watch(
  () => search.value,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchOrders(1);
    }, 300);
  },
);

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
}

async function saveNote() {
  if (!editNoteOrder.value) return;
  const id = editNoteOrder.value.id;
  savingNoteId.value = id;
  try {
    await $fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      body: { note: editNoteText.value },
    });
    const o = orders.value.find((x) => x.id === id);
    if (o) o.note = editNoteText.value;
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

.btn-search {
  padding: 0.45rem 0.75rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
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

.order-note {
  max-width: 320px;
  white-space: pre-line;
  color: var(--text-secondary);
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
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  margin-top: 0.5rem;
}

.page-left,
.page-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-edit-note:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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


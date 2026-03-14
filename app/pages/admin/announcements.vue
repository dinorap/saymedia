<template>
  <div class="announcements-admin-page">
    <div class="list-toolbar">
      <div class="search-group">
        <label for="search-announcements">Tìm kiếm</label>
        <input
          id="search-announcements"
          v-model="search"
          type="text"
          class="input--sm"
          placeholder="Tiêu đề, nội dung, người đăng..."
        />
      </div>
      <button
        type="button"
        class="btn-add btn-add--right"
        @click="openModal()"
      >
        + Viết thông báo
      </button>
    </div>

    <div class="table-wrap card">
      <div v-if="loading" class="table-loading">Đang tải...</div>
      <div v-else-if="!items.length" class="table-empty">
        Chưa có thông báo nào.
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th style="width: 60px">ID</th>
            <th>Tiêu đề</th>
            <th>Nội dung</th>
            <th>Người đăng</th>
            <th>Thời gian</th>
            <th>Pop-up</th>
            <th class="th-actions">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in items" :key="a.id">
            <td>#{{ a.id }}</td>
            <td>
              <div class="cell-title">{{ a.title }}</div>
            </td>
            <td>
              <div class="cell-preview">
                {{ a.content }}
              </div>
            </td>
            <td>{{ a.authorName || "Admin" }}</td>
            <td>{{ formatDate(a.createdAt) }}</td>
            <td>
              <span
                class="badge"
                :class="a.isPopup ? 'badge--popup' : 'badge--muted'"
              >
                {{ a.isPopup ? "Bật" : "Tắt" }}
              </span>
            </td>
            <td class="td-actions">
              <button
                v-if="isSuperAdmin"
                type="button"
                class="btn-icon"
                @click="openModal(a)"
              >
                ✏️
              </button>
              <button
                v-if="isSuperAdmin"
                type="button"
                class="btn-icon btn-icon--danger"
                @click="deleteItem(a)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
        Trang {{ pagination.page }} / {{ pagination.totalPages }} ({{
          pagination.total
        }}
        bản ghi)
      </span>
      <div class="page-right">
        <button
          type="button"
          class="btn-page"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >
          Trước
        </button>
        <button
          type="button"
          class="btn-page"
          :disabled="pagination.page >= pagination.totalPages"
          @click="goToPage(pagination.page + 1)"
        >
          Sau
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="modal-overlay"
        @click.self="modalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">
            {{ editing ? "Sửa thông báo" : "Viết thông báo mới" }}
          </h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="form-row">
              <label>Tiêu đề</label>
              <input
                v-model="form.title"
                type="text"
                class="input"
                placeholder="Tiêu đề thông báo"
                required
              />
            </div>
            <div class="form-row">
              <label>Nội dung</label>
              <textarea
                v-model="form.content"
                class="input input--textarea"
                rows="5"
                placeholder="Nội dung chi tiết..."
                required
              />
            </div>
            <div v-if="isSuperAdmin" class="form-row form-row-inline">
              <label class="checkbox-label">
                <input v-model="form.is_popup" type="checkbox" />
                Hiển thị dạng pop-up cho khách (tối đa 1 lần/ngày mỗi khách)
              </label>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="modalOpen = false"
              >
                Hủy
              </button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? "Đang lưu..." : "Lưu thông báo" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const { show: showToast } = useToast();
const { confirm: askConfirm } = useConfirm();
const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");

const items = ref([]);
const loading = ref(false);
const search = ref("");
const modalOpen = ref(false);
const editing = ref(null);
const form = reactive({
  id: null,
  title: "",
  content: "",
  is_popup: false,
});
const error = ref("");
const saving = ref(false);
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);

let searchTimer = null;

function formatDate(val) {
  if (!val) return "-";
  const d = new Date(val);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchList(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize.value || 10));
    if (search.value.trim()) {
      params.set("search", search.value.trim());
    }
    const res = await $fetch(`/api/admin/announcements?${params.toString()}`);
    items.value = Array.isArray(res?.data) ? res.data : [];
    if (res?.pagination) {
      pagination.value = res.pagination;
    }
  } catch (e) {
    items.value = [];
    pagination.value = { page: 1, limit: 10, total: 0, totalPages: 1 };
  } finally {
    loading.value = false;
  }
}

watch(
  () => search.value,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchList(1);
    }, 300);
  },
);

function openModal(item = null) {
  editing.value = item;
  form.id = item?.id ?? null;
  form.title = item?.title ?? "";
  form.content = item?.content ?? "";
  form.is_popup = isSuperAdmin.value ? !!item?.isPopup : false;
  error.value = "";
  modalOpen.value = true;
}

async function save() {
  error.value = "";
  saving.value = true;
  try {
    const body = {
      id: form.id,
      title: form.title,
      content: form.content,
      is_popup: isSuperAdmin.value ? !!form.is_popup : false,
    };
    await $fetch("/api/admin/announcements", {
      method: "POST",
      body,
    });
    modalOpen.value = false;
    await fetchList(pagination.value.page || 1);
    showToast("Đã lưu thông báo.", "success");
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || "Lỗi";
    showToast(error.value, "error");
  } finally {
    saving.value = false;
  }
}

async function deleteItem(item) {
  const ok = await askConfirm({
    title: "Xóa thông báo",
    message: `Bạn chắc chắn muốn xóa?\n${item.title}`,
    confirmText: "Xóa",
    cancelText: "Hủy",
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/announcements/${item.id}`, {
      method: "DELETE",
    });
    await fetchList(pagination.value.page || 1);
    showToast("Đã xóa thông báo.", "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.totalPages) return;
  fetchList(page);
}

function changePageSize() {
  pagination.value.page = 1;
  fetchList(1);
}

onMounted(() => fetchList(1));
</script>

<style scoped>
.announcements-admin-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.list-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 0.75rem 1rem;
  background: rgba(5, 15, 35, 0.5);
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
}

.list-toolbar .btn-add--right {
  margin-left: auto;
}

.search-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.list-toolbar label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.input--sm {
  padding: 0.45rem 0.75rem;
  min-width: 180px;
  background: rgba(5, 15, 35, 0.9);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.btn-add {
  padding: 0.5rem 1rem;
  background: var(--blue-bright);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
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

.cell-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.cell-preview {
  font-size: 0.8rem;
  color: var(--text-secondary);
  max-width: 420px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.th-actions {
  width: 120px;
  text-align: center;
}

.td-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(1, 123, 251, 0.15);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-icon:hover {
  background: rgba(1, 123, 251, 0.25);
}

.btn-icon--danger:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.4);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  margin-top: 0.5rem;
  background: rgba(5, 15, 35, 0.5);
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
.page-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--blue-border);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  color: var(--text-primary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-row .input {
  padding: 0.6rem 0.9rem;
  background: rgba(5, 15, 35, 0.9);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}

.input--textarea {
  resize: vertical;
  min-height: 120px;
}

.form-row .input:focus {
  outline: none;
  border-color: var(--blue-bright);
}

.error-msg {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: var(--blue-bright);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}
</style>

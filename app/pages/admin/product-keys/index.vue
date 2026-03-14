<template>
  <div class="keys-page">
    <div class="list-toolbar">
      <div class="search-group">
        <label>{{ $t("admin.search") }}</label>
        <input
          v-model="search"
          type="text"
          class="input input--sm"
          :placeholder="$t('admin.search')"
        />
      </div>
      <div class="filter-group">
        <label>Thời hạn</label>
        <select v-model="duration" class="input input--sm">
          <option value="">{{ $t("admin.all") }}</option>
          <option v-for="opt in durationOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </div>
      <button
        type="button"
        class="btn-add btn-add--right"
        @click="openModal()"
      >
        + Thêm key
      </button>
    </div>

    <div class="table-wrap card">
      <div v-if="loading" class="table-loading">{{ $t("admin.loading") }}</div>
      <div v-else-if="!items.length" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên sản phẩm</th>
            <th>Key</th>
            <th>Thời hạn</th>
            <th>Giá key (VND)</th>
            <th>{{ $t("admin.createdAt") }}</th>
            <th class="th-actions">{{ $t("admin.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in items" :key="row.id">
            <td>{{ idx + 1 + (pagination.page - 1) * pagination.limit }}</td>
            <td>{{ row.product_name }}</td>
            <td class="key-cell">
              <code>{{ row.key }}</code>
            </td>
            <td>{{ row.valid_duration }}</td>
            <td>{{ formatPrice(row.price) }}</td>
            <td>{{ formatDate(row.created_at) }}</td>
            <td class="td-actions">
              <button
                type="button"
                class="btn-icon btn-icon--danger"
                :title="$t('admin.delete')"
                @click="deleteKey(row)"
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

    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="modal-overlay"
        @click.self="modalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">Thêm key sản phẩm</h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="form-row">
              <label>Tên sản phẩm</label>
              <select v-model.number="form.product_id" class="input" required>
                <option disabled :value="0">Chọn sản phẩm</option>
                <option
                  v-for="p in productOptions"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.name }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>Giá mỗi key (VND)</label>
              <input
                v-model.number="form.price"
                type="number"
                min="1"
                class="input"
                placeholder="Nhập giá cho mỗi key..."
                required
              />
            </div>
            <div class="form-row">
              <label>Danh sách key (mỗi dòng 1 key)</label>
              <div class="input-upload-row">
                <textarea
                  v-model="form.keys_text"
                  class="input input--textarea"
                  rows="6"
                  placeholder="Mỗi dòng 1 key..."
                />
                <input
                  ref="keysFileInput"
                  type="file"
                  accept=".txt"
                  class="input-file-hidden"
                  @change="onUploadKeysFile"
                />
                <button type="button" class="btn-upload" @click="openKeysFilePicker">
                  Tải file .txt
                </button>
              </div>
              <p v-if="keysCount > 0" class="keys-count">
                Đang nhập <strong>{{ keysCount }}</strong> key
              </p>
            </div>
            <div class="form-row">
              <label>Thời hạn</label>
              <select v-model="form.valid_duration" class="input" required>
                <option disabled value="">Chọn thời hạn</option>
                <option v-for="opt in durationOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="modalOpen = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? "..." : $t("admin.save") }}
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

const { t } = useI18n();
const { show: showToast } = useToast();
const { confirm: askConfirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const search = ref("");
const duration = ref("");
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 });
const pageSize = ref(20);
let searchTimer = null;

const durationOptions = [
  "2h",
  "12h",
  "1d",
  "3d",
  "7d",
  "10d",
  "30d",
  "90d",
  "lifetime",
];

const modalOpen = ref(false);
const form = reactive({
  product_id: 0,
  price: 0,
  keys_text: "",
  valid_duration: "",
});
const error = ref("");
const saving = ref(false);
const productOptions = ref([]);
const keysFileInput = ref(null);

const keysCount = computed(() => {
  return String(form.keys_text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !!l).length;
});

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

function formatPrice(val) {
  const n = Number(val || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return n.toLocaleString("vi-VN");
}

async function fetchList() {
  loading.value = true;
  try {
    const query = new URLSearchParams();
    if (search.value.trim()) query.set("search", search.value.trim());
    if (duration.value) query.set("duration", duration.value);
    query.set("page", String(pagination.value.page));
    query.set("limit", String(pageSize.value));
    const res = await $fetch(`/api/admin/product-keys?${query.toString()}`);
    items.value = res?.success && Array.isArray(res.data) ? res.data : [];
    if (res?.pagination) pagination.value = res.pagination;
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => search.value,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      pagination.value.page = 1;
      fetchList();
    }, 300);
  },
);

watch(
  () => duration.value,
  () => {
    pagination.value.page = 1;
    fetchList();
  },
);

function goToPage(page) {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  fetchList();
}

function changePageSize() {
  pagination.value.page = 1;
  fetchList();
}

function openModal() {
  form.product_id = 0;
  form.price = 0;
  form.keys_text = "";
  form.valid_duration = "";
  error.value = "";
  modalOpen.value = true;
}

async function save() {
  error.value = "";
  if (!form.product_id) {
    error.value = "Vui lòng chọn sản phẩm";
    return;
  }
  if (!form.price || form.price <= 0) {
    error.value = "Giá key phải lớn hơn 0";
    return;
  }
  const keys = String(form.keys_text || "")
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => !!k);
  if (!keys.length) {
    error.value = "Danh sách key không được để trống";
    return;
  }
  if (!form.valid_duration) {
    error.value = "Vui lòng chọn thời hạn";
    return;
  }

  saving.value = true;
  try {
    const selected = productOptions.value.find((p) => p.id === form.product_id);
    const productName = selected?.name || "";
    await $fetch("/api/admin/product-keys", {
      method: "POST",
      body: {
        product_id: form.product_id,
        product_name: productName,
        price: form.price,
        keys,
        valid_duration: form.valid_duration,
      },
    });
    modalOpen.value = false;
    await fetchList();
    showToast("Đã thêm key", "success");
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || "Lỗi";
    showToast(error.value, "error");
  } finally {
    saving.value = false;
  }
}

function openKeysFilePicker() {
  if (keysFileInput.value) {
    keysFileInput.value.click();
  }
}

async function onUploadKeysFile(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => !!l);
    if (!lines.length) return;
    const existing = String(form.keys_text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => !!l);
    const merged = Array.from(new Set([...existing, ...lines]));
    form.keys_text = merged.join("\n");
  } finally {
    if (input) input.value = "";
  }
}

async function deleteKey(row) {
  const ok = await askConfirm({
    title: t("admin.delete"),
    message: `Xóa key này?\n${row.key}`,
    confirmText: t("admin.delete"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/product-keys/${row.id}`, {
      method: "DELETE",
    });
    await fetchList();
    showToast(t("admin.deleteSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

onMounted(() => {
  fetchList();
  // Load danh sách sản phẩm cho dropdown
  $fetch("/api/admin/products?limit=500&status=active")
    .then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        productOptions.value = res.data.map((p) => ({
          id: p.id,
          name: p.name,
        }));
      }
    })
    .catch(() => {
      productOptions.value = [];
    });
});
</script>

<style scoped>
.keys-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
.search-group,
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.key-cell code {
  font-size: 0.78rem;
  word-break: break-all;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.4);
}
.th-actions {
  width: 80px;
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
.btn-icon--danger:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.4);
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
.btn-page {
  padding: 0.4rem 1rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
}
.btn-page:disabled {
  opacity: 0.5;
  cursor: default;
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
  padding: 1.5rem 1.75rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
}
.modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 1rem;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
.input-upload-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}
.input-upload-row .input--textarea {
  flex: 1;
}
.input-file-hidden {
  display: none;
}
.btn-upload {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.5);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.input--textarea {
  min-height: 140px;
}
.keys-count {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-muted);
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


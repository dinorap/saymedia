<template>
  <div class="products-page">
    <div class="list-toolbar">
      <div class="search-group">
        <label>{{ $t("admin.search") }}</label>
        <input
          v-model="search"
          type="text"
          class="input input--sm"
          :placeholder="$t('admin.search')"
          @keyup.enter="fetchList"
        />
        <button type="button" class="btn-search" @click="fetchList">🔍</button>
      </div>
      <button
        type="button"
        class="btn-add btn-add--right"
        @click="openModal()"
      >
        + {{ $t("admin.add") }}
      </button>
    </div>
    <div class="table-wrap card">
      <div v-if="loading" class="table-loading">
        {{ $t("admin.loading") }}
      </div>
      <div v-else-if="!hasItems" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ $t("admin.id") }}</th>
            <th>{{ $t("admin.productName") || "Tên sản phẩm" }}</th>
            <th>{{ $t("admin.adminId") }}</th>
            <th>{{ $t("admin.description") || "Mô tả" }}</th>
            <th>{{ $t("admin.price") || "Giá" }}</th>
            <th>{{ $t("admin.productType") || "Loại" }}</th>
            <th>{{ $t("admin.downloadUrl") || "Link tải" }}</th>
            <th>{{ $t("admin.status") }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
            <th v-if="isSuperAdmin" class="th-actions">{{ $t("admin.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in items" :key="item.id">
            <td>{{ idx + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.admin_username || "-" }}</td>
            <td>{{ item.description || "-" }}</td>
            <td>{{ formatVnd(item.price) }}</td>
            <td>{{ item.type || "other" }}</td>
            <td class="col-url">
              <a
                v-if="item.download_url"
                :href="item.download_url"
                target="_blank"
                rel="noopener"
              >
                {{ $t("admin.open") || "Mở" }}
              </a>
              <span v-else>-</span>
            </td>
            <td>
              <span
                class="badge"
                :class="item.is_active ? 'badge--success' : 'badge--muted'"
              >
                {{
                  item.is_active ? $t("admin.active") : $t("admin.blocked")
                }}
              </span>
            </td>
            <td>{{ formatDate(item.created_at) }}</td>
            <td class="td-actions">
              <button
                type="button"
                class="btn-icon"
                :title="$t('admin.edit')"
                :disabled="!canEdit(item)"
                @click="canEdit(item) && openModal(item)"
              >
                ✏️
              </button>
              <button
                type="button"
                class="btn-icon btn-icon--danger"
                :title="$t('admin.delete')"
                :disabled="!canDelete(item)"
                @click="canDelete(item) && deleteItem(item)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3 class="modal-title">
            {{ editing ? $t("admin.edit") : ($t("admin.addProduct") || "Thêm sản phẩm") }}
          </h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="form-row">
              <label>{{ $t("admin.productName") || "Tên sản phẩm" }}</label>
              <input
                v-model="form.name"
                type="text"
                class="input"
                required
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.description") || "Mô tả" }}</label>
              <input
                v-model="form.description"
                type="text"
                class="input"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.downloadUrl") || "Link tải (nếu có)" }}</label>
              <input
                v-model="form.download_url"
                type="text"
                class="input"
                placeholder="https://..."
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.price") || "Giá" }}</label>
              <input
                v-model.number="form.price"
                type="number"
                class="input"
                min="0"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.productType") || "Loại" }}</label>
              <select v-model="form.type" class="input">
                <option value="tool">tool</option>
                <option value="account">account</option>
                <option value="service">service</option>
                <option value="other">other</option>
              </select>
            </div>
            <div v-if="editing" class="form-row">
              <label>{{ $t("admin.status") }}</label>
              <select v-model="form.is_active" class="input">
                <option :value="true">{{ $t("admin.active") }}</option>
                <option :value="false">{{ $t("admin.blocked") }}</option>
              </select>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="modalOpen = false">
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
const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");
const items = ref([]);
const loading = ref(false);
const search = ref("");
const modalOpen = ref(false);
const editing = ref(null);
const currentAdminId = ref(null);
const form = reactive({
  name: "",
  description: "",
  download_url: "",
  price: 0,
  type: "other",
  is_active: true,
});
const error = ref("");
const saving = ref(false);

const hasItems = computed(() => Array.isArray(items.value) && items.value.length > 0);

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

async function fetchList() {
  loading.value = true;
  try {
    const query = new URLSearchParams();
    if (search.value) query.set("search", search.value.trim());
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await $fetch(`/api/admin/products${suffix}`);
    items.value = res?.success && Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function initAdmin() {
  try {
    const res = await $fetch("/api/auth/me");
    if (res?.success && res.user) {
      currentAdminId.value = res.user.id;
    } else {
      currentAdminId.value = null;
    }
  } catch {
    currentAdminId.value = null;
  }
}

function openModal(item = null) {
  // admin_0: thêm/sửa mọi sản phẩm; admin_1: chỉ thao tác trên sản phẩm của mình
  if (item && !canEdit(item)) return;
  editing.value = item;
  form.name = item?.name ?? "";
  form.description = item?.description ?? "";
  form.download_url = item?.download_url ?? "";
  form.price = Number(item?.price ?? 0);
  form.type = item?.type || "other";
  form.is_active = item ? !!item.is_active : true;
  error.value = "";
  modalOpen.value = true;
}

async function save() {
  error.value = "";
  saving.value = true;
  try {
    const payload = {
      name: form.name?.trim(),
      description: form.description?.trim(),
      download_url: form.download_url?.trim(),
      price: Number(form.price || 0),
      type: form.type || "other",
      is_active:
        form.is_active === true ||
        form.is_active === "true" ||
        form.is_active === 1,
    };
    if (editing.value?.id) {
      await $fetch(`/api/admin/products/${editing.value.id}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await $fetch("/api/admin/products", {
        method: "POST",
        body: payload,
      });
    }
    modalOpen.value = false;
    await fetchList();
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || "Lỗi";
  } finally {
    saving.value = false;
  }
}

async function deleteItem(item) {
  if (!canDelete(item)) return;
  if (!confirm(`${t("admin.confirmDelete")}\n${item.name}`)) return;
  try {
    await $fetch(`/api/admin/products/${item.id}`, { method: "DELETE" });
    await fetchList();
  } catch (e) {
    alert(e?.data?.statusMessage || "Lỗi");
  }
}

function canEdit(item) {
  if (isSuperAdmin.value) return true;
  if (!currentAdminId.value) return false;
  return item.admin_id === currentAdminId.value;
}

function canDelete(item) {
  return canEdit(item);
}

onMounted(async () => {
  await initAdmin();
  await fetchList();
});
</script>

<style scoped>
.products-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: none;
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
.btn-search {
  padding: 0.45rem 0.75rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
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
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}
.badge--success {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}
.badge--muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.col-url a {
  color: var(--blue-bright);
  text-decoration: underline;
  font-size: 0.85rem;
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
  max-width: 420px;
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

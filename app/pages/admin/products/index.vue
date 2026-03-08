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
        />
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.productType") }}</label>
        <select v-model="filterType" class="input input--sm">
          <option value="">{{ $t("admin.all") }}</option>
          <option value="tool">tool</option>
          <option value="account">account</option>
          <option value="service">service</option>
          <option value="other">other</option>
        </select>
      </div>
      <div class="filter-group">
        <label>{{ $t("admin.status") }}</label>
        <select v-model="filterStatus" class="input input--sm">
          <option value="">{{ $t("admin.all") }}</option>
          <option value="active">{{ $t("admin.active") }}</option>
          <option value="inactive">{{ $t("admin.blocked") }}</option>
        </select>
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
      <AppLoading v-if="loading" />
      <div v-else-if="!hasItems" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ $t("admin.id") }}</th>
            <th>{{ $t("admin.productName") || "Tên sản phẩm" }}</th>
            <th>{{ $t("admin.thumbnail") || "Ảnh" }}</th>
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
            <td class="col-thumb">
              <NuxtImg
                v-if="item.thumbnail_url"
                :src="item.thumbnail_url"
                :alt="item.name || 'thumb'"
                class="thumb-img"
                loading="lazy"
              />
              <span v-else>-</span>
            </td>
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

    <div v-if="pagination.total > 0" class="pagination">
      <div class="page-left">
        <label>{{ $t("admin.records") }} / page</label>
        <select v-model.number="pageSize" class="input input--sm" @change="changePageSize">
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
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3 class="modal-title">
            {{ editing ? $t("admin.edit") : ($t("admin.addProduct") || "Thêm sản phẩm") }}
          </h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="modal-grid">
              <section class="modal-section">
                <h4 class="modal-section-title">
                  {{ $t("admin.productName") || "Tên sản phẩm" }}
                </h4>
                <div class="form-row">
                  <input
                    v-model="form.name"
                    type="text"
                    class="input"
                    required
                    :placeholder="$t('admin.productName')"
                  />
                </div>
                <div class="form-row">
                  <label>{{ $t("admin.description") || "Mô tả ngắn" }}</label>
                  <input
                    v-model="form.description"
                    type="text"
                    class="input"
                    :placeholder="$t('admin.description')"
                  />
                </div>
                <div class="form-row">
                  <label>{{ $t("admin.downloadUrl") || 'Link tải (nếu có)' }}</label>
                  <input
                    v-model="form.download_url"
                    type="text"
                    class="input"
                    placeholder="https://..."
                  />
                </div>
                <div class="form-row inline">
                  <div class="inline-half">
                    <label>{{ $t("admin.price") || "Giá" }}</label>
                    <input
                      v-model.number="form.price"
                      type="number"
                      class="input"
                      min="0"
                    />
                  </div>
                  <div class="inline-half">
                    <label>{{ $t("admin.productType") || "Loại" }}</label>
                    <select v-model="form.type" class="input">
                      <option value="tool">tool</option>
                      <option value="account">account</option>
                      <option value="service">service</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                </div>
                <div v-if="editing" class="form-row">
                  <label>{{ $t("admin.status") }}</label>
                  <select v-model="form.is_active" class="input">
                    <option :value="true">{{ $t("admin.active") }}</option>
                    <option :value="false">{{ $t("admin.blocked") }}</option>
                  </select>
                </div>
              </section>

              <section class="modal-section">
                <h4 class="modal-section-title">
                  {{ $t("admin.thumbnail") || "Ảnh & gallery" }}
                </h4>
                <div class="form-row">
                  <label>{{ $t("admin.thumbnail") || "Ảnh thumbnail" }}</label>
                  <div class="input-upload-row">
                    <input
                      v-model="form.thumbnail_url"
                      type="text"
                      class="input"
                      placeholder="https://... (ảnh đại diện)"
                    />
                    <input
                      ref="thumbFileInput"
                      type="file"
                      accept="image/*"
                      class="input-file-hidden"
                      @change="onUploadThumbnail"
                    />
                    <button type="button" class="btn-upload" @click="openThumbPicker">
                      {{ $t("admin.upload") || "Upload" }}
                    </button>
                  </div>
                  <div v-if="form.thumbnail_url" class="thumb-preview-wrap">
                    <NuxtImg :src="form.thumbnail_url" alt="thumbnail preview" class="thumb-preview" />
                  </div>
                </div>
                <div class="form-row">
                  <label>{{ $t("admin.images") || "Danh sách ảnh (mỗi dòng 1 URL)" }}</label>
                  <div class="input-upload-row">
                    <textarea
                      v-model="form.images_text"
                      class="input input--textarea"
                      rows="3"
                      placeholder="https://.../screenshot-1.png&#10;https://.../screenshot-2.png"
                    />
                    <input
                      ref="imagesFileInput"
                      type="file"
                      accept="image/*"
                      multiple
                      class="input-file-hidden"
                      @change="onUploadImages"
                    />
                    <button type="button" class="btn-upload" @click="openImagesPicker">
                      {{ $t("admin.upload") || "Upload" }}
                    </button>
                  </div>
                  <p v-if="imagesCount" class="images-count">
                    {{ imagesCount }} {{ $t("admin.images") || "ảnh" }}
                  </p>
                </div>
                <div class="form-row">
                  <label>{{ $t("admin.productSupportContact") || "Thông tin liên hệ hỗ trợ cho sản phẩm" }}</label>
                  <textarea
                    v-model="form.support_contact"
                    class="input input--textarea"
                    rows="4"
                    :placeholder="$t('admin.productSupportContactPlaceholder')"
                  />
                </div>
              </section>
              <section class="modal-section preview-section">
                <h4 class="modal-section-title">
                  {{ $t("admin.longDescription") || "Mô tả chi tiết" }}
                </h4>
                <div class="preview-box">
                  <textarea
                    v-model="form.long_description"
                    class="input input--textarea preview-textarea"
                    rows="6"
                    :placeholder="$t('admin.longDescription') || 'Mô tả chi tiết sản phẩm...'"
                  />
                </div>
              </section>
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

const { t, locale } = useI18n();
const { show: showToast } = useToast();
const { confirm: askConfirm } = useConfirm();
const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");
const items = ref([]);
const loading = ref(false);
const search = ref("");
const filterType = ref("");
const filterStatus = ref("");
const modalOpen = ref(false);
const editing = ref(null);
const currentAdminId = ref(null);
const thumbFileInput = ref(null);
const imagesFileInput = ref(null);
const form = reactive({
  name: "",
  description: "",
  long_description: "",
  support_contact: "",
  download_url: "",
  thumbnail_url: "",
  images_text: "",
  price: 0,
  type: "other",
  is_active: true,
});
const error = ref("");
const saving = ref(false);

const hasItems = computed(() => Array.isArray(items.value) && items.value.length > 0);
let searchTimer = null;
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
const imagesCount = computed(() => {
  if (!form.images_text) return 0;
  return form.images_text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => !!s).length;
});

function validateForm() {
  const name = form.name?.trim();
  const price = Number(form.price || 0);
  const download = form.download_url?.trim();

  if (!name) {
    error.value = t("admin.productName") + " " + (locale.value === "vi" ? "không được để trống" : "is required");
    return false;
  }
  if (price <= 0) {
    error.value =
      locale.value === "vi"
        ? "Giá sản phẩm phải lớn hơn 0"
        : "Product price must be greater than 0";
    return false;
  }
  if (download && !/^https?:\/\//i.test(download)) {
    error.value =
      locale.value === "vi"
        ? "Link tải phải bắt đầu bằng http:// hoặc https://"
        : "Download URL must start with http:// or https://";
    return false;
  }
  error.value = "";
  return true;
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

async function fetchList() {
  loading.value = true;
  try {
    const query = new URLSearchParams();
    if (search.value.trim()) query.set("search", search.value.trim());
    if (filterType.value) query.set("type", filterType.value);
    if (filterStatus.value) query.set("status", filterStatus.value);
    query.set("page", String(pagination.value.page));
    query.set("limit", String(pageSize.value));
    const suffix = `?${query.toString()}`;
    const res = await $fetch(`/api/admin/products${suffix}`);
    items.value = res?.success && Array.isArray(res.data) ? res.data : [];
    if (res?.pagination) pagination.value = res.pagination;
  } catch (e) {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.totalPages) return;
  pagination.value.page = page;
  fetchList();
}

function changePageSize() {
  pagination.value.page = 1;
  fetchList();
}

watch(
  () => search.value,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchList();
    }, 300);
  },
);

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

function openThumbPicker() {
  if (thumbFileInput.value) {
    thumbFileInput.value.click();
  }
}

function openImagesPicker() {
  if (imagesFileInput.value) {
    imagesFileInput.value.click();
  }
}

async function uploadImagesFiles(fileList) {
  if (!fileList || !fileList.length) return [];
  const formData = new FormData();
  Array.from(fileList).forEach((file) => {
    formData.append("file", file);
  });
  const res = await $fetch("/api/admin/upload/product-image", {
    method: "POST",
    body: formData,
  });
  return res && res.success && Array.isArray(res.urls) ? res.urls : [];
}

async function onUploadThumbnail(event) {
  const input = event.target;
  try {
    const urls = await uploadImagesFiles(input.files);
    if (urls[0]) {
      form.thumbnail_url = urls[0];
    }
  } catch (e) {
    error.value =
      e?.data?.statusMessage || e?.message || "Upload ảnh thumbnail thất bại";
  } finally {
    if (input) input.value = "";
  }
}

async function onUploadImages(event) {
  const input = event.target;
  try {
    const urls = await uploadImagesFiles(input.files);
    if (urls.length) {
      const existing = form.images_text ? form.images_text.split("\n") : [];
      const merged = [...existing, ...urls].filter((x) => !!x);
      form.images_text = merged.join("\n");
    }
  } catch (e) {
    error.value =
      e?.data?.statusMessage || e?.message || "Upload danh sách ảnh thất bại";
  } finally {
    if (input) input.value = "";
  }
}

function openModal(item = null) {
  // admin_0: thêm/sửa mọi sản phẩm; admin_1: chỉ thao tác trên sản phẩm của mình
  if (item && !canEdit(item)) return;
  editing.value = item;
  form.name = item?.name ?? "";
  form.description = item?.description ?? "";
  form.long_description = item?.long_description ?? "";
  form.support_contact = item?.support_contact ?? "";
  form.download_url = item?.download_url ?? "";
  form.thumbnail_url = item?.thumbnail_url ?? "";
  form.images_text = "";
  if (item?.images_json) {
    try {
      const parsed = JSON.parse(item.images_json);
      if (Array.isArray(parsed)) {
        form.images_text = parsed.join("\n");
      }
    } catch {
      form.images_text = "";
    }
  }
  form.price = Number(item?.price ?? 0);
  form.type = item?.type || "other";
  form.is_active = item ? !!item.is_active : true;
  error.value = "";
  modalOpen.value = true;
}

async function save() {
  error.value = "";
  if (!validateForm()) return;
  saving.value = true;
  try {
    const images =
      form.images_text
        ?.split("\n")
        .map((s) => s.trim())
        .filter((s) => !!s)
        .slice(0, 10) || [];

    const payload = {
      name: form.name?.trim(),
      description: form.description?.trim(),
      long_description: form.long_description?.trim(),
      support_contact: form.support_contact?.trim(),
      download_url: form.download_url?.trim(),
      thumbnail_url: form.thumbnail_url?.trim(),
      images,
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
    showToast(t("admin.updateSuccess"), "success");
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || "Lỗi";
    showToast(error.value, "error");
  } finally {
    saving.value = false;
  }
}

async function deleteItem(item) {
  if (!canDelete(item)) return;
  const ok = await askConfirm({
    title: t("admin.delete"),
    message: `${t("admin.confirmDelete")}\n${item.name}`,
    confirmText: t("admin.delete"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/products/${item.id}`, { method: "DELETE" });
    await fetchList();
    showToast(t("admin.deleteSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
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
.filter-group {
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
.btn-page:disabled {
  opacity: 0.5;
  cursor: default;
}

.preview-section {
  grid-column: span 2;
}

.preview-box {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.8);
  min-height: 80px;
}

.preview-empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.preview-content {
  white-space: pre-line;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.preview-textarea {
  width: 100%;
  min-height: 120px;
  max-height: 260px;
  resize: vertical;
  white-space: pre-wrap;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
}

.preview-textarea::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
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
.col-thumb {
  width: 80px;
}
.thumb-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
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
  padding: 1.5rem 1.75rem;
  max-width: 760px;
  width: 100%;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
}

.modal-form::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}
.modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.2fr);
  gap: 1.2rem 1.5rem;
}
.modal-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.modal-section-title {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.input--textarea {
  min-height: 80px;
  resize: vertical;
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
.form-row.inline {
  display: flex;
  gap: 0.75rem;
}
.form-row.inline .inline-half {
  flex: 1;
}
.input-upload-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}
.input-upload-row .input {
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
.thumb-preview-wrap {
  margin-top: 0.6rem;
}
.thumb-preview {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  object-fit: cover;
}
.images-count {
  margin: 0.35rem 0 0;
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

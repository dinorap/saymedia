<template>
  <div class="about-intro-admin">
    <div v-if="!isSuperAdmin" class="card forbidden">
      <p>{{ $t("admin.aboutIntroForbidden") }}</p>
    </div>

    <template v-else>
      <div class="list-toolbar">
        <div class="search-group">
          <label for="about-intro-search">{{ $t("admin.search") }}</label>
          <input
            id="about-intro-search"
            v-model="search"
            type="text"
            class="input--sm"
            :placeholder="$t('admin.aboutIntroSearchPlaceholder')"
          />
        </div>
        <button type="button" class="btn-add btn-add--right" @click="openModal()">
          + {{ $t("admin.aboutIntroAdd") }}
        </button>
      </div>

      <div class="table-wrap card">
        <div v-if="loading" class="table-loading">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="!items.length" class="table-empty">
          {{ $t("admin.aboutIntroEmpty") }}
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th style="width: 56px">{{ $t("admin.id") }}</th>
              <th>{{ $t("admin.aboutIntroTopic") }}</th>
              <th>{{ $t("admin.aboutIntroDescription") }}</th>
              <th>{{ $t("admin.aboutIntroCanvasUrl") }}</th>
              <th style="width: 150px">{{ $t("admin.aboutIntroSort") }}</th>
              <th class="th-actions">{{ $t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id">
              <td>#{{ row.id }}</td>
              <td>
                <div class="cell-title">{{ row.topic }}</div>
              </td>
              <td>
                <div class="cell-preview">{{ row.description || "—" }}</div>
              </td>
              <td>
                <div class="cell-url" :title="row.canvasEmbedUrl">
                  {{ row.canvasEmbedUrl }}
                </div>
              </td>
              <td>{{ row.sortOrder }}</td>
              <td class="td-actions">
                <button type="button" class="btn-icon" @click="openModal(row)">
                  ✏️
                </button>
                <button
                  type="button"
                  class="btn-icon btn-icon--danger"
                  @click="deleteItem(row)"
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
          {{ $t("admin.page") }} {{ pagination.page }} /
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
    </template>

    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="modal-overlay"
        @click.self="modalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">
            {{ editing ? $t("admin.aboutIntroEdit") : $t("admin.aboutIntroCreate") }}
          </h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="form-row">
              <label>{{ $t("admin.aboutIntroTopic") }}</label>
              <input
                v-model="form.topic"
                type="text"
                class="input"
                required
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.aboutIntroDescription") }}</label>
              <textarea
                v-model="form.description"
                class="input input--textarea"
                rows="4"
                :placeholder="$t('admin.aboutIntroDescription')"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.aboutIntroCanvasUrl") }}</label>
              <input
                v-model="form.canvas_embed_url"
                type="url"
                class="input"
                required
                :placeholder="$t('admin.aboutIntroCanvasHint')"
              />
              <p class="field-hint">{{ $t("admin.aboutIntroCanvasHint") }}</p>
            </div>
            <div class="form-row">
              <label>{{ $t("admin.aboutIntroSort") }}</label>
              <input
                v-model.number="form.sort_order"
                type="number"
                class="input"
                step="1"
                min="1"
              />
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

const { t, locale } = useI18n();
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
  topic: "",
  description: "",
  canvas_embed_url: "",
  sort_order: 1,
});
const error = ref("");
const saving = ref(false);
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);

let searchTimer = null;

async function fetchList(page = 1, opts = { silent: false }) {
  if (!isSuperAdmin.value) return;
  if (!opts?.silent) loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize.value || 10));
    if (search.value.trim()) {
      params.set("search", search.value.trim());
    }
    const res = await $fetch(`/api/admin/about-introductions?${params.toString()}`);
    items.value = Array.isArray(res?.data) ? res.data : [];
    if (res?.pagination) {
      pagination.value = res.pagination;
      const p = Number(res.pagination.page) || 1;
      const tp = Number(res.pagination.totalPages) || 1;
      if (tp >= 1 && p > tp && !opts?._recursed) {
        await fetchList(tp, { silent: true, _recursed: true });
        return;
      }
    }
  } catch {
    items.value = [];
    pagination.value = { page: 1, limit: 10, total: 0, totalPages: 1 };
  } finally {
    if (!opts?.silent) loading.value = false;
  }
}

watch(
  () => search.value,
  () => {
    if (!isSuperAdmin.value) return;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchList(1);
    }, 300);
  },
);

function openModal(row = null) {
  editing.value = row;
  form.id = row?.id ?? null;
  form.topic = row?.topic ?? "";
  form.description = row?.description ?? "";
  form.canvas_embed_url = row?.canvasEmbedUrl ?? "";
  form.sort_order = Number(row?.sortOrder) >= 1 ? Number(row.sortOrder) : 1;
  error.value = "";
  modalOpen.value = true;
}

async function save() {
  error.value = "";
  saving.value = true;
  try {
    const normalizedSortOrder = Math.max(1, Number(form.sort_order) || 1);
    const body = {
      id: form.id,
      topic: form.topic,
      description: form.description,
      canvas_embed_url: form.canvas_embed_url,
      sort_order: normalizedSortOrder,
    };
    await $fetch("/api/admin/about-introductions", {
      method: "POST",
      body,
    });
    modalOpen.value = false;
    await fetchList(pagination.value.page || 1);
    showToast(t("admin.aboutIntroSaved"), "success");
  } catch (e) {
    error.value =
      e?.data?.statusMessage ||
      e?.message ||
      (locale.value === "vi" ? "Lỗi lưu" : "Save failed");
  } finally {
    saving.value = false;
  }
}

async function deleteItem(row) {
  const ok = await askConfirm({
    title: t("admin.aboutIntroDeleteTitle"),
    message: t("admin.aboutIntroDeleteConfirm"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/about-introductions/${row.id}`, {
      method: "DELETE",
    });
    await fetchList(pagination.value.page || 1);
    showToast(t("admin.aboutIntroDeleted"), "success");
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

onMounted(() => {
  if (isSuperAdmin.value) {
    fetchList(1);
  }
});
</script>

<style scoped>
.about-intro-admin {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.forbidden {
  padding: 1.5rem;
  color: var(--text-secondary);
}

.list-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 0.75rem 1rem;
  background: rgba(5, 15, 35, 0.5);
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
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
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
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
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.15);
  vertical-align: top;
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
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-url {
  font-size: 0.78rem;
  color: var(--text-muted);
  max-width: 320px;
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
  background: rgb(var(--accent-rgb) / 0.15);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-icon:hover {
  background: rgb(var(--accent-rgb) / 0.25);
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
  background: rgb(var(--accent-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  border-radius: 8px;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
}

.btn-page:hover:not(:disabled) {
  background: rgb(var(--accent-rgb) / 0.3);
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
  box-shadow: 0 0 40px rgb(var(--accent-rgb) / 0.2);
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

.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.form-row .input {
  padding: 0.6rem 0.9rem;
  background: rgba(5, 15, 35, 0.9);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}

.input--textarea {
  resize: vertical;
  min-height: 100px;
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
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}
</style>

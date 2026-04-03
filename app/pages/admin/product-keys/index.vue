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
        <label>{{ $t("admin.keyDuration") }}</label>
        <select v-model="duration" class="input input--sm">
          <option value="">{{ $t("admin.all") }}</option>
          <option v-for="opt in durationOptions" :key="opt" :value="opt">
            {{ formatDuration(opt) }}
          </option>
        </select>
      </div>
      <button type="button" class="btn-add btn-add--right" @click="openModal()">
        + {{ $t("admin.add") }}
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
            <th>{{ $t("admin.productName") }}</th>
            <th>{{ $t("admin.productKeysUi.totalKeys") }}</th>
            <th>{{ $t("admin.productKeysUi.durations") }}</th>
            <th>{{ $t("admin.createdAt") }}</th>
            <th>{{ $t("admin.updatedAt") }}</th>
            <th class="th-actions">{{ $t("admin.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in items" :key="`${row.product_id}-${idx}`">
            <td>{{ idx + 1 + (pagination.page - 1) * pagination.limit }}</td>
            <td>{{ row.product_name }}</td>
            <td>{{ row.total_keys }}</td>
            <td>{{ formatDurationList(row.durations) }}</td>
            <td>{{ formatDate(row.first_created_at) }}</td>
            <td>{{ formatDate(row.last_created_at) }}</td>
            <td class="td-actions">
              <button
                type="button"
                class="btn-icon"
                :title="$t('admin.productKeysUi.manageKeys')"
                @click="openProductKeysModal(row)"
              >
                🔑
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
          <h3 class="modal-title">{{ $t("admin.productKeysUi.addTitle") }}</h3>
          <form class="modal-form" @submit.prevent="save">
            <div class="form-row">
              <label>{{ $t("admin.productKeysUi.productNameLabel") }}</label>
              <select
                v-model.number="form.product_id"
                class="input"
                :disabled="modalProductLocked && !!currentProduct"
                required
              >
                <option disabled :value="0">
                  {{ $t("admin.productKeysUi.chooseProduct") }}
                </option>
                <option v-for="p in productOptions" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ $t("admin.productKeysUi.pricePerKey") }}</label>
              <input
                v-model.number="form.price"
                type="number"
                min="1"
                class="input"
                :placeholder="$t('admin.productKeysUi.pricePerKeyPlaceholder')"
                required
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.productKeysUi.keysListLabel") }}</label>
              <div class="input-upload-row">
                <textarea
                  v-model="form.keys_text"
                  class="input input--textarea"
                  rows="6"
                  :placeholder="$t('admin.productKeysUi.keysListPlaceholder')"
                />
                <input
                  ref="keysFileInput"
                  type="file"
                  accept=".txt"
                  class="input-file-hidden"
                  @change="onUploadKeysFile"
                />
                <button
                  type="button"
                  class="btn-upload"
                  @click="openKeysFilePicker"
                >
                  {{ $t("admin.productKeysUi.uploadTxt") }}
                </button>
              </div>
              <p v-if="keysCount > 0" class="keys-count">
                {{ $t("admin.productKeysUi.importing") }}
                <strong>{{ keysCount }}</strong>
                {{ $t("admin.productKeysUi.keysUnit") }}
              </p>
            </div>
            <div class="form-row">
              <label>{{ $t("admin.keyDuration") }}</label>
              <select v-model="form.valid_duration" class="input" required>
                <option disabled value="">
                  {{ $t("admin.productKeysUi.chooseDuration") }}
                </option>
                <option v-for="opt in durationOptions" :key="opt" :value="opt">
                  {{ formatDuration(opt) }}
                </option>
              </select>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="closeAddKeyModal"
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

    <!-- Modal quản lý key theo sản phẩm -->
    <Teleport to="body">
      <div
        v-if="productKeysModalOpen"
        class="modal-overlay"
        @click.self="closeProductKeysModal"
      >
        <div class="modal modal--wide">
          <h3 class="modal-title">
            {{ $t("admin.productKeysUi.manageTitle") }} -
            {{ currentProduct?.product_name || "" }}
          </h3>
          <div class="product-keys-toolbar">
            <div class="product-keys-left">
              <div class="filter-group">
                <label>{{ $t("admin.keyDuration") }}</label>
                <select
                  v-model="productKeysDuration"
                  class="input input--sm"
                  @change="fetchProductKeys(1)"
                >
                  <option value="">{{ $t("admin.all") }}</option>
                  <option
                    v-for="opt in durationOptions"
                    :key="opt"
                    :value="opt"
                  >
                    {{ formatDuration(opt) }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="btn-add btn-add--small"
                @click="openModalForCurrentProduct"
              >
                + {{ $t("admin.productKeysUi.addForThisProduct") }}
              </button>
            </div>
            <div class="product-keys-right">
              <div class="price-row">
                <label>{{ $t("admin.productKeysUi.editPriceDuration") }}</label>
                <select v-model="priceEditDuration" class="input input--sm">
                  <option disabled value="">
                    {{ $t("admin.productKeysUi.chooseDuration") }}
                  </option>
                  <option
                    v-for="opt in durationOptions"
                    :key="opt"
                    :value="opt"
                  >
                    {{ formatDuration(opt) }}
                  </option>
                </select>
              </div>
              <div class="price-row">
                <label>{{ $t("admin.productKeysUi.newPrice") }}</label>
                <input
                  v-model.number="priceEditValue"
                  type="number"
                  min="1"
                  class="input input--sm"
                  :placeholder="$t('admin.productKeysUi.newPricePlaceholder')"
                />
              </div>
              <div class="price-row price-row--button">
                <button
                  type="button"
                  class="btn-primary btn-primary--sm"
                  :disabled="priceEditLoading"
                  @click="applyBulkPrice"
                >
                  {{
                    priceEditLoading
                      ? "..."
                      : $t("admin.productKeysUi.editPriceByDuration")
                  }}
                </button>
              </div>
            </div>
          </div>
          <div class="table-wrap table-wrap--inner">
            <div v-if="productKeysLoading" class="table-loading">
              {{ $t("admin.loading") }}
            </div>
            <div v-else-if="!productKeys.length" class="table-empty">
              {{ $t("admin.noData") }}
            </div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ $t("admin.productKeysUi.keyColumn") }}</th>
                  <th>{{ $t("admin.keyDuration") }}</th>
                  <th>{{ $t("admin.productKeysUi.priceColumn") }}</th>
                  <th>{{ $t("admin.createdAt") }}</th>
                  <th class="th-actions">{{ $t("admin.actions") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in productKeys" :key="row.id">
                  <td>
                    {{
                      idx +
                      1 +
                      (productKeysPagination.page - 1) *
                        productKeysPagination.limit
                    }}
                  </td>
                  <td class="key-cell">
                    <code>{{ row.key }}</code>
                  </td>
                  <td>{{ formatDuration(row.valid_duration) }}</td>
                  <td>{{ formatPrice(row.price) }}</td>
                  <td>{{ formatDate(row.created_at) }}</td>
                  <td class="td-actions">
                    <button
                      type="button"
                      class="btn-icon btn-icon--danger"
                      :title="$t('admin.delete')"
                      @click="deleteKey(row, true)"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="productKeysPagination.total > 0"
            class="pagination pagination--inner"
          >
            <div class="page-left">
              <label>{{ $t("admin.records") }} / page</label>
              <select
                v-model.number="productKeysPageSize"
                class="input input--sm"
                @change="changeProductKeysPageSize"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
              </select>
            </div>
            <span class="page-info">
              {{ $t("admin.page") }} {{ productKeysPagination.page }}
              {{ $t("admin.of") }}
              {{ productKeysPagination.totalPages }}
              ({{ productKeysPagination.total }} {{ $t("admin.records") }})
            </span>
            <div class="page-right">
              <button
                type="button"
                class="btn-page"
                :disabled="productKeysPagination.page <= 1"
                @click="goToProductKeysPage(productKeysPagination.page - 1)"
              >
                {{ $t("admin.prev") }}
              </button>
              <button
                type="button"
                class="btn-page"
                :disabled="
                  productKeysPagination.page >= productKeysPagination.totalPages
                "
                @click="goToProductKeysPage(productKeysPagination.page + 1)"
              >
                {{ $t("admin.next") }}
              </button>
            </div>
          </div>
          <div class="modal-actions modal-actions--bottom">
            <button
              type="button"
              class="btn-secondary"
              @click="closeProductKeysModal"
            >
              {{ $t("admin.close") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["admin"] });

const { t } = useI18n();
const { show: showToast } = useToast();
const { confirm: askConfirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const search = ref("");
const duration = ref("");
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const pageSize = ref(10);
let searchTimer = null;
let autoRefreshTimer = null;

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

const productKeysModalOpen = ref(false);
const currentProduct = ref(null);
const productKeys = ref([]);
const productKeysLoading = ref(false);
const productKeysDuration = ref("");
const productKeysPagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
});
const productKeysPageSize = ref(10);
const modalProductLocked = ref(false);

const priceEditDuration = ref("");
const priceEditValue = ref<number | null>(null);
const priceEditLoading = ref(false);

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

function formatDuration(value) {
  if (!value) return "-";
  if (value === "lifetime") return "Lifetime";
  return String(value)
    .replace(/\b(\d+)\s*d\b/gi, "$1 ngày")
    .replace(/\b(\d+)\s*h\b/gi, "$1 giờ");
}

function formatDurationList(value) {
  if (!value) return "-";
  return String(value)
    .split(",")
    .map((part) => formatDuration(part.trim()))
    .join(", ");
}

async function fetchList(opts = { silent: false }) {
  if (!opts?.silent) {
    loading.value = true;
  }
  try {
    const query = new URLSearchParams();
    if (search.value.trim()) query.set("search", search.value.trim());
    if (duration.value) query.set("duration", duration.value);
    query.set("page", String(pagination.value.page));
    query.set("limit", String(pageSize.value));
    const res = await $fetch(
      `/api/admin/product-keys/summary?${query.toString()}`,
    );
    items.value = res?.success && Array.isArray(res.data) ? res.data : [];
    if (res?.pagination) pagination.value = res.pagination;
  } catch {
    items.value = [];
  } finally {
    if (!opts?.silent) {
      loading.value = false;
    }
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
  modalProductLocked.value = false;
}

async function save() {
  error.value = "";
  if (!form.product_id) {
    error.value = t("admin.productKeysUi.errors.chooseProduct");
    return;
  }
  if (!form.price || form.price <= 0) {
    error.value = t("admin.productKeysUi.errors.pricePositive");
    return;
  }
  const keys = String(form.keys_text || "")
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => !!k);
  if (!keys.length) {
    error.value = t("admin.productKeysUi.errors.keysRequired");
    return;
  }
  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length !== keys.length) {
    error.value = t("admin.productKeysUi.errors.duplicateKeys");
    return;
  }
  if (!form.valid_duration) {
    error.value = t("admin.productKeysUi.errors.chooseDuration");
    return;
  }

  saving.value = true;
  try {
    const selected = productOptions.value.find((p) => p.id === form.product_id);
    let productName = selected?.name || "";
    if (
      (!productName || !selected) &&
      currentProduct.value &&
      modalProductLocked.value
    ) {
      productName = currentProduct.value.product_name || "";
    }
    if (!productName) {
      error.value = t("admin.productKeysUi.errors.productNameNotFound");
      saving.value = false;
      return;
    }
    const res = await $fetch("/api/admin/product-keys", {
      method: "POST",
      body: {
        product_id: form.product_id,
        product_name: productName,
        price: form.price,
        keys: uniqueKeys,
        valid_duration: form.valid_duration,
      },
    });
    modalOpen.value = false;
    await fetchList();
    if (modalProductLocked.value && currentProduct.value) {
      // Mở lại modal quản lý key cho sản phẩm hiện tại sau khi thêm
      productKeysPagination.value.page = 1;
      productKeysModalOpen.value = true;
      await fetchProductKeys(1);
    }
    const inserted = res?.inserted ?? 0;
    const skipped = res?.skipped ?? 0;
    let msg = t("admin.productKeysUi.toasts.addedDefault");
    if (inserted && skipped) {
      msg = t("admin.productKeysUi.toasts.addedWithSkipped", { inserted, skipped });
    } else if (inserted && !skipped) {
      msg = t("admin.productKeysUi.toasts.addedInsertedOnly", { inserted });
    } else if (!inserted && skipped) {
      msg = t("admin.productKeysUi.toasts.addedNoneAllExist");
    }
    showToast(msg, inserted ? "success" : "warning");
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || t("admin.error");
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

async function deleteKey(row, isInProductModal = false) {
  const ok = await askConfirm({
    title: t("admin.delete"),
    message: t("admin.productKeysUi.confirmDeleteKey", { key: row.key }),
    confirmText: t("admin.delete"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/product-keys/${row.id}`, {
      method: "DELETE",
    });
    if (isInProductModal && currentProduct.value) {
      await fetchProductKeys(productKeysPagination.value.page);
      await fetchList({ silent: true });
    } else {
      await fetchList();
    }
    showToast(t("admin.deleteSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || t("admin.error"), "error");
  }
}

function openProductKeysModal(row) {
  currentProduct.value = row;
  productKeysDuration.value = "";
  productKeysPagination.value.page = 1;
  productKeysPageSize.value = 10;
  productKeysModalOpen.value = true;
  modalProductLocked.value = true;
  priceEditDuration.value = "";
  priceEditValue.value = null;
  fetchProductKeys(1);
}

function closeProductKeysModal() {
  productKeysModalOpen.value = false;
  currentProduct.value = null;
  productKeys.value = [];
}

async function applyBulkPrice() {
  if (!currentProduct.value) {
    showToast(t("admin.productKeysUi.errors.productNotIdentified"), "error");
    return;
  }
  if (!priceEditDuration.value) {
    showToast(t("admin.productKeysUi.errors.chooseDurationForEdit"), "error");
    return;
  }
  if (!priceEditValue.value || priceEditValue.value <= 0) {
    showToast(t("admin.productKeysUi.errors.newPricePositive"), "error");
    return;
  }

  // #region agent log
  fetch("http://127.0.0.1:7557/ingest/c867f427-67a3-44df-9ddd-ff559a241d03", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "e83c79",
    },
    body: JSON.stringify({
      sessionId: "e83c79",
      runId: "initial",
      hypothesisId: "H2_H3_H4",
      location: "app/pages/admin/product-keys/index.vue:681",
      message: "applyBulkPrice before confirm",
      data: {
        productId: currentProduct.value?.product_id ?? null,
        priceEditDuration: priceEditDuration.value,
        priceEditValue: priceEditValue.value,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  const ok = await askConfirm({
    title: t("admin.productKeysUi.confirmUpdatePriceTitle"),
    message: t("admin.productKeysUi.confirmUpdatePriceMessage", {
      duration: priceEditDuration.value,
      price: Number(priceEditValue.value || 0),
    }),
    confirmText: t("admin.productKeysUi.confirmUpdatePriceConfirm"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;

  priceEditLoading.value = true;
  try {
    // #region agent log
    fetch("http://127.0.0.1:7557/ingest/c867f427-67a3-44df-9ddd-ff559a241d03", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e83c79",
      },
      body: JSON.stringify({
        sessionId: "e83c79",
        runId: "initial",
        hypothesisId: "H2_H3_H4",
        location: "app/pages/admin/product-keys/index.vue:692",
        message: "applyBulkPrice before $fetch",
        data: {
          productId: currentProduct.value?.product_id ?? null,
          priceEditDuration: priceEditDuration.value,
          priceEditValue: priceEditValue.value,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    const res = await $fetch("/api/admin/product-keys/update-price", {
      method: "POST",
      body: {
        product_id: currentProduct.value.product_id,
        valid_duration: priceEditDuration.value,
        price: priceEditValue.value,
      },
    });
    const updated = res?.updated ?? 0;
    await fetchProductKeys(productKeysPagination.value.page);
    await fetchList({ silent: true });
    showToast(
      updated
        ? t("admin.productKeysUi.toasts.priceUpdated", { updated })
        : t("admin.productKeysUi.toasts.priceUpdatedNone"),
      updated ? "success" : "warning",
    );
  } catch (e) {
    showToast(e?.data?.statusMessage || t("admin.productKeysUi.errors.updatePriceFailed"), "error");
  } finally {
    priceEditLoading.value = false;
  }
}

async function fetchProductKeys(page = 1, opts = { silent: false }) {
  if (!currentProduct.value) return;
  if (!opts?.silent) {
    productKeysLoading.value = true;
  }
  try {
    const query = new URLSearchParams();
    query.set("product_id", String(currentProduct.value.product_id || 0));
    if (productKeysDuration.value) {
      query.set("duration", productKeysDuration.value);
    }
    query.set("page", String(page));
    query.set("limit", String(productKeysPageSize.value));
    const res = await $fetch(`/api/admin/product-keys?${query.toString()}`);
    productKeys.value = res?.success && Array.isArray(res.data) ? res.data : [];
    if (res?.pagination) productKeysPagination.value = res.pagination;
  } catch {
    productKeys.value = [];
  } finally {
    if (!opts?.silent) {
      productKeysLoading.value = false;
    }
  }
}

function goToProductKeysPage(page) {
  if (page < 1 || page > productKeysPagination.value.totalPages) {
    return;
  }
  productKeysPagination.value.page = page;
  fetchProductKeys(page);
}

function changeProductKeysPageSize() {
  productKeysPagination.value.page = 1;
  fetchProductKeys(1);
}

function openModalForCurrentProduct() {
  if (!currentProduct.value) {
    return;
  }
  // Ẩn modal danh sách key để form thêm nổi lên trên, nhưng giữ currentProduct
  productKeysModalOpen.value = false;
  form.product_id = currentProduct.value.product_id || 0;
  form.price = 0;
  form.keys_text = "";
  form.valid_duration = "";
  error.value = "";
  modalOpen.value = true;
}

function closeAddKeyModal() {
  modalOpen.value = false;
  if (modalProductLocked.value && currentProduct.value) {
    // Mở lại modal quản lý key nếu đang thêm từ trong đó
    productKeysModalOpen.value = true;
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
  autoRefreshTimer = setInterval(() => {
    fetchList({ silent: true });
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
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
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
.search-group label {
  width: 95px;
}

.filter-group label {
  min-width: 100px;
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
.table-wrap--inner {
  max-height: 55vh;
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
  border-bottom: 1px solid rgb(var(--accent-rgb) / 0.15);
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
  background: rgb(var(--accent-rgb) / 0.15);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
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
  background: rgb(var(--accent-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
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
  box-shadow: 0 0 40px rgb(var(--accent-rgb) / 0.2);
}
.modal--wide {
  max-width: 1000px;
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
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
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
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
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
.modal-actions--bottom {
  justify-content: flex-end;
  margin-top: 1rem;
}
.product-keys-toolbar {
  display: grid;
  grid-template-columns: auto auto;
  gap: 1.25rem 2rem;
  margin-bottom: 0.65rem;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}
.product-keys-left {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.product-keys-left .filter-group {
  gap: 0.4rem;
}
.product-keys-left .filter-group label {
  font-size: 0.8rem;
}
.btn-add--small {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}
.product-keys-right {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.price-row label {
  min-width: 100px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.price-row--button {
  justify-content: flex-end;
}
.btn-primary--sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

/* Select / input / button trong toolbar key — nhỏ gọn, không chiếm hết div */
.product-keys-toolbar .input--sm {
  min-width: 0;
  width: 120px;
  max-width: 140px;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
}

.product-keys-right .input--sm {
  width: 130px;
  max-width: 130px;
}

.price-row input.input--sm {
  width: 130px;
  max-width: 130px;
}

.product-keys-left .btn-add--small,
.price-row--button .btn-primary--sm {
  border-radius: 6px;
}
.pagination--inner {
  margin-top: 0.75rem;
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
.page-left label {
  min-width: 120px;
}
</style>

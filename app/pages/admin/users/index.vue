<template>
  <div class="users-page">
    <div class="tabs">
      <button
        v-if="isSuperAdmin"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'admins' }"
        @click="activeTab = 'admins'"
      >
        {{ $t("admin.adminsList") }}
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        {{ $t("admin.usersList") }}
      </button>
    </div>

    <!-- Tab: Admins -->
    <div v-show="activeTab === 'admins'" class="tab-panel">
      <div class="panel-header">
        <div class="users-toolbar">
          <div class="filter-group">
            <label>{{ $t("admin.role") }}</label>
            <select v-model="adminRoleFilter" class="input input--sm">
              <option value="">{{ $t("admin.all") }}</option>
              <option value="admin_0">admin_0</option>
              <option value="admin_1">admin_1</option>
              <option value="admin_2">admin_2</option>
            </select>
          </div>
          <div class="search-group">
            <label>{{ $t("admin.search") }}</label>
            <input
              v-model="adminSearch"
              type="text"
              class="input input--sm"
              :placeholder="$t('admin.search')"
            />
          </div>
          <button
            type="button"
            class="btn-add btn-add--right"
            @click="openAdminModal()"
          >
            + {{ $t("admin.add") }}
          </button>
        </div>
      </div>
      <div class="table-wrap card">
        <div v-if="loadingAdmins" class="table-loading">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="!filteredAdmins.length" class="table-empty">
          {{ $t("admin.noData") }}
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>{{ $t("admin.id") }}</th>
              <th>{{ $t("admin.username") }}</th>
              <th>{{ $t("admin.role") }}</th>
              <th>{{ $t("admin.refCode") }}</th>
              <th>{{ $t("admin.isActive") }}</th>
              <th>{{ $t("admin.createdAt") }}</th>
              <th class="th-actions">{{ $t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, idx) in filteredAdmins" :key="a.id">
              <td>{{ idx + 1 }}</td>
              <td>{{ a.username }}</td>
              <td>
                <span class="badge" :class="roleBadgeClass(a.role)">
                  {{ roleLabel(a.role) }}
                </span>
              </td>
              <td>
                <code class="ref-code">{{ a.ref_code }}</code>
              </td>
              <td>
                <span
                  class="badge"
                  :class="a.is_active ? 'badge--success' : 'badge--muted'"
                >
                  {{ a.is_active ? $t("admin.active") : $t("admin.blocked") }}
                </span>
              </td>
              <td>{{ formatDate(a.created_at) }}</td>
              <td class="td-actions">
                <button
                  type="button"
                  class="btn-icon"
                  :title="a.is_active ? $t('admin.lock') : $t('admin.unlock')"
                  @click="toggleAdminLock(a)"
                >
                  {{ a.is_active ? "🔒" : "🔓" }}
                </button>
                <button
                  type="button"
                  class="btn-icon"
                  :title="$t('admin.edit')"
                  @click="openAdminModal(a)"
                >
                  ✏️
                </button>
                <button
                  v-if="a.id !== 1"
                  type="button"
                  class="btn-icon btn-icon--danger"
                  :title="$t('admin.delete')"
                  @click="deleteAdmin(a)"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Users -->
    <div v-show="activeTab === 'users'" class="tab-panel">
      <div class="users-toolbar">
        <div v-if="isSuperAdmin" class="filter-group">
          <label>{{ $t("admin.filterByAdmin") }}</label>
          <select
            v-model="userFilterAdmin"
            class="input input--sm"
            @change="() => fetchUsers(1)"
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
            v-model="userStatusFilter"
            class="input input--sm"
            @change="() => fetchUsers(1)"
          >
            <option value="">{{ $t("admin.all") }}</option>
            <option value="active">{{ $t("admin.active") }}</option>
            <option value="blocked">{{ $t("admin.blocked") }}</option>
          </select>
        </div>
        <div class="search-group">
          <label>{{ $t("admin.search") }}</label>
          <input
            v-model="userSearch"
            type="text"
            class="input input--sm"
            :placeholder="$t('admin.search')"
          />
        </div>
        <div class="filter-group">
          <label>Sắp xếp theo</label>
          <select v-model="userSortField" class="input input--sm">
            <option value="created_at">Ngày tạo</option>
            <option value="last_login">Lần đăng nhập gần nhất</option>
            <option value="credit">Số dư tín chỉ</option>
            <option value="total_deposit_amount">Số tiền đã nạp</option>
          </select>
        </div>
        <button
          type="button"
          class="btn-add btn-sort-direction"
          @click="toggleUserSortDirection"
        >
          {{ userSortDirection === "asc" ? "↑" : "↓" }}
        </button>
        <button
          v-if="isSuperAdmin"
          type="button"
          class="btn-add btn-add--right"
          @click="openUserModal()"
        >
          + {{ $t("admin.add") }}
        </button>
      </div>
      <div class="table-wrap card">
        <div v-if="loadingUsers" class="table-loading">
          {{ $t("admin.loading") }}
        </div>
        <div v-else-if="!users.length" class="table-empty">
          {{ $t("admin.noData") }}
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>{{ $t("admin.id") }}</th>
              <th>{{ $t("admin.username") }}</th>
              <th>{{ $t("admin.email") }}</th>
              <th>{{ $t("admin.credit") }}</th>
              <th>Số tiền đã nạp</th>
              <th>Lần đăng nhập gần nhất</th>
              <th v-if="isSuperAdmin">{{ $t("admin.adminId") }}</th>
              <th>{{ $t("admin.status") }}</th>
              <th>{{ $t("admin.createdAt") }}</th>
              <th class="th-actions">{{ $t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in users" :key="u.id">
              <td>
                {{ (userPagination.page - 1) * userPagination.limit + idx + 1 }}
              </td>
              <td>{{ u.username }}</td>
              <td>{{ u.email }}</td>
              <td>{{ formatVnd(u.credit || 0) }}</td>
              <td>{{ formatVnd(u.total_deposit_amount || 0) }} đ</td>
              <td>{{ formatDate(u.last_login) }}</td>
              <td v-if="isSuperAdmin">{{ u.admin_username || "-" }}</td>
              <td>
                <span
                  class="badge"
                  :class="
                    u.status === 'active' ? 'badge--success' : 'badge--muted'
                  "
                >
                  {{
                    u.status === "active"
                      ? $t("admin.active")
                      : $t("admin.blocked")
                  }}
                </span>
              </td>
              <td>{{ formatDate(u.created_at) }}</td>
              <td class="td-actions">
                <button
                  type="button"
                  class="btn-icon"
                  :title="
                    u.status === 'active'
                      ? $t('admin.lock')
                      : $t('admin.unlock')
                  "
                  @click="toggleUserLock(u)"
                >
                  {{ u.status === "active" ? "🔒" : "🔓" }}
                </button>
                <button
                  type="button"
                  class="btn-icon"
                  :title="$t('admin.edit')"
                  @click="openUserModal(u)"
                >
                  ✏️
                </button>
                <button
                  v-if="isSuperAdmin"
                  type="button"
                  class="btn-icon"
                  :title="$t('admin.adjustCredit') || 'Điều chỉnh tín chỉ'"
                  @click="openAdjustCreditModal(u)"
                >
                  💳
                </button>
                <button
                  type="button"
                  class="btn-icon btn-icon--danger"
                  :title="$t('admin.delete')"
                  @click="deleteUser(u)"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="userPagination.total > 0" class="pagination">
        <div class="page-left">
          <label>{{ $t("admin.records") }} / page</label>
          <select
            v-model.number="userPageSize"
            class="input input--sm"
            @change="changeUserPageSize"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <span class="page-info">
          {{ $t("admin.page") }} {{ userPagination.page }} {{ $t("admin.of") }}
          {{ userPagination.totalPages }} ({{ userPagination.total }}
          {{ $t("admin.records") }})
        </span>
        <div class="page-right">
          <button
            type="button"
            class="btn-page"
            :disabled="userPagination.page <= 1"
            @click="goToUserPage(userPagination.page - 1)"
          >
            {{ $t("admin.prev") }}
          </button>
          <button
            type="button"
            class="btn-page"
            :disabled="userPagination.page >= userPagination.totalPages"
            @click="goToUserPage(userPagination.page + 1)"
          >
            {{ $t("admin.next") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Admin -->
    <Teleport to="body">
      <div
        v-if="adminModalOpen"
        class="modal-overlay"
        @click.self="adminModalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">
            {{ editingAdmin ? $t("admin.edit") : $t("admin.addAdmin") }}
          </h3>
          <form class="modal-form" @submit.prevent="saveAdmin">
            <div class="form-row">
              <label>{{ $t("admin.username") }}</label>
              <input
                v-model="adminForm.username"
                type="text"
                class="input"
                required
                :disabled="!!editingAdmin"
              />
            </div>
            <div v-if="!editingAdmin" class="form-row">
              <label>{{ $t("admin.password") }}</label>
              <input
                v-model="adminForm.password"
                type="password"
                class="input"
                :required="!editingAdmin"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.role") }}</label>
              <select v-model="adminForm.role" class="input">
                <option value="admin_0">{{ $t("admin.admin0") }}</option>
                <option value="admin_1">{{ $t("admin.admin1") }}</option>
                <option value="admin_2">admin_2 (chat cộng đồng)</option>
              </select>
            </div>
            <div v-if="editingAdmin" class="form-row">
              <label>{{ $t("admin.isActive") }}</label>
              <select v-model="adminForm.is_active" class="input">
                <option :value="true">{{ $t("admin.active") }}</option>
                <option :value="false">{{ $t("admin.blocked") }}</option>
              </select>
            </div>
            <p v-if="adminError" class="error-msg">{{ adminError }}</p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="adminModalOpen = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button type="submit" class="btn-primary" :disabled="adminSaving">
                {{ adminSaving ? "..." : $t("admin.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: User -->
    <Teleport to="body">
      <div
        v-if="userModalOpen"
        class="modal-overlay"
        @click.self="userModalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">
            {{ editingUser ? $t("admin.edit") : $t("admin.addUser") }}
          </h3>
          <form class="modal-form" @submit.prevent="saveUser">
            <div class="form-row">
              <label>{{ $t("admin.username") }}</label>
              <input
                v-model="userForm.username"
                type="text"
                class="input"
                required
                :disabled="!!editingUser"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.email") }}</label>
              <input
                v-model="userForm.email"
                type="email"
                class="input"
                required
                :disabled="!!editingUser"
              />
            </div>
            <div v-if="!editingUser" class="form-row">
              <label>{{ $t("admin.password") }}</label>
              <input
                v-model="userForm.password"
                type="password"
                class="input"
                required
              />
            </div>
            <div v-if="isSuperAdmin" class="form-row">
              <label>{{ $t("admin.selectAdmin") }}</label>
              <select
                v-model="userForm.admin_id"
                class="input"
                :required="!editingUser"
              >
                <option v-for="a in admins" :key="a.id" :value="a.id">
                  {{ a.username }}
                </option>
              </select>
            </div>
            <div v-if="editingUser" class="form-row">
              <label>{{ $t("admin.status") }}</label>
              <select v-model="userForm.status" class="input">
                <option value="active">{{ $t("admin.active") }}</option>
                <option value="blocked">{{ $t("admin.blocked") }}</option>
              </select>
            </div>
            <p v-if="userError" class="error-msg">{{ userError }}</p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="userModalOpen = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button type="submit" class="btn-primary" :disabled="userSaving">
                {{ userSaving ? "..." : $t("admin.save") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Adjust credit -->
    <Teleport to="body">
      <div
        v-if="adjustCreditModalOpen"
        class="modal-overlay"
        @click.self="adjustCreditModalOpen = false"
      >
        <div class="modal">
          <h3 class="modal-title">
            {{ $t("admin.adjustCredit") || "Điều chỉnh tín chỉ" }}
          </h3>
          <form class="modal-form" @submit.prevent="submitAdjustCredit">
            <div class="form-row">
              <label>{{ $t("admin.username") }}</label>
              <input
                :value="adjustTargetUser?.username || '-'"
                type="text"
                class="input"
                disabled
              />
            </div>
            <div class="form-row">
              <label>{{
                $t("admin.deltaCredit") || "Số tín chỉ thay đổi"
              }}</label>
              <input
                v-model.number="adjustDelta"
                type="number"
                class="input"
                required
                placeholder="Ví dụ: +100 hoặc -50"
              />
            </div>
            <div class="form-row">
              <label>{{ $t("admin.reason") || "Lý do" }}</label>
              <textarea
                v-model="adjustReason"
                class="input"
                rows="3"
                required
                placeholder="Nhập lý do điều chỉnh"
              />
            </div>
            <p v-if="adjustCreditError" class="error-msg">
              {{ adjustCreditError }}
            </p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                @click="adjustCreditModalOpen = false"
              >
                {{ $t("admin.cancel") }}
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="adjustCreditSaving"
              >
                {{ adjustCreditSaving ? "..." : $t("admin.save") }}
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
const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");

const activeTab = ref("users");
watch(
  isSuperAdmin,
  (v) => {
    if (v) activeTab.value = "admins";
    else if (activeTab.value === "admins") activeTab.value = "users";
  },
  { immediate: true },
);

const admins = ref([]);
const users = ref([]);
const loadingAdmins = ref(true);
const loadingUsers = ref(true);

const adminSearch = ref("");
const adminRoleFilter = ref("");

const userFilterAdmin = ref("");
const userStatusFilter = ref("");
const userSearch = ref("");
const userPage = ref(1);
const userPagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 });
const userPageSize = ref(10);
const userSortField = ref("created_at");
const userSortDirection = ref("desc");

let userSearchTimer = null;
let autoRefreshTimer = null;

const filteredAdmins = computed(() => {
  const term = adminSearch.value.trim().toLowerCase();
  return admins.value.filter((a) => {
    const matchRole =
      !adminRoleFilter.value || a.role === adminRoleFilter.value;
    const matchSearch =
      !term ||
      a.username.toLowerCase().includes(term) ||
      String(a.ref_code || "")
        .toLowerCase()
        .includes(term);
    return matchRole && matchSearch;
  });
});

async function fetchAdmins() {
  loadingAdmins.value = true;
  try {
    const res = await $fetch("/api/admin/admins");
    if (res?.success && res.data) admins.value = res.data;
  } catch (e) {
    console.error("[admins]", e);
    admins.value = [];
  } finally {
    loadingAdmins.value = false;
  }
}

async function fetchUsers(page = 1, opts = { silent: false }) {
  userPage.value = page;
  if (!opts?.silent) {
    loadingUsers.value = true;
  }
  try {
    const params = new URLSearchParams();
    if (userFilterAdmin.value) params.set("admin_id", userFilterAdmin.value);
    if (userStatusFilter.value) params.set("status", userStatusFilter.value);
    if (userSearch.value.trim()) params.set("search", userSearch.value.trim());
    params.set("page", String(page));
    params.set("limit", String(userPageSize.value));
    params.set("sort_field", userSortField.value);
    params.set("sort_dir", userSortDirection.value);
    const res = await $fetch(`/api/admin/users?${params}`);
    if (res?.success && res.data) users.value = res.data;
    if (res?.pagination) userPagination.value = res.pagination;
  } catch (e) {
    console.error("[users]", e);
    users.value = [];
  } finally {
    if (!opts?.silent) {
      loadingUsers.value = false;
    }
  }
}

watch(
  () => userSearch.value,
  () => {
    if (userSearchTimer) clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
  },
);

watch(
  () => userSortField.value,
  () => {
    fetchUsers(1);
  },
);

function goToUserPage(page) {
  if (page >= 1 && page <= userPagination.value.totalPages) fetchUsers(page);
}

function changeUserPageSize() {
  userPagination.value.page = 1;
  fetchUsers(1);
}

function toggleUserSortDirection() {
  userSortDirection.value = userSortDirection.value === "asc" ? "desc" : "asc";
  fetchUsers(1);
}

function formatDate(val) {
  if (!val) return "-";
  let d;
  if (typeof val === "string" && val.includes(" ")) {
    // Chuẩn hóa dạng "YYYY-MM-DD HH:mm:ss" thành UTC rồi hiển thị theo giờ VN
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

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Admin modal
const adminModalOpen = ref(false);
const editingAdmin = ref(null);
const adminForm = reactive({
  username: "",
  password: "",
  role: "admin_1",
  is_active: true,
});
const adminError = ref("");
const adminSaving = ref(false);

function openAdminModal(admin = null) {
  editingAdmin.value = admin;
  adminForm.username = admin?.username ?? "";
  adminForm.password = "";
  adminForm.role = admin?.role ?? "admin_1";
  adminForm.is_active = admin ? !!admin.is_active : true;
  adminError.value = "";
  adminModalOpen.value = true;
}

function roleBadgeClass(role) {
  if (role === "admin_0") return "badge--primary";
  if (role === "admin_1") return "badge--secondary";
  if (role === "admin_2") return "badge--danger";
  return "badge--secondary";
}

function roleLabel(role) {
  if (role === "admin_0") return t("admin.admin0");
  if (role === "admin_1") return t("admin.admin1");
  if (role === "admin_2") return "admin_2 (community)";
  return role || "-";
}

async function saveAdmin() {
  adminError.value = "";
  adminSaving.value = true;
  try {
    if (editingAdmin.value) {
      await $fetch(`/api/admin/admins/${editingAdmin.value.id}`, {
        method: "PUT",
        body: { role: adminForm.role, is_active: adminForm.is_active },
      });
      adminModalOpen.value = false;
      await fetchAdmins();
      showToast(t("admin.updateSuccess"), "success");
    } else {
      await $fetch("/api/admin/admins", {
        method: "POST",
        body: {
          username: adminForm.username,
          password: adminForm.password,
          role: adminForm.role,
        },
      });
      adminModalOpen.value = false;
      await fetchAdmins();
      showToast(t("admin.createSuccess"), "success");
    }
  } catch (e) {
    adminError.value = e?.data?.statusMessage || e?.message || "Lỗi";
    showToast(adminError.value, "error");
  } finally {
    adminSaving.value = false;
  }
}

async function toggleAdminLock(a) {
  try {
    await $fetch(`/api/admin/admins/${a.id}`, {
      method: "PUT",
      body: { is_active: !a.is_active },
    });
    await fetchAdmins();
    showToast(t("admin.updateSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

async function deleteAdmin(a) {
  const ok = await askConfirm({
    title: t("admin.delete"),
    message: `${t("admin.confirmDelete")}\n${a.username}`,
    confirmText: t("admin.delete"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/admins/${a.id}`, { method: "DELETE" });
    await fetchAdmins();
    showToast(t("admin.deleteSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

// User modal
const userModalOpen = ref(false);
const editingUser = ref(null);
const userForm = reactive({
  username: "",
  email: "",
  password: "",
  admin_id: "",
  status: "active",
});
const userError = ref("");
const userSaving = ref(false);
const adjustCreditModalOpen = ref(false);
const adjustTargetUser = ref(null);
const adjustDelta = ref(0);
const adjustReason = ref("");
const adjustCreditSaving = ref(false);
const adjustCreditError = ref("");

function openUserModal(user = null) {
  editingUser.value = user;
  userForm.username = user?.username ?? "";
  userForm.email = user?.email ?? "";
  userForm.password = "";
  userForm.admin_id = user
    ? String(user.admin_id)
    : admins.value[0]?.id
      ? String(admins.value[0].id)
      : "";
  userForm.status = user?.status ?? "active";
  userError.value = "";
  userModalOpen.value = true;
}

async function saveUser() {
  userError.value = "";
  userSaving.value = true;
  try {
    if (editingUser.value) {
      const body = { status: userForm.status };
      if (isSuperAdmin.value) body.admin_id = parseInt(userForm.admin_id, 10);
      await $fetch(`/api/admin/users/${editingUser.value.id}`, {
        method: "PUT",
        body,
      });
      userModalOpen.value = false;
      await fetchUsers(userPage.value);
      showToast(t("admin.updateSuccess"), "success");
    } else {
      await $fetch("/api/admin/users", {
        method: "POST",
        body: {
          username: userForm.username,
          email: userForm.email,
          password: userForm.password,
          admin_id: isSuperAdmin.value
            ? parseInt(userForm.admin_id, 10)
            : undefined,
        },
      });
      userModalOpen.value = false;
      await fetchUsers(userPage.value);
      showToast(t("admin.createSuccess"), "success");
    }
  } catch (e) {
    userError.value = e?.data?.statusMessage || e?.message || "Lỗi";
    showToast(userError.value, "error");
  } finally {
    userSaving.value = false;
  }
}

async function toggleUserLock(u) {
  try {
    await $fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      body: { status: u.status === "active" ? "blocked" : "active" },
    });
    await fetchUsers(userPage.value);
    showToast(t("admin.updateSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

async function deleteUser(u) {
  const ok = await askConfirm({
    title: t("admin.delete"),
    message: `${t("admin.confirmDelete")}\n${u.username}`,
    confirmText: t("admin.delete"),
    cancelText: t("admin.cancel"),
  });
  if (!ok) return;
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    await fetchUsers(userPage.value);
    showToast(t("admin.deleteSuccess"), "success");
  } catch (e) {
    showToast(e?.data?.statusMessage || "Lỗi", "error");
  }
}

function openAdjustCreditModal(user) {
  adjustTargetUser.value = user;
  adjustDelta.value = 0;
  adjustReason.value = "";
  adjustCreditError.value = "";
  adjustCreditModalOpen.value = true;
}

async function submitAdjustCredit() {
  if (!adjustTargetUser.value) return;
  adjustCreditError.value = "";
  adjustCreditSaving.value = true;
  try {
    await $fetch(
      `/api/admin/users/${adjustTargetUser.value.id}/credit-adjust`,
      {
        method: "POST",
        body: {
          delta: Number(adjustDelta.value),
          reason: adjustReason.value,
        },
      },
    );
    adjustCreditModalOpen.value = false;
    await fetchUsers(userPage.value);
    showToast(t("admin.updateSuccess"), "success");
  } catch (e) {
    adjustCreditError.value =
      e?.data?.statusMessage || "Điều chỉnh tín chỉ thất bại";
    showToast(adjustCreditError.value, "error");
  } finally {
    adjustCreditSaving.value = false;
  }
}

onMounted(() => {
  if (isSuperAdmin.value) {
    fetchAdmins();
  }
  fetchUsers(1);
  autoRefreshTimer = setInterval(() => {
    if (isSuperAdmin.value) {
      fetchAdmins();
    }
    fetchUsers(userPage.value || 1, { silent: true });
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
.users-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: none;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid rgba(1, 123, 251, 0.2);
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-primary);
  background: rgba(1, 123, 251, 0.08);
}

.tab-btn.active {
  color: var(--blue-bright);
  background: rgba(1, 123, 251, 0.12);
  border-bottom: 2px solid var(--blue-bright);
  margin-bottom: -1px;
}

.tab-panel {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.panel-header .users-toolbar {
  flex: 1;
}

.user-stats-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.user-stats-empty {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.user-stats-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-stats-main-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.user-stats-username {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-stats-amount {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--blue-bright);
}

.user-stats-note {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.user-stats-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 140px;
  overflow-y: auto;
}

.user-stats-list-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.user-stats-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.user-stats-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.user-stats-toolbar .btn-add {
  margin-left: auto;
}

.btn-sort-direction {
  padding-inline: 0.7rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
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
  transition: opacity var(--transition-fast);
}

.btn-add:hover {
  opacity: 0.9;
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

.th-actions {
  width: 160px;
  text-align: center;
}

.td-actions {
  display: flex;
  gap: 6px;

  align-items: center;
  flex-wrap: nowrap;
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
  transition: background var(--transition-fast);
}

.btn-icon:hover {
  background: rgba(1, 123, 251, 0.25);
}

.btn-icon--danger:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.4);
}

.data-table td {
  color: var(--text-primary);
}

.data-table tbody tr:hover {
  background: rgba(1, 123, 251, 0.05);
}

.ref-code {
  font-family: monospace;
  font-size: 0.85em;
  background: rgba(1, 123, 251, 0.15);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
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

.badge--secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.badge--success {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.badge--muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.badge--danger {
  background: rgba(248, 113, 113, 0.18);
  color: #f97373;
}

/* Modal */
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

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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
}

.form-row .input:focus {
  outline: none;
  border-color: var(--blue-bright);
}

.form-row select.input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23017BFB' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.form-row select.input option,
.form-row select.input optgroup {
  background: #0d1629;
  color: #e8ecf1;
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

.users-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 0.75rem 1rem;
  background: rgba(5, 15, 35, 0.5);
  border: 1px solid rgba(1, 123, 251, 0.2);
  border-radius: 10px;
}

.users-toolbar .btn-add--right {
  margin-left: auto;
}

.users-toolbar .filter-group,
.users-toolbar .search-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.users-toolbar label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.users-toolbar .input--sm {
  padding: 0.45rem 0.75rem;
  min-width: 140px;
}

.users-toolbar .search-group .input--sm {
  min-width: 180px;
}

.btn-search {
  padding: 0.45rem 0.75rem;
  background: rgba(1, 123, 251, 0.2);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-search:hover {
  background: rgba(1, 123, 251, 0.3);
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
</style>

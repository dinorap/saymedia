<template>
  <div class="subordinate-commission-page">
    <div class="card intro-card">
      <h1 class="card-title">{{ $t("admin.subordinateCommissionTitle") }}</h1>
      <p class="intro-text">
        {{ $t("admin.subordinateCommissionIntro") }}
      </p>
    </div>

    <div class="card filters-card">
      <div class="filters-row">
        <label class="filter-field">
          <span>{{ $t("admin.periodFrom") }}</span>
          <input v-model="fromDate" type="date" class="input-date" />
        </label>
        <label class="filter-field">
          <span>{{ $t("admin.periodTo") }}</span>
          <input v-model="toDate" type="date" class="input-date" />
        </label>
        <label v-if="isSuperAdmin" class="filter-field filter-field--grow">
          <span>{{ $t("admin.filterByShopAdmin") }}</span>
          <select v-model="shopAdminId" class="input-select">
            <option value="">{{ $t("admin.allShops") }}</option>
            <option
              v-for="s in shopOptions"
              :key="s.id"
              :value="String(s.id)"
            >
              {{ s.username }} (ID {{ s.id }})
            </option>
          </select>
        </label>
        <button type="button" class="btn-primary" @click="load">
          {{ $t("admin.search") }}
        </button>
      </div>
    </div>

    <div v-if="isSuperAdmin && shopTotals.length" class="card">
      <h2 class="card-title">{{ $t("admin.subordinateCommissionShopTotals") }}</h2>
      <p class="hint">{{ $t("admin.subordinateCommissionShopTotalsHint") }}</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ $t("admin.shopLabel") }}</th>
            <th>ID</th>
            <th>{{ $t("admin.subordinateCommissionRollupCredit") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in shopTotals" :key="t.shop_admin_id">
            <td>{{ t.shop_username }}</td>
            <td>{{ t.shop_admin_id }}</td>
            <td>{{ formatNum(t.rollup_credit) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2 class="card-title">{{ $t("admin.subordinateCommissionDetail") }}</h2>
      <div v-if="loading" class="table-loading">{{ $t("admin.loading") }}</div>
      <div v-else-if="!rows.length" class="table-empty">
        {{ $t("admin.noData") }}
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ $t("admin.shopLabel") }}</th>
            <th>{{ $t("admin.subordinateLabel") }}</th>
            <th>{{ $t("admin.refCode") }}</th>
            <th>{{ $t("admin.subordinateCommissionCredit") }}</th>
            <th>{{ $t("admin.subordinateCommissionRollupCredit") }}</th>
            <th>{{ $t("admin.totalOrders") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="`${r.shop_admin_id}-${r.subordinate_admin_id}`">
            <td>
              <strong>{{ r.shop_username }}</strong>
              <span class="muted">#{{ r.shop_admin_id }}</span>
            </td>
            <td>
              {{ r.subordinate_username }}
              <span class="muted">#{{ r.subordinate_admin_id }}</span>
            </td>
            <td>{{ r.subordinate_ref_code || "—" }}</td>
            <td>{{ formatNum(r.commission_credit) }}</td>
            <td>{{ formatNum(r.rollup_credit) }}</td>
            <td>{{ r.order_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "admin",
  layout: "admin",
});

const { t } = useI18n();
useHead({
  title: () => t("admin.subordinateCommissionTitle"),
});

const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");

const fromDate = ref("");
const toDate = ref("");
const shopAdminId = ref("");

const loading = ref(false);
const rows = ref<
  {
    shop_admin_id: number;
    shop_username: string;
    subordinate_admin_id: number;
    subordinate_username: string;
    subordinate_ref_code: string;
    commission_credit: number;
    rollup_credit: number;
    order_count: number;
  }[]
>([]);
const shopTotals = ref<
  { shop_admin_id: number; shop_username: string; rollup_credit: number }[]
>([]);

const shopOptions = ref<{ id: number; username: string }[]>([]);

function formatNum(n: number) {
  return Number(n || 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

async function loadShops() {
  if (!isSuperAdmin.value) return;
  try {
    const res: any = await $fetch("/api/admin/admins");
    const list = (res?.data || []) as {
      id: number;
      username: string;
      role: string;
    }[];
    shopOptions.value = list
      .filter((a) => a.role === "admin_1")
      .map((a) => ({ id: a.id, username: a.username }));
  } catch {
    shopOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const q = new URLSearchParams();
    if (fromDate.value) q.set("from", fromDate.value);
    if (toDate.value) q.set("to", toDate.value);
    if (isSuperAdmin.value && shopAdminId.value) {
      q.set("shop_admin_id", shopAdminId.value);
    }
    const res: any = await $fetch(
      `/api/admin/subordinate-commission?${q.toString()}`,
    );
    rows.value = res?.data || [];
    shopTotals.value = res?.shop_totals || [];
  } catch {
    rows.value = [];
    shopTotals.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadShops();
  await load();
});
</script>

<style scoped>
.subordinate-commission-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.25rem 2rem;
}
.intro-card .intro-text {
  margin: 0;
  color: var(--text-muted, #64748b);
  font-size: 0.95rem;
  line-height: 1.5;
}
.filters-card {
  margin-bottom: 1rem;
}
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
}
.filter-field--grow {
  flex: 1;
  min-width: 200px;
}
.input-date,
.input-select {
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--bg, #fff);
  color: inherit;
  min-width: 140px;
}
.hint {
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  margin: 0 0 0.75rem;
}
.muted {
  display: block;
  font-size: 0.8rem;
  font-weight: normal;
  color: var(--text-muted, #94a3b8);
}
</style>

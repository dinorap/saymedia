<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal card">
        <div class="head">
          <h3>{{ $t("admin.creditLedger") || "Sổ sao kê tín chỉ" }}</h3>
          <button class="close-btn" @click="close">×</button>
        </div>
        <div class="body">
          <div v-if="loading" class="state">{{ $t("admin.loading") }}</div>
          <div v-else-if="!items.length" class="state">{{ $t("admin.noData") }}</div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ $t("admin.transactionType") || "Loại" }}</th>
                <th>{{ $t("admin.deltaCredit") || "Biến động" }}</th>
                <th>{{ $t("admin.beforeAfter") || "Trước/Sau" }}</th>
                <th>{{ $t("admin.createdAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td>#{{ row.id }}</td>
                <td>{{ row.transaction_type }}</td>
                <td :class="Number(row.delta) >= 0 ? 'up' : 'down'">
                  {{ Number(row.delta) >= 0 ? "+" : "" }}{{ formatVnd(row.delta) }}
                </td>
                <td>{{ formatVnd(row.balance_before) }} → {{ formatVnd(row.balance_after) }}</td>
                <td>{{ formatDate(row.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const items = ref([]);
const loading = ref(false);

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return;
    loading.value = true;
    try {
      const res = await $fetch("/api/credit-ledger/my?limit=100");
      items.value = Array.isArray(res?.data) ? res.data : [];
    } catch {
      items.value = [];
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

function close() {
  emit("update:modelValue", false);
}

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(val) {
  if (!val) return "-";
  const d = typeof val === "string" && val.includes(" ")
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
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 1000; display: flex; justify-content: center; align-items: center; padding: 1rem; }
.modal { width: min(960px, 95vw); max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; }
.head { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(1,123,251,.2); }
.head h3 { margin: 0; }
.close-btn { background: transparent; border: 0; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer; }
.body { padding: 1rem; overflow: auto; }
.state { text-align: center; padding: 2rem; color: var(--text-muted); }
.data-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.data-table th,.data-table td { padding: .65rem .75rem; border-bottom: 1px solid rgba(1,123,251,.15); text-align: left; }
.data-table th { color: var(--text-secondary); text-transform: uppercase; font-size: .78rem; }
.up { color: #27ae60; } .down { color: #ff6b6b; }
</style>

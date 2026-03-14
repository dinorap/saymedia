<template>
  <Teleport to="body">
    <div
      v-if="modelValue && product"
      class="cpm-overlay"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="cpm-modal">
        <h3 class="cpm-title">{{ $t("product.confirmTitle") }}</h3>
        <p class="cpm-text">
          {{ $t("product.confirmText") }}
          <strong class="cpm-name">{{ product.name }}</strong>
          {{ $t("product.confirmWithPrice") }}
          <strong class="cpm-price">{{ formatVnd(product.price) }} {{ $t("product.points") }}</strong>?
        </p>
        <p v-if="balance != null" class="cpm-balance">
          {{ $t("product.balance") }}: {{ formatVnd(balance) }} {{ $t("product.points") }}
        </p>
        <div class="cpm-duration">
          <label class="cpm-duration-label">Thời lượng sử dụng</label>
          <select v-model="selectedDuration" class="cpm-duration-select">
            <option v-for="opt in durationOptions" :key="opt" :value="opt">
              {{ opt === "lifetime" ? "Lifetime" : opt }}
            </option>
          </select>
        </div>
        <footer class="cpm-footer">
          <button type="button" class="cpm-btn-cancel" @click="$emit('update:modelValue', false)">
            {{ $t("admin.cancel") }}
          </button>
          <button type="button" class="cpm-btn-confirm" @click="confirm">
            {{ $t("product.confirm") }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product: { type: Object, default: null },
  balance: { type: Number, default: null },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

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

const selectedDuration = ref("30d");

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      selectedDuration.value = "30d";
    }
  },
);

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function confirm() {
  if (!props.product) return;
  emit("update:modelValue", false);
  emit("confirm", {
    product: props.product,
    duration: selectedDuration.value,
  });
}
</script>

<style scoped>
.cpm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 1rem;
}

.cpm-modal {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 14px;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
  padding: 1.5rem;
}

.cpm-title {
  margin: 0 0 1rem;
  font-size: 1.15rem;
  font-weight: 600;
}

.cpm-text {
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.cpm-name,
.cpm-price {
  color: var(--blue-electric);
}

.cpm-balance {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.cpm-duration {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.cpm-duration-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
.cpm-duration-select {
  flex: 1;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.9);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.cpm-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.cpm-btn-cancel {
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.5);
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
}

.cpm-btn-confirm {
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  border: none;
  background: var(--blue-bright);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.cpm-btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

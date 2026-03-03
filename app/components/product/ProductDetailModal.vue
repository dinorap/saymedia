<template>
  <Teleport to="body">
    <div
      v-if="modelValue && product"
      class="pdm-overlay"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="pdm-modal">
        <header class="pdm-header">
          <h2 class="pdm-title">{{ product.name }}</h2>
          <button type="button" class="pdm-close" @click="$emit('update:modelValue', false)">
            ×
          </button>
        </header>
        <div class="pdm-body">
          <p class="pdm-type">{{ $t("admin.productType") }}: {{ product.type || "other" }}</p>
          <p class="pdm-desc">{{ product.description || $t("product.noDescription") }}</p>
          <p class="pdm-price">
            {{ formatVnd(product.price) }}
            <span class="pdm-unit">{{ $t("product.points") }}</span>
          </p>
        </div>
        <footer class="pdm-footer">
          <button type="button" class="pdm-btn-secondary" @click="$emit('update:modelValue', false)">
            {{ $t("admin.cancel") }}
          </button>
          <button type="button" class="pdm-btn-primary" @click="onBuy">
            {{ $t("product.buyNow") }}
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
});

const emit = defineEmits(["update:modelValue", "buy"]);

function formatVnd(v) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function onBuy() {
  emit("buy", props.product);
}
</script>

<style scoped>
.pdm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.pdm-modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.4);
  border-radius: 14px;
  box-shadow: 0 0 40px rgba(1, 123, 251, 0.2);
  overflow: hidden;
}

.pdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pdm-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.pdm-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.pdm-body {
  padding: 1.25rem;
}

.pdm-type {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pdm-desc {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-line;
}

.pdm-price {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--blue-electric);
}

.pdm-unit {
  margin-left: 4px;
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 500;
}

.pdm-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pdm-btn-secondary {
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.5);
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
}

.pdm-btn-primary {
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  border: none;
  background: var(--blue-bright);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(1, 123, 251, 0.4);
}

.pdm-btn-primary:hover {
  filter: brightness(1.1);
}
</style>

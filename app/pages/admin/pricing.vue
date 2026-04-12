<template>
  <div class="pricing-admin-page">
    <div class="pricing-admin-toolbar">
      <div class="pricing-subtabs" role="tablist" aria-label="Pricing tabs">
        <button
          v-for="t in tabTypes"
          :key="t"
          type="button"
          class="pricing-subtab"
          :class="{ 'pricing-subtab--active': activeType === t }"
          @click="activeType = t"
        >
          {{ tabLabel(t) }}
        </button>
      </div>

      <div class="pricing-actions">
        <button
          type="button"
          class="admin-btn-secondary"
          :disabled="saving || loading"
          @click="addPackage"
        >
          + {{ $t("admin.add") || "Add" }} gói
        </button>
        <button
          type="button"
          class="admin-btn-primary"
          :disabled="saving || loading"
          @click="saveActive"
        >
          {{ $t("admin.save") }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="pricing-loading">
      {{ $t("admin.loading") }}
    </div>

    <div v-else class="pricing-admin-body">
      <div class="admin-form-row pricing-title-row">
        <label>Display name (tab label)</label>
        <input v-model="editing.displayName" type="text" class="admin-input" />
      </div>

      <div
        v-if="activeType === 'youtube_long_video'"
        class="admin-form-row pricing-linked-product-row"
      >
        <label>Sản phẩm (combo — phát key)</label>
        <select
          class="admin-input"
          :value="editing.linkedProductId ?? ''"
          @change="onLinkedProductChange"
        >
          <option value="">— Chưa chọn —</option>
          <option
            v-for="p in productOptions"
            :key="p.id"
            :value="String(p.id)"
          >
            {{ p.name }} (#{{ p.id }})
          </option>
        </select>
        <p class="pricing-admin-hint">
          Chọn sản phẩm trước; mỗi gói nhỏ chọn «Loại key» đúng với key đang có trong kho
          (10d, 30d, lifetime…). Trừ điểm = VNĐ (ô Giá) ÷ tỷ lệ nạp; số key = «Thiết bị».
        </p>
      </div>

      <div class="pricing-edit-grid">
        <section
          v-for="(pkg, idx) in editing.packages"
          :key="idx"
          class="pricing-edit-card"
        >
          <div class="pricing-edit-card-head">
            <div class="pricing-edit-card-title">
              <span class="pricing-edit-card-badge">{{ idx + 1 }}</span>
              <span class="pricing-edit-card-name">
                {{ pkg.planName || `Gói ${idx + 1}` }}
              </span>
            </div>

            <div class="pricing-edit-card-actions">
              <button
                v-if="editing.packages.length > 1"
                type="button"
                class="admin-btn-secondary pricing-delete-btn"
                @click="deletePackage(idx)"
              >
                {{ $t("admin.delete") || "Delete" }}
              </button>
            </div>
          </div>

          <div class="pricing-fields">
            <div class="pricing-field">
              <label>Gói</label>
              <input v-model="pkg.planName" class="admin-input" type="text" />
            </div>

            <!-- Flat editor (Affiliate) -->
            <template v-if="activeType !== 'youtube_long_video'">
              <div class="pricing-field">
                <label>Thiết bị</label>
                <input
                  v-model.number="pkg.device"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </div>
              <div class="pricing-field">
                <label>Số ngày sử dụng</label>
                <input
                  v-model.number="pkg.days"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </div>
              <div class="pricing-field">
                <label>Giá</label>
                <input v-model="pkg.price" class="admin-input" type="text" />
              </div>
              <div class="pricing-field">
                <label>Video</label>
                <input v-model="pkg.video" class="admin-input" type="text" />
              </div>
              <div class="pricing-field">
                <label>Giá thiết bị/ tháng</label>
                <input
                  v-model="pkg.devicePricePerMonth"
                  class="admin-input"
                  type="text"
                />
              </div>
            </template>
          </div>

          <!-- YouTube grouped editor -->
          <div
            v-if="activeType === 'youtube_long_video'"
            class="youtube-options-block"
          >
            <div class="youtube-options-toolbar">
              <span class="youtube-options-label">Gói nhỏ</span>
              <button
                type="button"
                class="admin-btn-secondary"
                :disabled="pkg.subPackages.length >= 10"
                @click="addOption(idx)"
              >
                + {{ $t("admin.add") || "Add" }} option
              </button>
            </div>

            <div
              v-for="(op, oi) in pkg.subPackages"
              :key="oi"
              class="youtube-option"
            >
              <div class="youtube-option-grid">
                <div class="pricing-field">
                  <label>Tên option</label>
                  <input v-model="op.planName" class="admin-input" type="text" />
                </div>
                <div class="pricing-field">
                  <label>Thiết bị</label>
                  <input
                    v-model.number="op.device"
                    class="admin-input"
                    type="number"
                    min="0"
                  />
                </div>
                <div class="pricing-field">
                  <label>Loại key (theo kho sản phẩm)</label>
                  <select
                    class="admin-input"
                    :disabled="!editing.linkedProductId"
                    :value="optionDurationSelectValue(op)"
                    @change="onYoutubeOptionKeyDuration(idx, oi, $event)"
                  >
                    <option value="">
                      {{
                        editing.linkedProductId
                          ? linkedKeyDurations.length
                            ? "— Chọn —"
                            : "Chưa có key trong kho"
                          : "Chọn sản phẩm combo trước"
                      }}
                    </option>
                    <option
                      v-for="dur in linkedKeyDurations"
                      :key="dur"
                      :value="dur"
                    >
                      {{ formatKeyDurationLabel(dur) }}
                    </option>
                  </select>
                </div>
                <div class="pricing-field">
                  <label>Giá</label>
                  <input v-model="op.price" class="admin-input" type="text" />
                </div>
                <div class="pricing-field">
                  <label>Video</label>
                  <input v-model="op.video" class="admin-input" type="text" />
                </div>
                <div class="pricing-field">
                  <label>Giá thiết bị/ tháng</label>
                  <input
                    v-model="op.devicePricePerMonth"
                    class="admin-input"
                    type="text"
                  />
                </div>
              </div>

              <div class="youtube-option-actions">
                <button
                  v-if="pkg.subPackages.length > 1"
                  type="button"
                  class="admin-btn-secondary pricing-delete-btn"
                  @click="deleteOption(idx, oi)"
                >
                  {{ $t("admin.delete") || "Delete" }}
                </button>
              </div>
            </div>
          </div>

          <div class="pricing-field">
            <label>Quyền lợi (mỗi dòng 1 bullet)</label>
            <textarea
              v-model="pkg.benefitsText"
              class="admin-input pricing-textarea"
              rows="7"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

type PricingSetType = "tool_affiliate" | "youtube_long_video";

type OptionUI = {
  planName: string;
  device: number;
  days: number;
  price: string;
  video: string;
  devicePricePerMonth: string;
  linkedProductId?: number | null;
  /** product_keys.valid_duration — ưu tiên khi mua combo */
  keyDuration?: string | null;
};

type PackageUI = {
  planName: string;
  device: number;
  days: number;
  price: string;
  video: string;
  devicePricePerMonth: string;
  benefitsText: string;
  subPackages: OptionUI[];
};

type EditingState = {
  displayName: string;
  linkedProductId: number | null;
  packages: PackageUI[];
};

const tabTypes: PricingSetType[] = ["tool_affiliate", "youtube_long_video"];

const { show: showToast } = useToast();

const loading = ref(true);
const saving = ref(false);

const tabMeta = ref<Array<{ type: PricingSetType; displayName?: string }>>(
  [],
);
const byType = ref<Record<PricingSetType, any>>({
  tool_affiliate: null,
  youtube_long_video: null,
} as any);

const activeType = ref<PricingSetType>("tool_affiliate");

const editing = ref<EditingState>({
  displayName: "",
  linkedProductId: null,
  packages: [],
});

const productOptions = ref<Array<{ id: number; name: string }>>([]);
const linkedKeyDurations = ref<string[]>([]);

async function refreshLinkedKeyDurations() {
  linkedKeyDurations.value = [];
  if (activeType.value !== "youtube_long_video") return;
  const pid = editing.value.linkedProductId;
  if (!pid) return;
  try {
    const res = await $fetch(`/api/admin/products/${pid}/key-durations`);
    const list = (res as { data?: { durations?: string[] } })?.data?.durations;
    linkedKeyDurations.value = Array.isArray(list) ? list : [];
  } catch {
    linkedKeyDurations.value = [];
  }
}

function formatKeyDurationLabel(d: string): string {
  const m = /^(\d+)d$/i.exec(d);
  if (m) return `${d} (${m[1]} ngày)`;
  return d;
}

function optionDurationSelectValue(op: OptionUI): string {
  const kd = String(op.keyDuration || "").trim();
  if (kd && linkedKeyDurations.value.includes(kd)) return kd;
  const days = Math.trunc(Number(op.days ?? 0));
  if (days > 0) {
    const xd = `${days}d`;
    if (linkedKeyDurations.value.includes(xd)) return xd;
  }
  return "";
}

function onYoutubeOptionKeyDuration(pkgIdx: number, optIdx: number, ev: Event) {
  const t = (ev.target as HTMLSelectElement).value;
  const op = editing.value.packages[pkgIdx]?.subPackages?.[optIdx];
  if (!op) return;
  if (!t) {
    op.keyDuration = null;
    op.days = 0;
    return;
  }
  op.keyDuration = t;
  const m = /^(\d+)d$/i.exec(t);
  op.days = m ? parseInt(m[1], 10) : 0;
}

async function loadProductOptions() {
  try {
    const res = await $fetch("/api/admin/products?page=1&limit=100");
    const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
    productOptions.value = rows.map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || `#${r.id}`),
    }));
  } catch {
    productOptions.value = [];
  }
}

function onLinkedProductChange(ev: Event) {
  const t = ev.target as HTMLSelectElement;
  editing.value.linkedProductId = t.value ? Number(t.value) : null;
  void refreshLinkedKeyDurations();
}

function createBlankOption(): OptionUI {
  return {
    planName: "",
    device: 0,
    days: 0,
    price: "",
    video: "",
    devicePricePerMonth: "",
    linkedProductId: null,
    keyDuration: null,
  };
}

function createBlankPackage(grouped: boolean): PackageUI {
  return {
    planName: "",
    device: 0,
    days: 0,
    price: "",
    video: "",
    devicePricePerMonth: "",
    benefitsText: "",
    subPackages: grouped ? [createBlankOption()] : [],
  };
}

function tabLabel(t: PricingSetType) {
  return (
    tabMeta.value.find((x) => x.type === t)?.displayName ||
    (t === "tool_affiliate" ? "Tool (Affiliate)" : "Tool (YouTube)")
  );
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function normalizeForUI(setData: any, type: PricingSetType): EditingState {
  const displayName = String(setData?.displayName || "");
  const linkedRaw = setData?.linkedProductId;
  const linkedProductId =
    type === "youtube_long_video" &&
    linkedRaw != null &&
    Number(linkedRaw) > 0
      ? Math.trunc(Number(linkedRaw))
      : null;
  const packagesRaw = Array.isArray(setData?.packages) ? setData.packages : [];
  const packages: PackageUI[] = packagesRaw.map((p: any) => {
    const benefitsText = Array.isArray(p?.benefits)
      ? p.benefits.map((b: any) => String(b)).join("\n")
      : "";

    const base: PackageUI = {
      planName: String(p?.planName || ""),
      device: Number(p?.device ?? 0) || 0,
      days: Number(p?.days ?? 0) || 0,
      price: String(p?.price ?? ""),
      video: String(p?.video ?? ""),
      devicePricePerMonth: String(p?.devicePricePerMonth ?? ""),
      benefitsText,
      subPackages: [],
    };

    if (type === "youtube_long_video") {
      const rawOptions = Array.isArray(p?.subPackages) ? p.subPackages : [];
      let subPackages: OptionUI[] = rawOptions.map((op: any) => ({
        planName: String(op?.planName || ""),
        device: Number(op?.device ?? 0) || 0,
        days: Number(op?.days ?? 0) || 0,
        price: String(op?.price ?? ""),
        video: String(op?.video ?? ""),
        devicePricePerMonth: String(op?.devicePricePerMonth ?? ""),
        linkedProductId:
          op?.linkedProductId != null && Number(op.linkedProductId) > 0
            ? Math.trunc(Number(op.linkedProductId))
            : null,
        keyDuration: op?.keyDuration != null ? String(op.keyDuration).trim() || null : null,
      }));

      // Nếu data cũ không có subPackages, fallback tạo 1 option từ fields hiện có.
      if (!subPackages.length) {
        subPackages = [
          {
            planName: "",
            device: Number(p?.device ?? 0) || 0,
            days: Number(p?.days ?? 0) || 0,
            price: String(p?.price ?? ""),
            video: String(p?.video ?? ""),
            devicePricePerMonth: String(p?.devicePricePerMonth ?? ""),
            linkedProductId: null,
            keyDuration: null,
          },
        ];
      }

      base.subPackages = subPackages;
    }

    return base;
  });

  // Luôn đảm bảo có ít nhất 1 gói để người dùng thao tác
  if (!packages.length) {
    packages.push(createBlankPackage(type === "youtube_long_video"));
  }
  if (packages.length > 10) packages.splice(10);

  return { displayName, linkedProductId, packages };
}

function textToBenefits(text: string): string[] {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .map((l) => l.replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

async function fetchPricing() {
  try {
    // refresh=1 để tránh cache cũ
    const res = (await $fetch("/api/admin/pricing?refresh=1")) as {
      success?: boolean;
      data?: { sets?: typeof tabMeta.value; byType?: Record<string, any> };
    };
    if (res?.success && res.data) {
      tabMeta.value = res.data.sets || [];
      byType.value = res.data.byType || byType.value;
      const first = tabMeta.value?.[0]?.type;
      if (first && tabTypes.includes(first)) activeType.value = first;
      editing.value = normalizeForUI(
        byType.value[activeType.value],
        activeType.value,
      );
      await refreshLinkedKeyDurations();
    }
  } catch (e: any) {
    console.error("[admin pricing]", e);
    showToast(e?.data?.statusMessage || "Failed to load pricing", "error");
  } finally {
    loading.value = false;
  }
}

async function resetEditingForActive() {
  const setData = byType.value[activeType.value];
  editing.value = normalizeForUI(setData, activeType.value);
  await refreshLinkedKeyDurations();
}

function addPackage() {
  if (editing.value.packages.length >= 10) return;
  editing.value.packages.push(
    createBlankPackage(activeType.value === "youtube_long_video"),
  );
}

function deletePackage(idx: number) {
  if (editing.value.packages.length <= 1) return;
  const ok = window.confirm("Xóa gói này?");
  if (!ok) return;
  editing.value.packages.splice(idx, 1);
}

function addOption(pkgIdx: number) {
  if (activeType.value !== "youtube_long_video") return;
  const pkg = editing.value.packages[pkgIdx];
  if (!pkg) return;
  if (pkg.subPackages.length >= 10) return;
  pkg.subPackages.push(createBlankOption());
}

function deleteOption(pkgIdx: number, optIdx: number) {
  if (activeType.value !== "youtube_long_video") return;
  const pkg = editing.value.packages[pkgIdx];
  if (!pkg) return;
  if (pkg.subPackages.length <= 1) return;
  const ok = window.confirm("Xóa option này?");
  if (!ok) return;
  pkg.subPackages.splice(optIdx, 1);
}

watch(activeType, () => {
  if (!loading.value) void resetEditingForActive();
});

watch(
  () => [activeType.value, editing.value.linkedProductId] as const,
  () => {
    void refreshLinkedKeyDurations();
  },
);

async function saveActive() {
  if (saving.value) return;
  saving.value = true;
  try {
    const data: Record<string, unknown> = {
      displayName: editing.value.displayName || "",
      packages: editing.value.packages.map((p) => ({
        planName: p.planName || "",
        device:
          activeType.value === "youtube_long_video"
            ? Number(p.subPackages?.[0]?.device ?? 0) || 0
            : Number(p.device) || 0,
        days:
          activeType.value === "youtube_long_video"
            ? Number(p.subPackages?.[0]?.days ?? 0) || 0
            : Number(p.days) || 0,
        price:
          activeType.value === "youtube_long_video"
            ? p.subPackages?.[0]?.price || ""
            : p.price || "",
        video:
          activeType.value === "youtube_long_video"
            ? p.subPackages?.[0]?.video || ""
            : p.video || "",
        devicePricePerMonth:
          activeType.value === "youtube_long_video"
            ? p.subPackages?.[0]?.devicePricePerMonth || ""
            : p.devicePricePerMonth || "",
        benefits: textToBenefits(p.benefitsText),
        ...(activeType.value === "youtube_long_video"
          ? {
              subPackages: (p.subPackages || []).map((op) => ({
                planName: op.planName || "",
                device: Number(op.device) || 0,
                days: Number(op.days) || 0,
                price: op.price || "",
                video: op.video || "",
                devicePricePerMonth: op.devicePricePerMonth || "",
                benefits: [],
                linkedProductId:
                  op.linkedProductId != null && Number(op.linkedProductId) > 0
                    ? Math.trunc(Number(op.linkedProductId))
                    : null,
                keyDuration:
                  op.keyDuration != null && String(op.keyDuration).trim()
                    ? String(op.keyDuration).trim()
                    : null,
              })),
            }
          : {}),
      })),
    };
    if (activeType.value === "youtube_long_video") {
      data.linkedProductId =
        editing.value.linkedProductId != null &&
        Number(editing.value.linkedProductId) > 0
          ? Math.trunc(Number(editing.value.linkedProductId))
          : null;
    }

    await $fetch("/api/admin/pricing", {
      method: "POST",
      body: { type: activeType.value, data },
    });

    // Update local cache
    byType.value[activeType.value] = deepClone(data);
    showToast(
      activeType.value === "tool_affiliate"
        ? "Đã lưu bảng giá (Tool Affiliate)."
        : "Đã lưu bảng giá (Tool YouTube).",
      "success",
    );
  } catch (e: any) {
    console.error("[admin pricing save]", e);
    showToast(e?.data?.statusMessage || "Không thể lưu bảng giá", "error");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetchPricing();
  await loadProductOptions();
});
</script>

<style scoped>
.pricing-admin-page {
  padding: 1.25rem 0;
}

.pricing-admin-toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.pricing-subtabs {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.pricing-subtab {
  padding: 0.55rem 0.9rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.pricing-subtab--active {
  color: #fff;
  background: rgb(var(--accent-rgb) / 0.18);
  border-color: var(--blue-bright);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
}

.pricing-loading {
  padding: 1rem;
  color: var(--text-muted);
}

.pricing-admin-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.pricing-title-row label {
  margin-bottom: 0.35rem;
}

.pricing-linked-product-row label {
  margin-bottom: 0.35rem;
}

.pricing-admin-hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: var(--text-muted, #94a3b8);
  line-height: 1.45;
  max-width: 52rem;
}

.pricing-edit-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 1024px) {
  .pricing-edit-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.pricing-edit-card {
  background: rgba(5, 15, 35, 0.55);
  border: 1px solid rgb(var(--accent-rgb) / 0.22);
  border-radius: 14px;
  padding: 1rem;
}

.pricing-edit-card-head {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.pricing-edit-card-actions {
  margin-top: 0;
  display: flex;
  justify-content: flex-end;
}

.pricing-edit-card-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
}

.pricing-edit-card-badge {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--accent-rgb) / 0.16);
  border: 1px solid rgb(var(--accent-rgb) / 0.25);
  color: var(--text-primary);
}

.pricing-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

@media (min-width: 1024px) {
  .pricing-fields {
    grid-template-columns: 1fr;
  }
}

.pricing-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pricing-field label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
}

.pricing-textarea {
  resize: vertical;
}

.pricing-delete-btn {
  padding: 0.35rem 0.8rem;
  font-size: 0.9rem;
}

.youtube-options-block {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.youtube-options-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.youtube-options-label {
  color: var(--text-secondary);
  font-weight: 650;
}

.youtube-option {
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(5, 15, 35, 0.35);
  margin-bottom: 0.65rem;
}

.youtube-option-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.65rem;
}

@media (min-width: 1024px) {
  .youtube-option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.youtube-option-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.65rem;
}
</style>


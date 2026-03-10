<template>
  <div class="promo-page">
    <h2 class="promo-title">Mã khuyến mại nạp tiền</h2>

    <div class="promo-layout">
      <!-- Form cấu hình mã -->
      <form class="promo-form card" @submit.prevent="handleSubmit">
        <h3 class="promo-form-title">Tạo / cập nhật mã</h3>

        <div class="promo-form-grid">
          <div class="field">
            <label>Mã khuyến mại</label>
            <input
              v-model="form.code"
              type="text"
              class="input"
              autocomplete="off"
              placeholder="VD: TET50"
              required
            />
          </div>

          <div class="field">
            <label>Bonus % (trên tín chỉ)</label>
            <input
              v-model.number="form.bonus_percent"
              type="number"
              min="0"
              class="input"
              placeholder="VD: 50"
            />
          </div>

          <div class="field">
            <label>Bonus tín chỉ cố định</label>
            <input
              v-model.number="form.bonus_credit"
              type="number"
              min="0"
              class="input"
              placeholder="VD: 100"
            />
          </div>

          <div class="field">
            <label>Số lượt tối đa (toàn hệ thống)</label>
            <input
              v-model.number="form.max_total_uses"
              type="number"
              min="0"
              class="input"
              placeholder="Không giới hạn nếu để trống"
            />
          </div>

          <div class="field">
            <label>Số lượt / mỗi user</label>
            <input
              v-model.number="form.max_uses_per_user"
              type="number"
              min="0"
              class="input"
              placeholder="Không giới hạn nếu để trống"
            />
          </div>

          <div class="field">
            <label>Số tiền tối thiểu (VND)</label>
            <input
              v-model.number="form.min_amount"
              type="number"
              min="0"
              class="input"
              placeholder="VD: 100000"
            />
          </div>

          <div class="field">
            <label>Bắt đầu từ</label>
            <input
              v-model="form.starts_at"
              type="datetime-local"
              class="input"
            />
          </div>

          <div class="field">
            <label>Kết thúc lúc</label>
            <input
              v-model="form.ends_at"
              type="datetime-local"
              class="input"
            />
          </div>

          <div class="field">
            <label>Giờ bắt đầu mỗi ngày</label>
            <input
              v-model="form.daily_start_time"
              type="time"
              class="input"
            />
          </div>

          <div class="field">
            <label>Giờ kết thúc mỗi ngày</label>
            <input
              v-model="form.daily_end_time"
              type="time"
              class="input"
            />
          </div>
        </div>

        <p v-if="error" class="promo-error">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? "Đang lưu..." : "Lưu mã khuyến mại" }}
        </button>
      </form>

      <!-- Danh sách mã -->
      <div class="promo-list card">
        <h3 class="promo-form-title">Danh sách mã hiện có</h3>
        <table v-if="items.length" class="data-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Bonus</th>
              <th>Giới hạn</th>
              <th>Tối thiểu</th>
              <th>Thời gian áp dụng</th>
              <th>Khung giờ mỗi ngày</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in items" :key="p.id">
              <td><strong>{{ p.code }}</strong></td>
              <td>
                <div>
                  <span v-if="p.bonus_percent">
                    +{{ p.bonus_percent }}% tín chỉ
                  </span>
                  <span v-if="p.bonus_credit">
                    <br />
                    +{{ p.bonus_credit }} tín chỉ
                  </span>
                  <span v-if="!p.bonus_percent && !p.bonus_credit">-</span>
                </div>
              </td>
              <td>
                <div>
                  <span>
                    Tổng:
                    {{ p.max_total_uses || "∞" }}
                  </span>
                  <br />
                  <span>
                    /user:
                    {{ p.max_uses_per_user || "∞" }}
                  </span>
                </div>
              </td>
              <td>
                <span v-if="p.min_amount">
                  {{ formatVnd(p.min_amount) }}đ
                </span>
                <span v-else>-</span>
              </td>
              <td>
                <div class="promo-time">
                  <span v-if="p.starts_at">Từ: {{ formatDate(p.starts_at) }}</span>
                  <span v-else>Từ: -</span>
                  <br />
                  <span v-if="p.ends_at">Đến: {{ formatDate(p.ends_at) }}</span>
                  <span v-else>Đến: -</span>
                </div>
              </td>
              <td>
                <span v-if="p.daily_start_time || p.daily_end_time">
                  {{ p.daily_start_time || "--:--" }} - {{ p.daily_end_time || "--:--" }}
                </span>
                <span v-else>-</span>
              </td>
              <td>{{ formatDate(p.created_at) }}</td>
              <td>
                <div class="promo-actions">
                  <button type="button" class="btn-link" @click="fillForm(p)">
                    Sửa
                  </button>
                  <button
                    type="button"
                    class="btn-link btn-link--danger"
                    @click="deletePromo(p)"
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="promo-empty">Chưa có mã nào.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const items = ref([]);
const saving = ref(false);
const error = ref("");

const form = reactive({
  code: "",
  bonus_percent: null,
  bonus_credit: null,
  max_total_uses: null,
  max_uses_per_user: null,
  min_amount: null,
  starts_at: "",
  ends_at: "",
  daily_start_time: "",
  daily_end_time: "",
});

function formatVnd(v) {
  const n = Number(v) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return dt.toLocaleString("vi-VN");
  } catch {
    return String(d);
  }
}

async function fetchPromos() {
  try {
    const res = await $fetch("/api/admin/deposit-promotions");
    items.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error.value =
      e?.data?.statusMessage || "Không tải được danh sách mã khuyến mại.";
  }
}

async function deletePromo(p) {
  if (!p?.code) return;
  const ok = window.confirm(
    `Xóa mã khuyến mại "${p.code}"? Mọi cấu hình tier liên quan cũng sẽ bị xóa.`,
  );
  if (!ok) return;
  try {
    await $fetch(`/api/admin/deposit-promotions/${encodeURIComponent(p.code)}`, {
      method: "DELETE",
    });
    if (form.code === p.code) {
      form.code = "";
      form.bonus_percent = null;
      form.bonus_credit = null;
      form.max_total_uses = null;
      form.max_uses_per_user = null;
      form.min_amount = null;
      form.starts_at = "";
      form.ends_at = "";
      form.daily_start_time = "";
      form.daily_end_time = "";
    }
    await fetchPromos();
  } catch (e) {
    error.value =
      e?.data?.statusMessage || "Không xóa được mã khuyến mại, thử lại sau.";
  }
}

function fillForm(p) {
  form.code = p.code || "";
  form.bonus_percent = p.bonus_percent ?? null;
  form.bonus_credit = p.bonus_credit ?? null;
  form.max_total_uses = p.max_total_uses ?? null;
  form.max_uses_per_user = p.max_uses_per_user ?? null;
  form.min_amount = p.min_amount ?? null;
  form.starts_at = p.starts_at
    ? new Date(p.starts_at).toISOString().slice(0, 16)
    : "";
  form.ends_at = p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : "";
  form.daily_start_time = p.daily_start_time || "";
  form.daily_end_time = p.daily_end_time || "";
}

async function handleSubmit() {
  if (!form.code.trim()) {
    error.value = "Vui lòng nhập mã khuyến mại.";
    return;
  }
  if (!form.bonus_percent && !form.bonus_credit) {
    error.value = "Cần cấu hình bonus % hoặc số tín chỉ cố định.";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/admin/deposit-promotions", {
      method: "POST",
      body: {
        code: form.code,
        bonus_percent: form.bonus_percent || null,
        bonus_credit: form.bonus_credit || null,
        max_total_uses: form.max_total_uses || null,
        max_uses_per_user: form.max_uses_per_user || null,
        min_amount: form.min_amount || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        // khung giờ lặp lại mỗi ngày (HH:mm)
        daily_start_time: form.daily_start_time || null,
        daily_end_time: form.daily_end_time || null,
      },
    });
    await fetchPromos();
  } catch (e) {
    error.value =
      e?.data?.statusMessage || "Không lưu được mã khuyến mại, thử lại sau.";
  } finally {
    saving.value = false;
  }
}

onMounted(fetchPromos);
</script>

<style scoped>
.promo-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.promo-title {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.promo-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(30, 64, 175, 0.8);
  padding: 0.9rem 1rem;
}

.promo-form-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}

.promo-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem 0.8rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.input {
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.88rem;
  padding: 0.45rem 0.6rem;
}

/* Đổi màu icon lịch / đồng hồ trong input datetime/time (trình duyệt WebKit) */
.input[type="datetime-local"]::-webkit-calendar-picker-indicator,
.input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

.btn-primary {
  margin-top: 0.8rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.promo-error {
  margin-top: 0.5rem;
  color: #fca5a5;
  font-size: 0.84rem;
}

.promo-list {
  overflow: hidden;
  margin-top: 0.25rem;
}

.promo-actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

.btn-link {
  border: none;
  background: rgba(15, 23, 42, 0.9);
  color: #60a5fa;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0.25rem 0.55rem;
  text-align: center;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.6);
  min-width: 54px;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.btn-link--danger {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.8);
}

.btn-link:hover {
  background: rgba(37, 99, 235, 0.25);
  color: #bfdbfe;
}

.btn-link--danger:hover {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.promo-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.promo-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table th,
.data-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgba(30, 64, 175, 0.7);
}

.data-table th {
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
}

.data-table td {
  vertical-align: middle;
}

.data-table th:last-child,
.data-table td:last-child {
  text-align: center;
}

.data-table tbody tr {
  cursor: pointer;
}

.data-table tbody tr:hover {
  background: rgba(30, 64, 175, 0.3);
}
</style>


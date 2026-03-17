<template>
  <Teleport to="body">
    <div v-if="open" class="deposit-overlay" @click.self="closeModal">
      <div class="deposit-modal">
        <div class="deposit-head">
          <h3>Nạp tiền SePay</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="deposit-body">
          <div class="left">
            <div class="qr-wrap">
              <img v-if="qrData?.qr_url && qrRemaining > 0" :src="qrData.qr_url" alt="QR SePay" />
              <div v-else class="qr-placeholder">Tạo QR để thanh toán</div>
            </div>
            <p v-if="qrRemaining > 0" class="expire-text">Hết hạn sau: {{ formatTime(qrRemaining) }}</p>
          </div>

          <div class="right">
            <label>Số tiền (VND)</label>
            <input
              :value="amountDisplay"
              class="amount-input"
              inputmode="numeric"
              @input="handleAmountInput"
            />

            <div class="quick">
              <button @click="pickAmount(50000)">50.000</button>
              <button @click="pickAmount(100000)">100.000</button>
              <button @click="pickAmount(200000)">200.000</button>
              <button @click="pickAmount(500000)">500.000</button>
            </div>

            <div class="promo-box">
              <label>Mã khuyến mại (nếu có)</label>
              <input
                v-model="promoCode"
                class="promo-input"
                type="text"
                autocomplete="off"
                placeholder="Nhập mã khuyến mại..."
              />
            </div>

            <div class="memo-box">
              <div class="memo-label">Nội dung chuyển khoản (bắt buộc):</div>
              <div class="memo-row">
                <code>{{ qrData?.memo || '---' }}</code>
                <button :disabled="!qrData?.memo" @click="copyMemo">Copy</button>
              </div>
            </div>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="actions">
              <button class="primary" :disabled="loading || amount < 10000" @click="createQr">
                {{ loading ? "Đang tạo..." : "Tạo QR" }}
              </button>
              <button
                v-if="isDev && qrData?.trans_id && qrRemaining > 0"
                class="secondary"
                :disabled="testing"
                @click="simulatePayment"
              >
                {{ testing ? "Đang test..." : "Test thanh toán (dev)" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const isDev = import.meta.env.DEV
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success', payload: { amount: number; newCredit: number }): void
}>()

const { show: showToast } = useToast()

const amount = ref(100000)
const amountDisplay = ref('100.000')
const qrData = ref<any>(null)
const qrRemaining = ref(0)
const promoCode = ref('')
const loading = ref(false)
const testing = ref(false)
const error = ref('')

let countdownTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function closeModal() {
  emit('update:open', false)
  stopAll()
  resetForm()
}

function resetForm() {
  amount.value = 100000
  amountDisplay.value = '100.000'
  qrData.value = null
  qrRemaining.value = 0
  promoCode.value = ''
  loading.value = false
  testing.value = false
  error.value = ''
}

function stopAll() {
  if (countdownTimer) clearInterval(countdownTimer)
  if (pollTimer) clearInterval(pollTimer)
  countdownTimer = null
  pollTimer = null
}

function formatVnd(v: number) {
  return (Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function parseVnd(v: string) {
  return parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0
}

function handleAmountInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  amount.value = parseVnd(value)
  amountDisplay.value = formatVnd(amount.value)
}

function pickAmount(v: number) {
  amount.value = v
  amountDisplay.value = formatVnd(v)
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function startCountdown(seconds: number) {
  qrRemaining.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    qrRemaining.value--
    if (qrRemaining.value <= 0) {
      qrRemaining.value = 0
      if (countdownTimer) clearInterval(countdownTimer)
      countdownTimer = null
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = null
      error.value = 'QR đã hết hạn, vui lòng tạo lại.'
    }
  }, 1000)
}

async function createQr() {
  if (amount.value < 10000) {
    error.value = 'Số tiền tối thiểu là 10.000 VND'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res: any = await $fetch('/api/payment/qr', {
      method: 'POST',
      body: { amount: amount.value, promo_code: promoCode.value || null }
    })
    qrData.value = res
    startCountdown(res.expires_in_seconds || 300)
    startPolling()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Không thể tạo QR'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  if (!qrData.value?.trans_id) return
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const s: any = await $fetch(`/api/payment/qr/check/${qrData.value.trans_id}`)
      if (s?.status === 'success') {
        stopAll()
        showToast('Nạp tiền thành công!', 'success')
        emit('success', {
          amount: Number(s.transfer_amount || 0),
          newCredit: Number(s.new_credit || 0)
        })
        closeModal()
      } else if (s?.status === 'expired' || s?.status === 'cancelled') {
        stopAll()
        error.value = 'QR đã hết hạn, vui lòng tạo lại.'
      }
    } catch {
      // Ignore transient polling errors.
    }
  }, 3000)
}

async function simulatePayment() {
  if (!qrData.value?.trans_id) return
  testing.value = true
  error.value = ''
  try {
    const res: any = await $fetch('/api/payment/test/simulate-payment', {
      method: 'POST',
      body: { trans_id: qrData.value.trans_id }
    })
    stopAll()
    showToast('Nạp tiền test thành công!', 'success')
    emit('success', {
      amount: Number(res.transfer_amount || 0),
      newCredit: Number(res.new_credit || 0)
    })
    closeModal()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Test thanh toán thất bại'
  } finally {
    testing.value = false
  }
}

async function copyMemo() {
  if (!qrData.value?.memo) return
  try {
    await navigator.clipboard.writeText(qrData.value.memo)
    showToast('Đã copy nội dung chuyển khoản', 'info')
  } catch {
    error.value = 'Không thể copy nội dung'
  }
}

watch(
  () => props.open,
  (v) => {
    if (!v) {
      stopAll()
      resetForm()
    }
  }
)
</script>

<style scoped>
.deposit-overlay { position: fixed; inset: 0; background: rgba(2,6,23,.82); display: flex; align-items: center; justify-content: center; z-index: 100; }
.deposit-modal { width: min(900px, 95vw); background: var(--bg-card); border: 1px solid rgba(255,255,255,.1); border-radius: 14px; box-shadow: var(--neon-shadow); }
.deposit-head { display: flex; justify-content: space-between; align-items: center; padding: .9rem 1.1rem; border-bottom: 1px solid rgba(255,255,255,.1); }
.deposit-head h3 { margin: 0; font-size: 1.05rem; }
.close-btn { background: transparent; border: 0; color: var(--text-secondary); font-size: 1.4rem; cursor: pointer; }
.deposit-body { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; padding: 1rem; }
.qr-wrap { width: 100%; aspect-ratio: 1/1; border-radius: 10px; border: 1px dashed rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.04); overflow: hidden; }
.qr-wrap img { width: 100%; height: 100%; object-fit: cover; }
.qr-placeholder { color: var(--text-muted); font-size: .9rem; }
.expire-text { margin-top: .5rem; font-size: .85rem; color: #fbbf24; }
.right label { display: block; margin-bottom: .3rem; color: var(--text-secondary); font-size: .9rem; }
.amount-input { width: 100%; padding: .65rem .8rem; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-primary); }
.quick { margin-top: .6rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: .4rem; }
.quick button { padding: .45rem; border-radius: 8px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.04); color: var(--text-secondary); cursor: pointer; }
.promo-box { margin-top: .8rem; }
.promo-input { width: 100%; padding: .5rem .7rem; border-radius: 8px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-primary); font-size: .9rem; }
.memo-box { margin-top: .8rem; padding: .65rem; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; background: rgba(255,255,255,.03); }
.memo-label { font-size: .85rem; color: var(--text-secondary); margin-bottom: .35rem; }
.memo-row { display: flex; align-items: center; gap: .5rem; }
.memo-row code { flex: 1; display: block; padding: .5rem; background: rgb(var(--accent-rgb) / .12); border-radius: 6px; font-size: .82rem; overflow-x: auto; }
.memo-row button { padding: .45rem .65rem; border-radius: 6px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #fff; cursor: pointer; }
.actions { margin-top: .85rem; display: flex; gap: .5rem; }
.primary,.secondary { padding: .6rem .9rem; border-radius: 999px; border: 0; cursor: pointer; font-weight: 600; }
.primary { background-image: var(--btn-primary-bg); color: #fff; }
.secondary { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.2); }
.error { margin-top: .5rem; color: #fca5a5; font-size: .85rem; }
@media (max-width: 860px) { .deposit-body { grid-template-columns: 1fr; } .quick { grid-template-columns: repeat(2, 1fr); } }
</style>


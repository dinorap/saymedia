<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click="handleClose">
      <div
        class="modal-content payment-modal-content"
        :class="{
          'payment-modal-content--paypal': activePaymentTab === 'paypal',
        }"
        @click.stop
      >
        <div class="modal-header">
          <!-- Tabs -->
          <div class="payment-tabs">
            <button
              class="payment-tab"
              :class="{ active: activePaymentTab === 'bank' }"
              @click="activePaymentTab = 'bank'"
            >
              <i class="fas fa-building-columns"></i>
              {{ $t("payment.deposit.bankTab") }}
            </button>
            <button
              class="payment-tab"
              :class="{ active: activePaymentTab === 'paypal' }"
              @click="activePaymentTab = 'paypal'"
            >
              <i class="fab fa-paypal"></i>
              {{ $t("payment.deposit.paypalTab") }}
            </button>
            <button
              class="payment-tab"
              :class="{ active: activePaymentTab === 'usdt' }"
              @click="activePaymentTab = 'usdt'"
            >
              <i class="fas fa-coins"></i>
              USDT
            </button>
          </div>
          <div class="header-right">
            <div v-if="qrTimeRemaining > 0" class="qr-time-remaining">
              {{ $t("payment.deposit.expiresIn") }}:
              {{ formatTimeRemaining(qrTimeRemaining) }}
            </div>
            <button
              v-if="isDev && qrData && qrTimeRemaining > 0"
              type="button"
              class="test-payment-btn-header"
              @click="testPayment"
              :disabled="testingPayment"
            >
              <span v-if="testingPayment">{{
                $t("payment.deposit.testingPayment")
              }}</span>
              <span v-else>{{ $t("payment.deposit.testPayment") }}</span>
            </button>
            <button class="modal-close" @click="handleClose">&times;</button>
          </div>
        </div>
        <div class="modal-body payment-modal-body">
          <!-- Bank Transfer Tab -->
          <div
            id="tab-bank"
            class="payment-tab-content"
            :class="{ active: activePaymentTab === 'bank' }"
          >
            <div class="payment-content-grid">
              <!-- Left: QR Image từ file -->
              <div class="payment-qr-section">
                <div class="qr-container">
                  <div class="qr-code-placeholder">
                    <img
                      v-if="qrData && qrTimeRemaining > 0"
                      id="qr-code-image"
                      :src="qrData.qr_url"
                      alt="QR Code"
                    />
                    <div v-else class="qr-placeholder-text">
                      {{ $t("payment.deposit.qrPlaceholder") }}
                    </div>
                  </div>
                  <div class="qr-brands">
                    <span>napas 247</span>
                    <span>VietinBank</span>
                  </div>
                </div>
                <div class="account-info">
                  <div class="account-name">
                    {{ $t("payment.deposit.bank") }}
                  </div>
                  <div class="account-number">
                    {{ $t("payment.deposit.accountNumber") }}
                  </div>
                  <div class="account-amount">
                    {{ $t("payment.deposit.amount") }}:
                    <span id="display-amount">{{
                      depositAmount ? formatVND(depositAmount) : "100.000"
                    }}</span>
                    VND
                  </div>
                  <p class="qr-instruction">
                    {{ $t("payment.deposit.scanQR") }}
                  </p>
                </div>

                <div class="payment-actions payment-actions--left">
                  <button
                    type="button"
                    class="confirm-payment-btn"
                    @click="createQR"
                    :disabled="
                      loading || !depositAmount || depositAmount < 10000
                    "
                  >
                    <i class="fas fa-check"></i>
                    <span v-if="loading">Đang tạo...</span>
                    <span v-else>Tạo QR Code</span>
                  </button>
                </div>
              </div>

              <!-- Right: Form -->
              <div class="payment-form-section">
                <div class="form-group">
                  <label for="payment-amount">Số tiền thanh toán (₫)</label>
                  <input
                    type="text"
                    id="payment-amount"
                    name="amount"
                    :value="depositAmountDisplay || '100.000'"
                    inputmode="numeric"
                    autocomplete="off"
                    :placeholder="$t('placeholder.amount')"
                    @input="handleAmountInput"
                    @blur="formatAmount"
                    required
                  />
                </div>

                <div class="quick-amount-buttons">
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 50000 }"
                    @click="selectQuickAmount(50000)"
                  >
                    50.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 100000 }"
                    @click="selectQuickAmount(100000)"
                  >
                    100.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 500000 }"
                    @click="selectQuickAmount(500000)"
                  >
                    500.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 1000000 }"
                    @click="selectQuickAmount(1000000)"
                  >
                    1.000.000₫
                  </button>
                </div>

                <div class="promo-row">
                  <label class="promo-label">Mã khuyến mại (nếu có)</label>
                  <div class="promo-inline">
                    <input
                      v-model="promoCode"
                      type="text"
                      class="promo-input"
                      autocomplete="off"
                      placeholder="Nhập mã khuyến mại..."
                    />
                    <button
                      type="button"
                      class="promo-apply-btn"
                      @click="applyPromo"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>

                <div class="expected-credit-row">
                  <span class="expected-label">Tín chỉ dự kiến:</span>
                  <span class="expected-value">{{ totalExpectedCredit }}</span>
                </div>

                <div class="account-details">
                  <div class="detail-row">
                    <span class="detail-label"
                      >{{ $t("payment.deposit.accountHolder") }}:</span
                    >
                    <span class="detail-value">ACB</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{
                      $t("payment.deposit.bank")
                    }}</span>
                    <span class="detail-value">ACB - 23766621</span>
                  </div>
                </div>

                <div class="transfer-content">
                  <label>
                    Nội dung chuyển khoản:
                    <span class="required-note"
                      >Bắt buộc ghi đúng để nhận điểm tự động</span
                    >
                  </label>
                  <div class="transfer-content-box">
                    <span
                      id="transfer-content-text"
                      :class="{
                        'transfer-placeholder': !qrData || !qrData.memo,
                      }"
                    >
                      {{
                        qrData && qrData.memo
                          ? qrData.memo
                          : $t("payment.deposit.transferContentPlaceholder")
                      }}
                    </span>
                    <button
                      v-if="qrData && qrData.memo"
                      class="btn-copy-content"
                      id="btn-copy-content"
                      @click="copyTransferContent"
                      :title="$t('payment.deposit.copyContent')"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div
                  v-if="error"
                  class="message error"
                  style="margin-top: 1rem"
                >
                  {{ error }}
                </div>
              </div>
            </div>
          </div>

          <!-- PayPal Tab -->
          <div
            id="tab-paypal"
            class="payment-tab-content"
            :class="{ active: activePaymentTab === 'paypal' }"
          >
            <div class="paypal-column">
              <div class="paypal-heading">
                <h2>Nạp tiền qua PayPal</h2>
                <p>
                  Số tiền sẽ được quy đổi sang tín chỉ sau khi PayPal xác nhận
                  thanh toán thành công.
                </p>
              </div>

              <div class="payment-form-section">
                <div class="form-group">
                  <label for="paypal-amount-input">Số tiền nạp (VND)</label>
                  <input
                    id="paypal-amount-input"
                    type="text"
                    :value="depositAmountDisplay || '100.000'"
                    inputmode="numeric"
                    autocomplete="off"
                    :placeholder="$t('placeholder.amount')"
                    @input="handleAmountInput"
                    @blur="formatAmount"
                    required
                  />
                </div>

                <div class="quick-amount-buttons">
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 50000 }"
                    @click="selectQuickAmount(50000)"
                  >
                    50.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 100000 }"
                    @click="selectQuickAmount(100000)"
                  >
                    100.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 500000 }"
                    @click="selectQuickAmount(500000)"
                  >
                    500.000₫
                  </button>
                  <button
                    class="quick-amount-btn"
                    :class="{ active: depositAmount === 1000000 }"
                    @click="selectQuickAmount(1000000)"
                  >
                    1.000.000₫
                  </button>
                </div>

                <div class="promo-row">
                  <label class="promo-label">Mã khuyến mại (nếu có)</label>
                  <div class="promo-inline">
                    <input
                      v-model="promoCode"
                      type="text"
                      class="promo-input"
                      autocomplete="off"
                      placeholder="Nhập mã khuyến mại..."
                    />
                    <button
                      type="button"
                      class="promo-apply-btn"
                      @click="applyPromo"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>

                <div class="expected-credit-row">
                  <span class="expected-label">Tín chỉ dự kiến:</span>
                  <span class="expected-value">{{ totalExpectedCredit }}</span>
                </div>

                <p class="paypal-amount-hint">
                  Tối thiểu 10.000đ. Sử dụng PayPal sandbox trước khi chuyển
                  sang live.
                </p>

                <div class="paypal-actions">
                  <div
                    id="paypal-buttons-container"
                    class="paypal-buttons-container"
                  ></div>

                  <p class="paypal-note">
                    Không tự làm mới trang khi đang thanh toán PayPal. Nếu gặp
                    lỗi hoặc hết hạn, hãy tạo đơn nạp mới.
                  </p>

                  <div
                    v-if="paypalError"
                    class="message error"
                    style="margin-top: 0.75rem"
                  >
                    {{ paypalError }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- USDT Tab (static contact info) -->
          <div
            id="tab-usdt"
            class="payment-tab-content"
            :class="{ active: activePaymentTab === 'usdt' }"
          >
            <div class="payment-content-grid--centered">
              <div class="usdt-card">
                <h3 class="usdt-title">Thanh toán qua USDT</h3>
                <p class="usdt-text">
                  Vui lòng liên hệ qua kênh hỗ trợ để được hướng dẫn thanh toán
                  USDT và xác nhận nạp điểm.
                </p>
                <a
                  href="https://t.me/saymedia_ai"
                  target="_blank"
                  rel="noopener"
                  class="usdt-link-btn"
                >
                  Mở Telegram hỗ trợ
                </a>
                <p class="usdt-note">
                  Sau khi thanh toán, admin sẽ cộng điểm thủ công vào tài khoản
                  của bạn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onBeforeUnmount, nextTick, watch } from "vue";

const { show: showToast } = useToast();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "success"]);

const { t } = useI18n();

const depositAmount = ref(100000);
const depositAmountDisplay = ref("100.000");
const qrData = ref(null);
const qrTimeRemaining = ref(0);
const qrExpired = ref(false);
const qrCountdownInterval = ref(null);
const loading = ref(false);
const error = ref("");
const testingPayment = ref(false);
const activePaymentTab = ref("bank");
const promoCode = ref("");

const runtimeConfig = useRuntimeConfig();
const paypalClientId = runtimeConfig.public.paypalClientId;
const paypalCurrency =
  runtimeConfig.public.paypalCurrency ||
  runtimeConfig.public.PAYPAL_CURRENCY ||
  "USD";

const vndPerCredit =
  Number(runtimeConfig.public.depositVndPerCredit || 1000) || 1000;

const baseExpectedCredit = computed(() =>
  depositAmount.value && depositAmount.value > 0
    ? Math.floor(depositAmount.value / vndPerCredit)
    : 0,
);

const bonusExpectedCredit = ref(0);
const totalExpectedCredit = computed(
  () => baseExpectedCredit.value + bonusExpectedCredit.value,
);

// PayPal
const paypalError = ref("");
const paypalLoaded = ref(false);

const loadPayPalScript = () => {
  return new Promise((resolve, reject) => {
    if (paypalLoaded.value) return resolve();

    if (!paypalClientId) {
      paypalError.value = "Chưa cấu hình PAYPAL_CLIENT_ID trên server.";
      return reject(new Error("Missing PAYPAL_CLIENT_ID"));
    }

    const existing = document.querySelector('script[data-paypal-sdk="true"]');

    if (existing) {
      paypalLoaded.value = true;
      return resolve();
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypalClientId,
    )}&currency=${encodeURIComponent(
      paypalCurrency,
    )}&components=buttons&disable-funding=card,credit`;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => {
      paypalLoaded.value = true;
      resolve();
    };
    script.onerror = () => {
      paypalError.value = "Không tải được PayPal SDK. Vui lòng thử lại sau.";
      reject(new Error("Failed to load PayPal SDK"));
    };
    document.body.appendChild(script);
  });
};

const initPayPalButtons = async () => {
  try {
    await loadPayPalScript();

    // @ts-ignore
    const paypal = window.paypal;
    if (!paypal) {
      paypalError.value = "PayPal SDK chưa sẵn sàng.";
      return;
    }

    const container = document.getElementById("paypal-buttons-container");
    if (!container) return;
    container.innerHTML = "";

    paypal
      .Buttons({
        style: {
          layout: "vertical",
          height: 45,
          color: "gold",
          shape: "rect",
          label: "paypal",
        },
        createOrder: async () => {
          paypalError.value = "";

          if (!depositAmount.value || depositAmount.value < 10000) {
            paypalError.value =
              t("payment.deposit.errors.minAmount") ||
              "Số tiền tối thiểu là 10.000 VND";
            throw new Error("Amount too low");
          }

          const res = await $fetch("/api/payment/paypal/create-order", {
            method: "POST",
            body: {
              amount: depositAmount.value,
              promo_code: promoCode.value || null,
            },
          });

          if (!res || !res.success || !res.order_id) {
            paypalError.value = "Không tạo được đơn PayPal.";
            throw new Error("Create order failed");
          }

          return res.order_id;
        },
        onApprove: async (data) => {
          try {
            const res = await $fetch("/api/payment/paypal/capture-order", {
              method: "POST",
              body: {
                order_id: data.orderID,
              },
            });

            if (res && res.success) {
              handleClose();
              emit("success", {
                amount: res.amount,
                newCredit: null,
              });
              showToast("Nạp tiền qua PayPal thành công!", "success");
            } else {
              paypalError.value = "Thanh toán PayPal chưa hoàn tất.";
            }
          } catch (err) {
            paypalError.value =
              "Có lỗi khi xác nhận thanh toán PayPal. Vui lòng thử lại.";
          }
        },
        onError: (err) => {
          console.error("PayPal error", err);
          paypalError.value =
            "Có lỗi xảy ra với PayPal. Nếu lỗi lặp lại, hãy thử lại sau ít phút.";
        },
      })
      .render("#paypal-buttons-container");
  } catch (err) {
    if (!paypalError.value) {
      paypalError.value =
        "Không khởi tạo được PayPal. Vui lòng thử lại sau vài phút.";
    }
  }
};

watch(
  () => activePaymentTab.value,
  (tab) => {
    if (tab === "paypal") {
      nextTick(() => {
        initPayPalButtons();
      });
    }
  },
);

const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const startQrCountdown = (expiresInSeconds) => {
  qrTimeRemaining.value = expiresInSeconds;
  qrExpired.value = false;

  if (qrCountdownInterval.value) {
    clearInterval(qrCountdownInterval.value);
  }

  qrCountdownInterval.value = setInterval(() => {
    qrTimeRemaining.value--;

    if (qrTimeRemaining.value <= 0) {
      clearInterval(qrCountdownInterval.value);
      qrCountdownInterval.value = null;
      qrExpired.value = true;
      qrData.value = null;
      error.value = t("payment.deposit.errors.qrExpired");
    }
  }, 1000);
};

const stopQrCountdown = () => {
  if (qrCountdownInterval.value) {
    clearInterval(qrCountdownInterval.value);
    qrCountdownInterval.value = null;
  }
  qrTimeRemaining.value = 0;
  qrExpired.value = false;
};

let paymentPollTimer = null;

const stopPaymentPolling = () => {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
};

const startPaymentPolling = async () => {
  stopPaymentPolling();

  if (!qrData.value || !qrData.value.trans_id) {
    return;
  }

  paymentPollTimer = setInterval(async () => {
    try {
      const statusRes = await $fetch(
        `/api/payment/qr/check/${qrData.value.trans_id}`,
      );
      if (statusRes?.status === "success") {
        stopPaymentPolling();
        stopQrCountdown();
        handleClose();
        emit("success", {
          amount: statusRes.actual_amount || statusRes.transfer_amount,
          newCredit: statusRes.new_credit,
        });
        showToast("Nạp tiền thành công!", "success");
      } else if (
        statusRes?.status === "expired" ||
        statusRes?.status === "cancelled"
      ) {
        stopPaymentPolling();
        stopQrCountdown();
        qrData.value = null;
        error.value = t("payment.deposit.errors.qrExpired");
      }
    } catch (err) {
      // Ignore transient polling errors
    }
  }, 3000);
};

// Format VND như store.html: 1.000.000
const formatVND = (num) => {
  const n = Math.max(0, parseInt(num || 0, 10) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseVND = (str) => {
  const digits = String(str || "").replace(/[^\d]/g, "");
  return parseInt(digits || "0", 10);
};

const handleAmountInput = (event) => {
  const value = event.target.value;
  const num = parseVND(value);
  depositAmount.value = num;
  depositAmountDisplay.value = formatVND(num);
};

const formatAmount = () => {
  if (depositAmount.value) {
    depositAmountDisplay.value = formatVND(depositAmount.value);
  }
};

const selectQuickAmount = (amount) => {
  depositAmount.value = amount;
  depositAmountDisplay.value = formatVND(amount);
};

const copyTransferContent = async () => {
  const memoText = qrData.value?.memo || "CHUYENKHOAN 100000";

  try {
    await navigator.clipboard.writeText(memoText);
  } catch (err) {
    console.error("Failed to copy:", err);
    error.value = t("payment.deposit.errors.copyError");
  }
};

let promoPreviewTimer = null;

const updatePromoPreview = (silent = false) => {
  if (!promoCode.value || !promoCode.value.trim()) {
    bonusExpectedCredit.value = 0;
    return;
  }
  promoCode.value = promoCode.value.trim().toUpperCase();

  if (!depositAmount.value || depositAmount.value < 10000) {
    bonusExpectedCredit.value = 0;
    if (!silent) {
      showToast(
        "Số tiền phải từ 10.000đ trở lên để áp dụng khuyến mãi.",
        "info",
      );
    }
    return;
  }

  $fetch("/api/payment/promo-preview", {
    method: "POST",
    body: {
      amount: depositAmount.value,
      promo_code: promoCode.value,
    },
  })
    .then((res) => {
      if (res && res.success) {
        bonusExpectedCredit.value = Number(res.bonus_credit || 0);
        if (!silent) {
          if (bonusExpectedCredit.value > 0) {
            showToast(
              `Áp dụng mã thành công. Bạn được cộng thêm ${bonusExpectedCredit.value} tín chỉ dự kiến.`,
              "success",
            );
          } else {
            showToast(
              "Mã hợp lệ nhưng hiện không cộng thêm khuyến mãi (có thể do không đủ điều kiện về số tiền hoặc giới hạn lượt dùng).",
              "info",
            );
          }
        }
      } else {
        bonusExpectedCredit.value = 0;
        if (!silent) {
          showToast("Không áp dụng được mã khuyến mãi.", "error");
        }
      }
    })
    .catch(() => {
      bonusExpectedCredit.value = 0;
      if (!silent) {
        showToast("Không áp dụng được mã khuyến mãi.", "error");
      }
    });
};

const applyPromo = () => {
  updatePromoPreview(false);
};

watch(
  () => depositAmount.value,
  () => {
    bonusExpectedCredit.value = 0;
    if (!promoCode.value || !promoCode.value.trim()) return;
    if (promoPreviewTimer) clearTimeout(promoPreviewTimer);
    promoPreviewTimer = setTimeout(() => {
      updatePromoPreview(true);
    }, 300);
  },
);

const createQR = async () => {
  if (!depositAmount.value || depositAmount.value < 10000) {
    error.value =
      t("payment.deposit.errors.minAmount") ||
      "Số tiền tối thiểu là 10,000 VND";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const res = await $fetch(`/api/payment/qr`, {
      method: "POST",
      body: {
        amount: depositAmount.value,
        promo_code: promoCode.value || null,
      },
    });

    if (res.success) {
      qrData.value = res;
      qrExpired.value = false;
      const expiresIn =
        Number(res.expires_in_seconds || 0) >= 60
          ? Number(res.expires_in_seconds)
          : 300;
      startQrCountdown(expiresIn);
      startPaymentPolling();
    }
  } catch (err) {
    if (err.data?.error) {
      error.value = err.data.error;
    } else {
      error.value = t("payment.deposit.errors.createQRError");
    }
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit("update:modelValue", false);
  stopQrCountdown();
  stopPaymentPolling();
  qrData.value = null;
  qrExpired.value = false;
  depositAmount.value = 100000;
  depositAmountDisplay.value = "100.000";
  promoCode.value = "";
  error.value = "";
  bonusExpectedCredit.value = 0;
  paypalError.value = "";
  activePaymentTab.value = "bank";
};

const isDev = import.meta.env.DEV;

const testPayment = async () => {
  if (!qrData.value || !qrData.value.trans_id) {
    error.value = t("payment.deposit.errors.noTransactionId");
    return;
  }

  if (qrExpired.value || qrTimeRemaining.value <= 0) {
    error.value = t("payment.deposit.errors.qrExpiredShort");
    return;
  }

  testingPayment.value = true;
  error.value = "";

  try {
    const res = await $fetch(`/api/payment/test/simulate-payment`, {
      method: "POST",
      body: {
        trans_id: qrData.value.trans_id,
      },
    });

    if (res.success) {
      stopQrCountdown();
      qrData.value = null;
      handleClose();
      emit("success", {
        amount: res.actual_amount || res.amount,
        newCredit: res.new_credit,
      });
      showToast("Nạp tiền test thành công!", "success");
    }
  } catch (err) {
    if (err.data?.error) {
      error.value = err.data.error;
      if (
        err.data.error.includes("hết hạn") ||
        err.data.error.includes("expired")
      ) {
        qrExpired.value = true;
        stopQrCountdown();
      }
    } else {
      error.value = t("payment.deposit.errors.testPaymentError");
    }
  } finally {
    testingPayment.value = false;
  }
};

onBeforeUnmount(() => {
  stopQrCountdown();
  stopPaymentPolling();
});
</script>

<style scoped>
/* Payment Modal Styles - From dashboard.vue */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  max-width: 100%;
  width: min(780px, 92vw);
  height: min(800px, 90vh);
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.22);
  animation: slideIn 0.35s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(1, 123, 251, 0.2);
  background: rgba(3, 10, 25, 0.55);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.qr-time-remaining {
  color: #f59e0b;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.test-payment-btn-header {
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.test-payment-btn-header:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3);
}

.test-payment-btn-header:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.modal-body {
  padding: 1.25rem 1.5rem 1.5rem;
  height: calc(100% - 72px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

/* Payment Tabs */
.payment-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
}

.payment-tab {
  padding: 0.7rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  align-items: center;
  gap: 0.5rem;
}

.payment-tab.active {
  background: var(--btn-primary-bg);
  box-shadow: var(--btn-primary-glow);
  color: white;
  border-color: transparent;
}

.payment-tab-content {
  display: none;
}

.payment-tab-content.active {
  display: block;
}

.payment-content-grid--centered {
  grid-template-columns: 1fr;
  align-items: center;
  justify-content: center;
  justify-items: center;
}

.usdt-card {
  max-width: 420px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  background: rgba(15, 23, 42, 0.96);
  border-radius: 16px;
  border: 1px solid rgba(52, 211, 153, 0.4);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.8);
  text-align: center;
  color: #e5e7eb;
}

.usdt-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.usdt-text,
.usdt-note {
  font-size: 0.9rem;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.usdt-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.usdt-link-btn:hover {
  opacity: 0.95;
}

/* Payment Content Grid */
.payment-content-grid {
  display: grid;
  grid-template-columns: 1.02fr 1fr;
  gap: 1rem;
  align-items: start;
  flex: 1;
  min-height: 0;
}

.payment-content-grid > * {
  min-width: 0;
}

/* QR Section */
.payment-qr-section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
}

.qr-container {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(1, 123, 251, 0.18);
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.qr-code-placeholder {
  margin: 1rem 0;
  min-height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-placeholder-text {
  width: 290px;
  height: 290px;
  color: var(--text-muted);
  font-size: 0.95rem;
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(1, 123, 251, 0.22);
  border: 2px dashed gray;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-brands {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.8rem;
}

.account-info {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(1, 123, 251, 0.18);
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
}

.account-name,
.account-number {
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.account-amount {
  color: #059669;
  font-weight: 500;
  margin-bottom: 0.2rem;
}

.qr-instruction {
  font-size: 0.9rem;
  margin: 0;
}

/* Payment Form Section */
.payment-form-section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
}

.payment-form-section .form-group {
  margin-bottom: 0;
}

.payment-form-section .form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.payment-form-section input {
  width: 100%;
  padding: 0.9rem 1rem;
  color: var(--text-primary) !important;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.payment-form-section input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-glow);
}

/* Quick Amount Buttons */
.quick-amount-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.quick-amount-btn {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(1, 123, 251, 0.25);
  border-radius: 8px;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.96rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.promo-row {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.promo-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.promo-input {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.promo-inline {
  display: flex;
  gap: 0.5rem;
}

.promo-apply-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.7);
  background: rgba(8, 47, 73, 0.9);
  color: #e0f2fe;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.promo-apply-btn:hover {
  background: rgba(8, 47, 73, 1);
}

.expected-credit-row {
  margin-top: 0.6rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.96);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.expected-label {
  color: var(--text-secondary);
  white-space: nowrap;
}

.expected-value {
  font-weight: 600;
  color: #4ade80;
  font-size: 1rem;
}

.quick-amount-btn:hover {
  border-color: var(--blue-border);
  background: rgba(1, 123, 251, 0.1);
}

.quick-amount-btn.active {
  background: var(--btn-primary-bg);
  box-shadow: var(--btn-primary-glow);
  color: #fff;
  border-color: transparent;
}

/* Account Details */
.account-details {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(1, 123, 251, 0.18);
  border-radius: 12px;
  padding: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.detail-row:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-label {
  font-size: 0.9rem;
}

.detail-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Transfer Content */
.transfer-content {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(1, 123, 251, 0.18);
  border-radius: 12px;
  padding: 1rem;
}

.transfer-content label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.required-note {
  color: #ef4444;
  font-size: 0.9rem;
}

.transfer-content-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(1, 123, 251, 0.1);
  border: 1px solid rgba(1, 123, 251, 0.35);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: "Courier New", monospace;
  font-weight: bold;
  color: var(--text-primary);
  min-height: 46px;
}

.transfer-placeholder {
  color: #9ca3af;
  font-weight: normal;
  font-style: italic;
}

.btn-copy-content {
  background: #667eea;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-copy-content:hover {
  background: #5a67d8;
  transform: scale(1.05);
}

/* Payment Actions */
.payment-actions {
  width: 100%;
}

.payment-actions--left {
  margin-top: 0.75rem;
}

.confirm-payment-btn {
  width: 100%;
  padding: 0.95rem 1rem;
  background: var(--btn-primary-bg);
  box-shadow: var(--btn-primary-glow);
  color: white;
  border: none;
  border-radius: 10px;
  min-height: 46px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.confirm-payment-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.confirm-payment-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* PayPal Info */
.paypal-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.paypal-heading h2 {
  margin: 0 0 0.4rem;
  font-size: 1.2rem;
  font-weight: 650;
}

.paypal-heading p {
  margin: 0;
  font-size: 0.9rem;
}

.paypal-amount-box {
  text-align: left;
}

.paypal-amount-box label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.paypal-amount-box input {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
}

.paypal-amount-hint {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.paypal-buttons-container {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.paypal-note {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.message.error {
  color: #ef4444;
  font-size: 0.9rem;
  padding: 0.75rem;
  background: #fee2e2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

/* ===== Theme alignment overrides (dark-blue) ===== */
.modal-content.payment-modal-content {
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.35);
  box-shadow: var(--neon-shadow);
}

.modal-content.payment-modal-content--paypal {
  width: min(560px, 92vw);
  height: auto;
  max-height: 85vh;
}

.modal-content.payment-modal-content--paypal .modal-body {
  height: auto;
}

.payment-tab:hover {
  background: rgba(1, 123, 251, 0.1);
  border-color: var(--blue-border);
  color: #fff;
}

.qr-code-placeholder img {
  width: 290px;
  height: 333px;
  object-fit: contain;
  background: #fff;
  padding: 4px;
  border-radius: 10px;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.payment-form-section .form-group label,
.transfer-content label,
.detail-label,
.qr-instruction,
.qr-brands,
.paypal-info p {
  color: var(--text-secondary) !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 94vw;
    height: 95vh;
  }

  .payment-content-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    overflow: auto;
    padding-bottom: 0.25rem;
  }
}
</style>

<template>
  <div class="social-proof-panel" aria-live="polite">
    <div class="social-proof-header">
      <span class="social-proof-title">{{ $t("socialProof.title") || "Đơn hàng gần đây" }}</span>
    </div>
    <div class="social-proof-list">
      <div
        v-for="item in displayWithTime"
        :key="item.id"
        class="social-proof-item"
      >
        <span class="social-proof-text">
          <strong>{{ item.name }}</strong>
          {{ item.textMid }}
          <strong>{{ item.product }}</strong>
        </span>
        <small class="social-proof-time">{{ item.time }}</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

// Tạo tên ngẫu nhiên từ họ / đệm / tên, tránh lộ list tên cố định
const FIRST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Bùi",
  "Đặng",
  "Đỗ",
  "Võ",
  "Phan",
  "Dương",
];

const MIDDLE_NAMES = [
  "Văn",
  "Thị",
  "Minh",
  "Anh",
  "Gia",
  "Ngọc",
  "Quang",
  "Thanh",
  "Hồng",
  "Đức",
];

const LAST_NAMES = [
  "An",
  "Khoa",
  "Phúc",
  "Hưng",
  "Linh",
  "Tuấn",
  "Hà",
  "Duy",
  "Mai",
  "Huy",
  "Trang",
  "Quân",
  "Hương",
  "Nam",
  "Long",
];

const productNames = [
  "iPhone 15 Pro",
  "Tai nghe Sony WH-1000XM5",
  "MacBook Air M2",
  "Samsung Galaxy S24",
  "Gói nạp thẻ Liên Quân",
  "Tài khoản Valorant",
  "Nạp game Genshin Impact",
  "Gói dịch vụ Netflix",
  "Steam Wallet 200K",
  "Robux 800",
  "Gói PUBG UC",
  "Tài khoản LOL",
  "Nạp thẻ Free Fire",
  "Spotify Premium",
  "YouTube Premium",
];

const displayList = ref([]);
const realOrders = ref([]);
const MAX_ITEMS = 20;
const MIN_INTERVAL_MS = 30000;
const MAX_INTERVAL_MS = 60000;
const timeTick = ref(0);

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomItem(arr, exclude = null) {
  const filtered = exclude ? arr.filter((x) => x !== exclude) : arr;
  if (filtered.length === 0) return arr[0];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function generateRandomName(excludeName = "") {
  let name = "";
  for (let i = 0; i < 5; i++) {
    const first = randomItem(FIRST_NAMES);
    const middle = randomItem(MIDDLE_NAMES);
    const last = randomItem(LAST_NAMES);
    name = `${first} ${middle} ${last}`;
    if (!excludeName || name !== excludeName) break;
  }
  return name || excludeName || "Khách hàng";
}

function formatTimeFromMs(diffMs) {
  if (diffMs < 60000) {
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    return t("socialProof.secondsAgo", { n: seconds });
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes >= 60) {
    return t("socialProof.hoursAgo", { n: Math.floor(minutes / 60) });
  }
  return t("socialProof.minutesAgo", { n: minutes });
}

function createFakeItem(excludeName = null) {
  const lastShownName = excludeName ?? displayList.value[0]?.name ?? "";
  const name = generateRandomName(lastShownName);
  const product = randomItem(productNames);
  return {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    product,
    textMid: t("socialProof.bought") + " ",
    // tạo tại thời điểm hiện tại -> bắt đầu từ \"1 giây trước\"
    createdAt: Date.now(),
  };
}

function toBaseItem(real) {
  return {
    id: real.id,
    name: real.name,
    product: real.product,
    textMid: t("socialProof.bought") + " ",
    createdAt: Date.now() - (real.minutes ?? 1) * 60000,
    isReal: true,
  };
}

function mergeAndShuffle(real, fake) {
  const combined = [
    ...real.map(toBaseItem),
    ...fake,
  ];
  return shuffleArray(combined).slice(0, MAX_ITEMS);
}

function addOneFake() {
  const item = createFakeItem();
  displayList.value = [item, ...displayList.value].slice(0, MAX_ITEMS);
}

async function fetchRealOrders() {
  try {
    const data = await $fetch("/api/recent-orders");
    realOrders.value = Array.isArray(data) ? data : [];
  } catch {
    realOrders.value = [];
  }
}

function buildInitialList() {
  const real = realOrders.value;
  const fakeCount = Math.max(0, MAX_ITEMS - real.length);
  const fake = [];
  let lastFakeName = "";
  for (let i = 0; i < fakeCount; i++) {
    const item = createFakeItem(lastFakeName);
    lastFakeName = item.name;
    fake.push(item);
  }
  displayList.value = mergeAndShuffle(real, fake);
}

const displayWithTime = computed(() => {
  // tạo phụ thuộc vào timeTick để re-compute mỗi phút
  // eslint-disable-next-line no-unused-expressions
  timeTick.value;
  const now = Date.now();
  return displayList.value.map((item) => {
    const createdAt = item.createdAt ?? now;
    const diffMs = Math.max(1000, now - createdAt);
    return {
      ...item,
      time: formatTimeFromMs(diffMs),
    };
  });
});

let intervalId;
let timeIntervalId;

function scheduleNextFake() {
  const delay =
    MIN_INTERVAL_MS +
    Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
  if (intervalId) clearTimeout(intervalId);
  intervalId = setTimeout(() => {
    addOneFake();
    scheduleNextFake();
  }, delay);
}

onMounted(async () => {
  await fetchRealOrders();
  buildInitialList();
  scheduleNextFake();
  timeIntervalId = setInterval(() => {
    timeTick.value++;
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) clearTimeout(intervalId);
  if (timeIntervalId) clearInterval(timeIntervalId);
});
</script>

<style scoped>
.social-proof-panel {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 300px;
  max-height: 320px;
  background: var(--bg-card);
  border: 1px solid rgba(1, 123, 251, 0.3);
  border-radius: 12px;
  box-shadow: var(--neon-shadow);
  backdrop-filter: blur(12px);
  z-index: 40;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.social-proof-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(1, 123, 251, 0.2);
  flex-shrink: 0;
}

.social-proof-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.social-proof-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Thin scrollbar */
.social-proof-list::-webkit-scrollbar {
  width: 4px;
}
.social-proof-list::-webkit-scrollbar-track {
  background: transparent;
}
.social-proof-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}
.social-proof-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.social-proof-item {
  padding: 0.6rem 0.8rem;
  background: rgba(1, 123, 251, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(1, 123, 251, 0.15);
}

.social-proof-text {
  display: block;
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.social-proof-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.social-proof-text strong:last-of-type {
  color: var(--blue-electric);
}

.social-proof-time {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>

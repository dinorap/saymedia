<template>
  <div v-if="visible" class="contact-bubble">
    <div v-show="open" class="bubble-panel">
      <div class="bubble-header">
        <div>
          <span class="bubble-title">{{
            $t("profile.adminContactTitle")
          }}</span>
          <p class="bubble-subtitle">
            {{
              $t("profile.adminContactHint") ||
              "Nhắn trực tiếp cho admin phụ trách tài khoản của bạn."
            }}
          </p>
        </div>
      </div>
      <p class="bubble-admin" v-if="adminName">
        {{ $t("profile.adminContactLabel") }}:
        <strong>{{ adminName }}</strong>
      </p>
      <div class="bubble-chat">
        <div ref="messagesEl" class="bubble-messages">
          <div
            v-for="m in messages"
            :key="m.id"
            class="bubble-message"
            :class="{
              'bubble-message--mine': m.sender_type === 'user',
            }"
          >
            <div class="bubble-message-content">
              {{ m.content }}
            </div>
          </div>
          <div v-if="!messages.length" class="bubble-empty">
            {{ $t("profile.adminContactEmpty") }}
          </div>
        </div>
        <div class="bubble-input-row">
          <input
            v-model="draft"
            type="text"
            class="bubble-input"
            :placeholder="
              $t('profile.adminChatPlaceholder') ||
              'Nhập nội dung cần hỗ trợ...'
            "
            @keyup.enter="sendMessage"
          />
          <button
            type="button"
            class="bubble-send-btn"
            :disabled="sending || !draft.trim()"
            @click="sendMessage"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
    <button type="button" class="bubble-btn" @click="toggleBubble">
      <span class="bubble-icon">💬</span>
      <span v-if="hasUnread" class="bubble-unread-badge">
        {{ unreadCount }}
      </span>
    </button>
  </div>
</template>

<script setup>
import { nextTick, watch, computed } from "vue";

const open = ref(false);
const visible = ref(false);
const adminName = ref("");
const threadId = ref(null);
const messages = ref([]);
const draft = ref("");
const sending = ref(false);
const messagesEl = ref(null);
const roleCookie = useCookie("user_role", { path: "/" });
const lastSeenAt = ref(0);
const unreadCount = ref(0);
const hasUnread = computed(() => unreadCount.value > 0);

const STORAGE_KEY_PREFIX = "support_last_seen_";

function getLastSeenStorageKey(id) {
  return `${STORAGE_KEY_PREFIX}${id}`;
}

function loadLastSeenFromStorage(id) {
  if (typeof window === "undefined" || !id) return 0;
  try {
    const raw = window.localStorage.getItem(getLastSeenStorageKey(id));
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0) return 0;
    return ts;
  } catch {
    return 0;
  }
}

function saveLastSeenToStorage(id, ts) {
  if (typeof window === "undefined" || !id || !ts) return;
  try {
    window.localStorage.setItem(getLastSeenStorageKey(id), String(ts));
  } catch {
    // ignore
  }
}

let ws = null;
let wsReconnectTimer = null;
let wsManuallyClosed = false;

async function scrollToBottom() {
  if (!messagesEl.value) return;
  await nextTick();
  messagesEl.value.scrollTop = messagesEl.value.scrollHeight || 0;
  // Thêm 1 lần scroll nhẹ sau khi layout ổn định (tránh trường hợp DOM render chậm)
  setTimeout(() => {
    if (!messagesEl.value) return;
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight || 0;
  }, 50);
}

async function loadThreadMessages() {
  if (!threadId.value) return;
  try {
    const res = await $fetch(`/api/support/threads/${threadId.value}`);
    if (res?.success && Array.isArray(res.messages)) {
      messages.value = res.messages;
      scrollToBottom();
      if (res.messages.length) {
        const last = res.messages[res.messages.length - 1];
        const lastAt = new Date(last.created_at || last.createdAt).getTime();
        if (open.value) {
          lastSeenAt.value = lastAt;
          unreadCount.value = 0;
          saveLastSeenToStorage(threadId.value, lastSeenAt.value);
        } else {
          const newer = res.messages.filter((m) => {
            const ts = new Date(m.created_at || m.createdAt).getTime();
            return ts > lastSeenAt.value;
          });
          unreadCount.value = newer.length;
        }
      } else {
        unreadCount.value = 0;
      }
    }
  } catch {
    // ignore
  }
}

async function initBubble() {
  // Icon luôn hiện, nhưng chỉ user mới load thread chat
  try {
    if (roleCookie.value === "user" && !threadId.value) {
      const res = await $fetch("/api/users/my-admin-contact");
      const data = res?.success ? res.data || {} : {};
      adminName.value = data.adminName || "";

      // Tạo hoặc lấy thread chat tài khoản (nếu có thể)
      try {
        const threadRes = await $fetch("/api/support/thread", {
          method: "POST",
          body: { topic: "account" },
        });
        if (threadRes?.success && threadRes.threadId) {
          threadId.value = threadRes.threadId;
          lastSeenAt.value = loadLastSeenFromStorage(threadId.value);
          await loadThreadMessages();
          setupWebSocket();
        }
      } catch {
        // nếu tạo thread lỗi thì vẫn giữ bong bóng, chỉ là chưa chat được
      }
    }
    visible.value = true;
  } catch {
    // Nếu API lỗi, vẫn cho hiện bong bóng (để user biết có hỗ trợ),
    // nhưng threadId sẽ null nên không gửi được tin.
    visible.value = true;
  }
}

function setupWebSocket() {
  if (typeof window === "undefined") return;
  if (!threadId.value) return;

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  wsManuallyClosed = false;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/support`;

  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
    if (threadId.value) {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          threadId: threadId.value,
        }),
      );
    }
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (
        data.type === "support_message" &&
        data.threadId === threadId.value &&
        data.message
      ) {
        messages.value.push(data.message);
        scrollToBottom();
        const lastAt = new Date(
          data.message.created_at || data.message.createdAt,
        ).getTime();
        if (open.value) {
          lastSeenAt.value = lastAt;
          unreadCount.value = 0;
          saveLastSeenToStorage(threadId.value, lastSeenAt.value);
        } else if (lastAt > lastSeenAt.value) {
          unreadCount.value += 1;
        }
      }
    } catch {
      // ignore
    }
  });

  ws.addEventListener("close", () => {
    ws = null;
    if (!wsManuallyClosed) {
      wsReconnectTimer = setTimeout(() => {
        setupWebSocket();
      }, 5000);
    }
  });

  ws.addEventListener("error", () => {
    try {
      ws && ws.close();
    } catch {
      // ignore
    }
  });
}

async function toggleBubble() {
  if (roleCookie.value !== "user") {
    const { show: showToast } = useToast();
    const route = useRoute();
    showToast("Vui lòng đăng nhập để chat với admin.", "info");
    navigateTo(`/login?next=${route.fullPath || "/"}`);
    return;
  }
  open.value = !open.value;
  if (open.value) {
    if (!threadId.value) {
      await initBubble();
    }
    await scrollToBottom();
    // khi mở thì đánh dấu đã đọc
    if (messages.value.length) {
      const last = messages.value[messages.value.length - 1];
      const lastAt = new Date(last.created_at || last.createdAt).getTime();
      lastSeenAt.value = lastAt;
      unreadCount.value = 0;
      saveLastSeenToStorage(threadId.value, lastSeenAt.value);
      setupWebSocket();
    }
  }
}

async function sendMessage() {
  if (!threadId.value || !draft.value.trim() || sending.value) return;
  const text = draft.value.trim();
  sending.value = true;
  try {
    await $fetch("/api/support/messages", {
      method: "POST",
      body: { thread_id: threadId.value, content: text },
    });
    draft.value = "";
  } catch {
    // ignore
  } finally {
    sending.value = false;
  }
}

onMounted(async () => {
  visible.value = true;
  if (roleCookie.value === "user") {
    await initBubble();
  }
});

watch(
  () => open.value,
  (val) => {
    if (val) {
      scrollToBottom();
    }
  },
);

watch(
  () => messages.value.length,
  () => {
    if (open.value) {
      scrollToBottom();
    }
  },
);

// Nếu user login sau khi trang đã load (ví dụ login bằng modal),
// khi cookie đổi sang 'user' thì tự khởi tạo thread chat.
watch(
  () => roleCookie.value,
  async (val, oldVal) => {
    if (val === "user" && oldVal !== "user") {
      // reset state khi chuyển từ khách / admin sang user mới
      threadId.value = null;
      messages.value = [];
      lastSeenAt.value = 0;
      unreadCount.value = 0;
      await initBubble();
      if (open.value) {
        await scrollToBottom();
      }
    } else if (val !== "user" && oldVal === "user") {
      // logout hoặc chuyển sang admin: xoá thread hiện tại
      threadId.value = null;
      messages.value = [];
      lastSeenAt.value = 0;
      unreadCount.value = 0;
    }
  },
);

onUnmounted(() => {
  wsManuallyClosed = true;
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
    ws = null;
  }
});
</script>

<style scoped>
.contact-bubble {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.bubble-btn {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid rgb(var(--accent-rgb) / 0.65);
  background:
    radial-gradient(circle at 0 0, rgb(var(--accent-rgb) / 0.35), transparent 55%),
    rgba(5, 15, 35, 0.98);
  color: #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 22px rgb(var(--accent-rgb) / 0.6),
    0 12px 30px rgba(15, 23, 42, 0.95);
}

.bubble-icon {
  font-size: 1.3rem;
}

.bubble-unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bubble-panel {
  width: 320px;
  border-radius: 16px;
  border: 1px solid rgb(var(--accent-rgb) / 0.55);
  background: rgba(5, 15, 35, 0.98);
  box-shadow:
    0 0 26px rgb(var(--accent-rgb) / 0.4),
    0 16px 40px rgba(15, 23, 42, 0.95);
  padding: 10px 12px 10px;
}

.bubble-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.bubble-title {
  font-size: 0.86rem;
  font-weight: 600;
}

.bubble-subtitle {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.bubble-close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
}

.bubble-admin {
  margin: 0 0 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.bubble-text {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.bubble-chat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bubble-messages {
  height: 200px;
  overflow-y: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-messages::-webkit-scrollbar {
  width: 3px;
}

.bubble-messages::-webkit-scrollbar-track {
  background: transparent;
}

.bubble-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}

.bubble-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.bubble-message {
  align-self: flex-start;
  max-width: 90%;
}

.bubble-message--mine {
  align-self: flex-end;
}

.bubble-message-content {
  padding: 6px 9px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(51, 65, 85, 0.9);
  font-size: 0.82rem;
}

.bubble-message--mine .bubble-message-content {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.95),
    rgba(56, 189, 248, 0.95)
  );
  border-color: rgba(59, 130, 246, 0.9);
  color: #e5f3ff;
}

.bubble-empty {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.bubble-input-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.bubble-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.82rem;
  padding: 6px 10px;
}

.bubble-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

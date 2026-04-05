<template>
  <div class="community-chat">
    <div class="chat-header"></div>

    <div class="chat-box">
      <div ref="messagesEl" class="chat-messages">
        <div
          v-for="m in messages"
          :key="m.id"
          class="chat-row"
          :class="{
            'chat-row--mine': isMine(m),
            'chat-row--other': !isMine(m),
          }"
        >
          <div
            class="chat-avatar"
            :class="{
              'chat-avatar--mine': isMine(m),
              'chat-avatar--admin': (m.authorRole === 'admin_support' || m.authorRole === 'admin_2'),
            }"
          >
            <span>{{ m.authorName?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <div
            class="chat-message"
            :class="{
              'chat-message--mine': isMine(m),
              'chat-message--other': !isMine(m),
              'chat-message--admin': (m.authorRole === 'admin_support' || m.authorRole === 'admin_2'),
            }"
          >
            <div class="chat-meta">
              <span
                class="chat-name"
                :class="{
                  'chat-name--admin': (m.authorRole === 'admin_support' || m.authorRole === 'admin_2'),
                }"
              >
                {{ m.authorName }}
                <span v-if="(m.authorRole === 'admin_support' || m.authorRole === 'admin_2')" class="chat-admin-tag"
                  >(admin)</span
                >
              </span>
              <span class="chat-time">{{ formatTime(m.createdAt) }}</span>
            </div>
            <div class="chat-content">
              <img
                v-if="m.imageUrl"
                :src="m.imageUrl"
                class="chat-image"
                alt="Ảnh"
                loading="lazy"
              />
              <span v-if="m.content">{{ m.content }}</span>
            </div>
          </div>
        </div>
        <div v-if="!messages.length" class="chat-empty">
          Chưa có tin nhắn nào. Hãy là người đầu tiên gửi tin nhé!
        </div>
      </div>

      <div class="chat-input-row">
        <button
          type="button"
          class="chat-icon-btn"
          :disabled="sending"
          :aria-pressed="showIconPicker ? 'true' : 'false'"
          aria-label="Chọn icon"
          @click="toggleIconPicker"
        >
          😊
        </button>
        <button
          type="button"
          class="chat-icon-btn"
          :disabled="sending || !isLoggedIn || uploadingImage"
          aria-label="Gửi ảnh"
          @click="triggerImagePick"
        >
          📷
        </button>
        <input
          ref="fileInputEl"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onFileSelected"
        />
        <input
          v-model="draft"
          class="chat-input"
          type="text"
          :placeholder="
            isLoggedIn
              ? 'Nhập tin nhắn...'
              : 'Đăng nhập để tham gia chat cộng đồng'
          "
          :disabled="sending || !isLoggedIn"
          @keyup.enter="handleSend"
          @paste="onPasteImage"
        />
        <button
          type="button"
          class="chat-send-btn"
          :disabled="sending || !isLoggedIn || !draft.trim()"
          @click="handleSend"
        >
          Gửi
        </button>
      </div>

      <div v-if="showIconPicker" class="chat-icon-picker">
        <ClientOnly>
          <emoji-picker
            class="chat-emoji-picker"
            @emoji-click="handleEmojiClick"
          ></emoji-picker>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup>
const messages = ref([]);
const draft = ref("");
const sending = ref(false);
const uploadingImage = ref(false);
const messagesEl = ref(null);
const fileInputEl = ref(null);

const me = ref(null);
// auth_token là httpOnly nên client không tự đọc được; dùng user_role để biết đã login.
const userRoleCookie = useCookie("user_role", { path: "/" });
const isLoggedIn = computed(() => !!userRoleCookie.value || !!me.value);

const showIconPicker = ref(false);

let ws;
let reconnectTimer;
let manuallyClosed = false;
let wsConnected = false;

function isMine(m) {
  if (!me.value) return false;
  return Number(m.authorId) === Number(me.value.id);
}

function scrollToBottom() {
  if (!messagesEl.value) return;
  requestAnimationFrame(() => {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight || 0;
  });
}

function formatTime(val) {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toggleIconPicker() {
  if (sending.value) return;
  showIconPicker.value = !showIconPicker.value;
}

function appendEmoji(emojiUnicode) {
  const text = String(emojiUnicode || "").trim();
  if (!text) return;
  const needSpace = draft.value && !/\s$/.test(draft.value);
  draft.value = `${draft.value}${needSpace ? " " : ""}${text}`;
}

function handleEmojiClick(event) {
  // event.detail format example:
  // { emoji: {...}, skinTone: 0, unicode: "😀" }
  const detail = event?.detail;
  const unicode =
    detail?.unicode ||
    detail?.emoji?.unicode ||
    // fallback: sometimes only "unicode" exists
    detail?.emoji?.unicode;

  appendEmoji(unicode);
  showIconPicker.value = false;
}

async function loadMe() {
  try {
    const res = await $fetch("/api/auth/me");
    if (res?.success && res.user) {
      me.value = res.user;
    }
  } catch {
    me.value = null;
  }
}

// Khi login xảy ra sau khi component đã mount (ví dụ login modal),
// user_role cookie sẽ thay đổi nhưng auth_token (httpOnly) không tự cập nhật vào client.
// Ta ưu tiên bật UI theo user_role, còn me sẽ cố load lại để hiển thị đúng thông tin.
watch(
  () => userRoleCookie.value,
  async (val) => {
    if (val && !me.value) {
      await loadMe();
    }
  },
);

async function loadHistory() {
  try {
    const res = await $fetch("/api/chat/messages");
    if (Array.isArray(res)) {
      messages.value = res;
      scrollToBottom();
    }
  } catch {
    // ignore
  }
}

async function handleSend() {
  if (!isLoggedIn.value) return;
  const text = draft.value.trim();
  if (!text) return;
  await sendChatMessage({ contentText: text });
}

function triggerImagePick() {
  if (sending.value) return;
  fileInputEl.value?.click();
}

async function sendChatMessage({
  contentText,
  imageUrl = "",
}) {
  if (!isLoggedIn.value) return;
  const text = String(contentText || "").trim();
  const safeImageUrl = String(imageUrl || "").trim();
  if (!text && !safeImageUrl) return;

  sending.value = true;
  showIconPicker.value = false;
  try {
    if (ws && ws.readyState === WebSocket.OPEN && wsConnected) {
      ws.send(
        JSON.stringify({
          type: "message",
          content: text,
          imageUrl: safeImageUrl || undefined,
        }),
      );
      draft.value = "";
    } else {
      // Fallback HTTP giúp vẫn gửi được khi WS đang reconnect/chưa kịp mở.
      await $fetch("/api/chat/messages", {
        method: "POST",
        body: { content: text, imageUrl: safeImageUrl || undefined },
      });
      draft.value = "";
      await loadHistory();
      setupWebSocket();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("send chat failed", e);
  } finally {
    sending.value = false;
  }
}

async function onFileSelected(e) {
  const input = e?.target;
  const file = input?.files?.[0];
  if (!file) return;

  // Basic guard: chỉ nhận ảnh.
  if (!file.type?.startsWith("image/")) return;

  try {
    await handleSelectedImageFile(file);
  } finally {
    if (input) input.value = "";
  }
}

function getImageFileFromClipboardData(clipboardData) {
  if (!clipboardData) return null;

  // Thường gặp nhất: clipboardData.items
  const items = clipboardData.items;
  if (items && items.length) {
    for (const item of Array.from(items)) {
      const kind = item?.kind;
      const type = item?.type;
      if (kind === "file" && type && String(type).startsWith("image/")) {
        const file = item.getAsFile?.();
        if (file) return file;
      }
    }
  }

  // Fallback: clipboardData.files
  const files = clipboardData.files;
  if (files && files.length) {
    const file = files[0];
    if (file && file.type && String(file.type).startsWith("image/")) return file;
  }

  return null;
}

async function handleSelectedImageFile(file) {
  uploadingImage.value = true;
  try {
    const fd = new FormData();
    fd.append("file", file);

    const res = await $fetch("/api/upload/chat-image", {
      method: "POST",
      body: fd,
    });

    const url = String(res?.url || "");
    if (!url) return;

    // Nếu đang có text thì gửi kèm làm caption.
    const caption = draft.value.trim();
    await sendChatMessage({ contentText: caption, imageUrl: url });
  } finally {
    uploadingImage.value = false;
  }
}

async function onPasteImage(e) {
  if (!isLoggedIn.value) return;
  const file = getImageFileFromClipboardData(e?.clipboardData);
  if (!file) return;

  // Chặn paste text, thay bằng upload ảnh.
  e.preventDefault();
  await handleSelectedImageFile(file);
}

function setupWebSocket() {
  if (typeof window === "undefined") return;
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  manuallyClosed = false;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/community`;

  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    wsConnected = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "history" && Array.isArray(data.messages)) {
        messages.value = data.messages;
        scrollToBottom();
      } else if (data.type === "message" && data.message) {
        messages.value.push(data.message);
        scrollToBottom();
      }
    } catch {
      // ignore
    }
  });

  ws.addEventListener("close", () => {
    wsConnected = false;
    ws = null;
    if (!manuallyClosed) {
      reconnectTimer = setTimeout(() => {
        setupWebSocket();
      }, 3000);
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

onMounted(async () => {
  // emoji-picker-element is a web component that must be loaded on client only.
  await import("emoji-picker-element");
  await loadMe();
  await loadHistory();
  setupWebSocket();
});

onUnmounted(() => {
  manuallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
    wsConnected = false;
    ws = null;
  }
});
</script>

<style scoped>
.chat-title {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 650;
}

.chat-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.chat-box {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  background:
    radial-gradient(
      circle at top left,
      rgba(56, 189, 248, 0.12),
      transparent 60%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(59, 130, 246, 0.18),
      rgba(15, 23, 42, 0.95)
    );
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  box-shadow:
    0 0 25px rgb(var(--accent-rgb) / 0.45),
    0 12px 40px rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(16px);
}

.chat-messages {
  height: 360px;
  padding: 10px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}
.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.chat-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: chat-pop-in 0.18s ease-out;
}

.chat-row--mine {
  justify-content: flex-end;
}

.chat-row--mine .chat-avatar {
  order: 2;
}

.chat-row--mine .chat-message {
  order: 1;
}

.chat-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #22c55e, #064e3b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #e5f3ff;
  flex-shrink: 0;
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.8),
    0 4px 12px rgba(15, 23, 42, 0.85);
}

.chat-avatar--mine {
  background: radial-gradient(circle at 30% 20%, #38bdf8, #1d4ed8);
}

.chat-avatar--admin {
  background: radial-gradient(circle at 30% 20%, #f97373, #7f1d1d);
}

.chat-message {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(51, 65, 85, 0.9);
  max-width: 90%;
  display: inline-block;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.85);
  position: relative;
}

.chat-message--other {
  align-self: flex-start;
  border-top-left-radius: 2px;
}

.chat-message--mine {
  align-self: flex-end;
  border-top-right-radius: 2px;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.95),
    rgba(56, 189, 248, 0.95)
  );
  border-color: rgba(59, 130, 246, 0.9);
  border-bottom-right-radius: 14px;
}

.chat-message--admin:not(.chat-message--mine) {
  border-color: rgba(248, 113, 113, 0.9);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.4);
}

.chat-message--admin::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(248, 113, 113, 0.4);
  opacity: 0.35;
  pointer-events: none;
}

.chat-name {
  font-weight: 600;
  font-size: 0.85rem;
  margin-right: 6px;
}

.chat-name--admin {
  color: #f97373;
}

.chat-admin-tag {
  font-size: 0.8rem;

  border-radius: 999px;
  background: rgba(248, 113, 113, 0.15);
}

.chat-time {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.chat-content {
  margin-top: 2px;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: pre-wrap;
  line-height: 1.5;
}

.chat-image {
  max-width: 240px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 12px;
  display: block;
  margin-bottom: 6px;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.chat-message--mine .chat-name,
.chat-message--mine .chat-time,
.chat-message--mine .chat-content {
  color: #e5f3ff;
}

/* Giữ tên admin màu đỏ kể cả khi là bubble của mình */
.chat-message--mine .chat-name--admin {
  color: rgb(255, 0, 0);
}

@keyframes chat-pop-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.chat-empty {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.chat-input-row {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid rgba(30, 64, 175, 0.8);
  background: radial-gradient(
    circle at 0 0,
    rgba(59, 130, 246, 0.35),
    transparent 55%
  );
}

.chat-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.8);
  background: rgba(15, 23, 42, 0.96);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.8);
  background: rgba(15, 23, 42, 0.96);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.chat-input:disabled {
  opacity: 0.6;
}

.chat-send-btn {
  padding: 8px 12px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.chat-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-icon-picker {
  padding: 10px 10px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
  display: block;
  max-height: 280px;
  overflow-y: auto;
}

.chat-emoji-picker {
  width: 100%;
  height: 240px;
}

@media (max-width: 640px) {
  .chat-messages {
    height: 300px;
    padding: 8px;
  }
  .chat-message {
    max-width: 96%;
  }
  .chat-content {
    font-size: 0.84rem;
    line-height: 1.4;
  }
  .chat-image {
    max-width: 170px;
    max-height: 170px;
  }
  .chat-icon-btn {
    width: 34px;
    height: 34px;
  }
  .chat-send-btn {
    padding: 8px 10px;
    font-size: 0.84rem;
  }
}
</style>

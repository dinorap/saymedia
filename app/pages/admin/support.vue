<template>
  <div class="support-page">
    <div class="support-sidebar">
      <div class="support-header">
        <h2 class="support-title">
          {{ $t("admin.supportChat") || "Chat hỗ trợ" }}
        </h2>
        <div v-if="isSuperAdmin" class="support-tabs">
          <button
            type="button"
            class="support-tab"
            :class="{ 'support-tab--active': scope === 'mine' }"
            @click="changeScope('mine')"
          >
            {{ $t("admin.supportMyCustomers") }}
          </button>
          <button
            type="button"
            class="support-tab"
            :class="{ 'support-tab--active': scope === 'all' }"
            @click="changeScope('all')"
          >
            {{ $t("admin.supportAllCustomers") }}
          </button>
        </div>
        <div class="support-filters-row">
          <div class="support-filters">
            <select v-model="topicFilter" class="support-filter-select">
              <option value="all">
                {{ $t("admin.supportTopicAll") }}
              </option>
              <option value="account">
                {{ $t("admin.supportTopicAccount") }}
              </option>
              <option value="product">
                {{ $t("admin.supportTopicProduct") }}
              </option>
            </select>
          </div>
          <input
            v-model="searchTerm"
            type="text"
            class="support-search-input"
            :placeholder="$t('admin.supportSearchPlaceholder')"
          />
        </div>
      </div>
      <div class="support-thread-list">
        <button
          v-for="t in filteredThreads"
          :key="t.id"
          type="button"
          class="support-thread-item"
          :class="{ 'support-thread-item--active': t.id === activeThreadId }"
          @click="selectThread(t.id)"
        >
          <div class="support-thread-main">
            <div class="support-thread-user">
              {{ t.user_username || "User #" + t.user_id }}
            </div>
            <div class="support-thread-meta">
              <span class="support-thread-topic">
                {{ t.topic === "product" ? "Sản phẩm" : "Tài khoản" }}
              </span>
              <span v-if="t.product_name" class="support-thread-product">
                {{ t.product_name }}
              </span>
            </div>
            <div class="support-thread-admin">
              {{ $t("admin.supportAdminLabel") }}:
              <strong>
                {{ t.admin_username || "#" + t.admin_id }}
              </strong>
            </div>
          </div>
          <div class="support-thread-time">
            {{ formatTime(t.last_message_at) }}
            <span v-if="unreadMap[t.id]" class="support-thread-unread">
              {{ unreadMap[t.id] }}
            </span>
          </div>
        </button>
        <p v-if="!threads.length" class="support-empty">
          {{ $t("admin.supportNoThreads") }}
        </p>
      </div>
    </div>
    <div class="support-chat">
      <div v-if="!activeThread" class="support-chat-empty">
        {{ $t("admin.supportSelectThread") }}
      </div>
      <div v-else class="support-chat-inner">
        <header class="support-chat-header">
          <div>
            <div class="support-chat-user">
              {{
                activeThread.user_username || "User #" + activeThread.user_id
              }}
            </div>
            <div class="support-chat-subtitle">
              {{
                activeThread.topic === "product"
                  ? $t("admin.supportContactProduct")
                  : $t("admin.supportContactAccount")
              }}
              <span v-if="activeThread.product_name">
                · {{ activeThread.product_name }}
              </span>
            </div>
          </div>
        </header>
        <main ref="messagesEl" class="support-chat-messages">
          <div
            v-for="m in messages"
            :key="m.id"
            class="support-msg"
            :class="{
              'support-msg--mine': m.sender_type === 'admin',
            }"
          >
            <div v-if="m.imageUrl" class="support-image-wrap">
              <img
                :src="m.imageUrl"
                class="support-chat-image"
                alt="Ảnh"
                loading="lazy"
              />
              <div v-if="m.content" class="support-msg-content">
                {{ m.content }}
              </div>
            </div>
            <div v-else class="support-msg-content">
              <span v-if="m.content">{{ m.content }}</span>
            </div>
          </div>
          <p v-if="!messages.length" class="support-empty">
            {{ $t("admin.supportNoMessages") }}
          </p>
        </main>
        <footer class="support-chat-input-row">
          <button
            type="button"
            class="support-icon-btn"
            :disabled="sending"
            aria-label="Chọn icon"
            @click="toggleIconPicker"
          >
            😊
          </button>
          <button
            type="button"
            class="support-icon-btn"
            :disabled="sending || uploadingImage"
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
            type="text"
            class="support-input"
            :placeholder="$t('admin.supportInputPlaceholder')"
            @keyup.enter="sendMessage"
            @paste="onPasteImage"
          />
          <button
            type="button"
            class="support-send-btn"
            :disabled="sending || !draft.trim()"
            @click="sendMessage"
          >
            {{ $t("admin.supportSend") }}
          </button>
        </footer>
        <div v-if="showIconPicker" class="support-icon-picker">
          <ClientOnly>
            <emoji-picker
              class="support-emoji-picker"
              @emoji-click="handleEmojiClick"
            ></emoji-picker>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] });

const roleCookie = useCookie("user_role", { path: "/" });
const isSuperAdmin = computed(() => roleCookie.value === "admin_0");

const threads = ref([]);
const activeThreadId = ref(null);
const activeThread = ref(null);
const messages = ref([]);
const draft = ref("");
const sending = ref(false);
const uploadingImage = ref(false);
const fileInputEl = ref(null);
const showIconPicker = ref(false);
const messagesEl = ref(null);
const scope = ref("mine"); // 'mine' | 'all' (only for admin_0)
const lastSeenMap = ref({});
const unreadMap = ref({});

const topicFilter = ref("all"); // 'all' | 'account' | 'product'
const searchTerm = ref("");

let ws = null;
let wsReconnectTimer = null;
let wsManuallyClosed = false;
let wsConnected = false;

function subscribeActiveThread() {
  if (!activeThreadId.value) return;
  if (!ws || ws.readyState !== WebSocket.OPEN || !wsConnected) return;
  try {
    ws.send(
      JSON.stringify({
        type: "subscribe",
        threadId: activeThreadId.value,
      }),
    );
  } catch {
    // ignore
  }
}

async function loadThreads() {
  try {
    const params = [];
    if (scope.value === "all" && isSuperAdmin.value) {
      params.push("scope=all");
    }
    const query = params.length ? `?${params.join("&")}` : "";
    const res = await $fetch(`/api/support/threads${query}`);
    if (res?.success && Array.isArray(res.data)) {
      threads.value = res.data;
      // Ghi nhận mốc lastSeen lần đầu cho từng thread, để về sau WS tính số chưa đọc.
      for (const t of threads.value) {
        const id = Number(t.id);
        if (!id || !t.last_message_at) continue;
        const lastAt = new Date(t.last_message_at).getTime();
        if (lastSeenMap.value[id] === undefined) {
          lastSeenMap.value[id] = lastAt;
        }
        if (unreadMap.value[id] === undefined) {
          unreadMap.value[id] = 0;
        }
      }
      if (activeThreadId.value) {
        // đang xem 1 thread cụ thể: refresh nội dung thread đó
        await loadActiveThread();
      } else if (!activeThreadId.value && threads.value.length) {
        // lần đầu vào: tự chọn thread mới nhất
        activeThreadId.value = threads.value[0].id;
        await loadActiveThread();
      }
    }
  } catch {
    threads.value = [];
  }
}

const filteredThreads = computed(() => {
  let list = threads.value || [];

  if (topicFilter.value !== "all") {
    list = list.filter((t) => t.topic === topicFilter.value);
  }

  const term = searchTerm.value.trim().toLowerCase();
  if (term) {
    list = list.filter((t) => {
      const userName = String(
        t.user_username || `User #${t.user_id || ""}`,
      ).toLowerCase();
      const adminName = String(
        t.admin_username || `#${t.admin_id || ""}`,
      ).toLowerCase();
      const productName = String(t.product_name || "").toLowerCase();
      return (
        userName.includes(term) ||
        adminName.includes(term) ||
        productName.includes(term)
      );
    });
  }

  return list;
});

function changeScope(next) {
  if (!isSuperAdmin.value) return;
  if (scope.value === next) return;
  scope.value = next;
  activeThreadId.value = null;
  activeThread.value = null;
  messages.value = [];
  loadThreads();
}

async function loadActiveThread() {
  if (!activeThreadId.value) return;
  try {
    const res = await $fetch(`/api/support/threads/${activeThreadId.value}`);
    if (res?.success) {
      activeThread.value = res.thread;
      messages.value = res.messages || [];
      // đánh dấu đã đọc thread hiện tại
      if (res.thread?.last_message_at) {
        const lastAt = new Date(res.thread.last_message_at).getTime();
        const tid = Number(activeThreadId.value);
        if (!Number.isNaN(tid)) {
          lastSeenMap.value[tid] = lastAt;
          unreadMap.value[tid] = false;
        }
      }
      await scrollToBottom();
    }
  } catch {
    activeThread.value = null;
    messages.value = [];
  }
}

async function setupWebSocket() {
  if (typeof window === "undefined") return;

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  wsManuallyClosed = false;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  let wsAuthToken = "";
  try {
    const res = await $fetch("/api/support/ws-token");
    wsAuthToken = String(res?.token || "");
  } catch {
    wsAuthToken = "";
  }
  if (!wsAuthToken) {
    if (!wsManuallyClosed) {
      wsReconnectTimer = setTimeout(() => {
        setupWebSocket();
      }, 3000);
    }
    return;
  }
  const query = `?ws_token=${encodeURIComponent(wsAuthToken)}`;
  const url = `${protocol}://${window.location.host}/ws/support${query}`;

  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    wsConnected = true;
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
    if (wsAuthToken) {
      ws.send(
        JSON.stringify({
          type: "auth",
          token: wsAuthToken,
        }),
      );
    }
    subscribeActiveThread();
  });

  ws.addEventListener("message", async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "support_message" && data.threadId && data.message) {
        const tid = Number(data.threadId);
        if (!tid || Number.isNaN(tid)) return;

        const existing = threads.value.find((t) => Number(t.id) === tid);

        if (!existing) {
          try {
            const res = await $fetch(`/api/support/threads/${tid}`);
            if (res?.success && res.thread) {
              threads.value = [res.thread, ...threads.value];
            }
          } catch {
            // ignore
          }
        } else {
          existing.last_message_at =
            data.message.created_at ||
            data.message.createdAt ||
            existing.last_message_at;
          // đưa thread vừa có tin mới lên đầu danh sách
          threads.value = [
            existing,
            ...threads.value.filter((t) => Number(t.id) !== tid),
          ];
        }

        if (tid === Number(activeThreadId.value)) {
          messages.value.push(data.message);
          scrollToBottom();
          const lastAt = new Date(
            data.message.created_at || data.message.createdAt,
          ).getTime();
          if (!Number.isNaN(lastAt)) {
            lastSeenMap.value[tid] = lastAt;
            unreadMap.value[tid] = 0;
          }
        } else {
          unreadMap.value[tid] = (unreadMap.value[tid] || 0) + 1;
        }
      }
    } catch {
      // ignore
    }
  });

  ws.addEventListener("close", () => {
    wsConnected = false;
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

async function scrollToBottom() {
  if (!messagesEl.value) return;
  await nextTick();
  messagesEl.value.scrollTop = messagesEl.value.scrollHeight || 0;
  // đảm bảo sau khi layout ổn định vẫn cuộn đúng cuối
  setTimeout(() => {
    if (!messagesEl.value) return;
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight || 0;
  }, 50);
}

function selectThread(id) {
  if (activeThreadId.value === id) return;
  activeThreadId.value = id;
  unreadMap.value[id] = 0;
  loadActiveThread();
  subscribeActiveThread();
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
  const detail = event?.detail;
  const unicode = detail?.unicode || detail?.emoji?.unicode;
  appendEmoji(unicode);
  showIconPicker.value = false;
}

function triggerImagePick() {
  if (sending.value || uploadingImage.value) return;
  fileInputEl.value?.click();
}

async function onFileSelected(e) {
  const input = e.target;
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type?.startsWith("image/")) return;
  try {
    await handleSelectedImageFile(file);
  } finally {
    if (input) input.value = "";
  }
}

function getImageFileFromClipboardData(clipboardData) {
  if (!clipboardData) return null;
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
  const files = clipboardData.files;
  if (files && files.length) {
    const file = files[0];
    if (file && file.type && String(file.type).startsWith("image/")) return file;
  }
  return null;
}

async function handleSelectedImageFile(file) {
  if (!activeThreadId.value || sending.value) return;
  if (!file?.type?.startsWith("image/")) return;

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

    const caption = draft.value.trim();
    await sendSupportMessage({ contentText: caption, imageUrl: url });
  } finally {
    uploadingImage.value = false;
  }
}

async function onPasteImage(e) {
  if (sending.value || uploadingImage.value) return;
  if (!activeThreadId.value) return;

  const file = getImageFileFromClipboardData(e?.clipboardData);
  if (!file) return;

  e.preventDefault();
  await handleSelectedImageFile(file);
}

async function sendSupportMessage({
  contentText,
  imageUrl = "",
}) {
  if (!activeThreadId.value || sending.value) return;

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
          threadId: activeThreadId.value,
          content: text,
          imageUrl: safeImageUrl || undefined,
        }),
      );
      draft.value = "";
    } else {
      await $fetch("/api/support/messages", {
        method: "POST",
        body: {
          thread_id: activeThreadId.value,
          content: text,
          imageUrl: safeImageUrl || undefined,
        },
      });
      draft.value = "";
      // fallback khi WS chưa mở/đứt tạm thời: reload để thấy tin nhắn ngay.
      await loadActiveThread();
      await loadThreads();
    }
  } catch {
    // ignore
  } finally {
    sending.value = false;
  }
}

async function sendMessage() {
  if (!activeThreadId.value || sending.value) return;
  const text = draft.value.trim();
  if (!text) return;
  await sendSupportMessage({ contentText: text });
}

onMounted(async () => {
  // emoji-picker-element is a web component: load only on client.
  await import("emoji-picker-element");
  loadThreads();
  setupWebSocket();
});

watch(
  () => activeThreadId.value,
  () => {
    subscribeActiveThread();
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
    wsConnected = false;
    ws = null;
  }
});
</script>

<style scoped>
.support-page {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 1rem;
  /* Giới hạn chiều cao vùng chat trong khung nhìn, phần dư sẽ cuộn bên trong */
  height: calc(100vh - 140px);
  overflow: hidden;
}

.support-sidebar {
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(30, 64, 175, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.support-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.support-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.support-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(37, 99, 235, 0.7);
}

.support-tab {
  flex: 1 1 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding: 4px 0;
  cursor: pointer;
}

.support-tab--active {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.95),
    rgba(56, 189, 248, 0.95)
  );
  color: #e5f3ff;
}

.support-filters {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.support-filters-row {
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.support-filter-select {
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.78rem;
  padding: 4px 8px;
}

.support-search-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.8rem;
  padding: 6px 10px;
}

.support-thread-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.support-thread-list::-webkit-scrollbar {
  width: 4px;
}

.support-thread-list::-webkit-scrollbar-track {
  background: transparent;
}

.support-thread-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}

.support-thread-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.support-thread-item {
  width: 100%;
  border-radius: 10px;
  border: none;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}

.support-thread-item--active {
  background: rgba(30, 64, 175, 0.9);
}

.support-thread-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.support-thread-user {
  font-size: 0.9rem;
  font-weight: 600;
}

.support-thread-meta {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.support-thread-admin {
  margin-top: 1px;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.support-thread-time {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.support-thread-unread {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.support-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.support-chat {
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(30, 64, 175, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.support-chat-empty {
  margin: auto;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.support-chat-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.support-chat-header {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(30, 64, 175, 0.8);
  margin-bottom: 0.5rem;
}

.support-chat-user {
  font-size: 1rem;
  font-weight: 600;
}

.support-chat-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.support-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.support-chat-messages::-webkit-scrollbar {
  width: 4px;
}

.support-chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.support-chat-messages::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.6);
  border-radius: 999px;
}

.support-chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.9);
}

.support-msg {
  align-self: flex-start;
  max-width: 80%;
}

.support-msg--mine {
  align-self: flex-end;
}

.support-msg-content {
  padding: 6px 9px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(51, 65, 85, 0.9);
  font-size: 0.82rem;
  line-height: 1.45;
}

.support-chat-image {
  max-width: 260px;
  max-height: 260px;
  width: auto;
  height: auto;
  border-radius: 10px;
  display: block;
  margin: 0 0 6px;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.support-image-wrap {
  /* Không dùng background/padding của support-msg-content cho phần ảnh */
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.support-msg--mine .support-msg-content {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.95),
    rgba(56, 189, 248, 0.95)
  );
  border-color: rgba(59, 130, 246, 0.9);
  color: #e5f3ff;
}

.support-chat-input-row {
  display: flex;
  gap: 6px;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(30, 64, 175, 0.8);
}

.support-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.65);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.support-icon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.support-icon-picker {
  padding: 10px 10px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
  display: block;
  max-height: 280px;
  overflow-y: auto;
}

.support-emoji-picker {
  width: 100%;
  height: 240px;
}

.support-input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.9);
  background: rgba(15, 23, 42, 0.98);
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 8px 12px;
}

.support-send-btn {
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.support-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

# Báo cáo kiểm tra code – Kiến trúc, Bảo mật & UX

*Ngày: 2025-03-06*

---

## 1. Kiến trúc & hiệu năng

### 1.1 Giỏ hàng: Pinia thay cho useState/Ref

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Chưa dùng Pinia | `app/composables/useCart.ts` dùng `useState("cart", () => [])` và đồng bộ thủ công với `localStorage` (watch + setItem). |
| Khuyến nghị | Chuyển sang Pinia | Cài `pinia`, `pinia-plugin-persistedstate`. Tạo store `cart` với `persist: true` (key `cart`). Refactor `useCart()` thành wrapper gọi store. Lợi ích: state tập trung, DevTools, persist tự động. |

**File liên quan:** `app/composables/useCart.ts`; các trang dùng `useCart`: `cart.vue`, `products/index.vue`, `products/[id].vue`, `SiteHeader.vue` (count).

---

### 1.2 Lazy loading cho Modal

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Import tĩnh | `AuthModal`, `PaymentModal`, `ConfirmPurchaseModal` được import trực tiếp trong từng page (ví dụ `import ConfirmPurchaseModal from "~/components/product/ConfirmPurchaseModal.vue"`). |
| Khuyến nghị | Lazy load | Dùng `defineAsyncComponent(() => import('~/components/...'))` hoặc trong template `<component :is="..." />` với import động. Áp dụng cho: `AuthModal`, `LoginModal`/`RegisterModal` (nếu dùng trực tiếp), `PaymentModal`, `ConfirmPurchaseModal`, `AuthForgotPasswordModal`, `OrderHistoryModal`, `PaymentHistoryModal`, `CreditLedgerModal`, `ProfileDepositModal`. |

**Vị trí:**  
- `app/pages/profile.vue` → PaymentModal  
- `app/pages/products/index.vue`, `products/[id].vue`, `cart.vue` → ConfirmPurchaseModal  
- Các layout/page dùng Auth/Login/Register modal.

---

### 1.3 Tối ưu hình ảnh (Nuxt Image)

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Chưa dùng | Không có `@nuxt/image` trong `package.json` và `nuxt.config.ts`. Ảnh dùng `<img :src="...">` (product thumb, cart, product detail, admin products). |
| Khuyến nghị | Thêm Nuxt Image | Cài `@nuxt/image`, thêm module vào `nuxt.config`. Thay ảnh sản phẩm (list, detail, cart, admin) bằng `<NuxtImg>` với `loading="lazy"`, format webp nếu backend hỗ trợ. Logo có thể giữ `<img>` hoặc dùng NuxtImg tùy nhu cầu. |

**File ảnh:** `products/index.vue`, `products/[id].vue`, `cart.vue`, `admin/products/index.vue`, `ProfileDepositModal.vue` (QR).

---

## 2. Bảo mật (Security)

### 2.1 Cookie JWT (HttpOnly, Secure, SameSite)

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| auth_token | Đã HttpOnly, Secure (prod) | `server/api/auth/login.post.ts`: `setCookie(..., { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', ... })`. |
| user_role | Không HttpOnly (cố ý) | Cookie `user_role` dùng cho frontend hiển thị menu/UI nên không đặt HttpOnly. |
| SameSite | Đang dùng `lax` | Khuyến nghị chuyển sang `strict` nếu không cần đăng nhập từ link ngoại (email, quảng cáo). Nếu cần OAuth/redirect từ domain khác thì giữ `lax`. |

**Hành động đề xuất:** Đổi `sameSite: 'lax'` → `sameSite: 'strict'` cho cả `auth_token` và `user_role` nếu sản phẩm không có luồng redirect từ bên ngoài.

---

### 2.2 Validation dữ liệu (Backend)

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Validate thủ công | API admin/products: kiểm tra name, price, type, length (MAX_*). API auth: kiểm tra username, email, password. Không dùng Zod/Joi. |
| Khuyến nghị | Chuẩn hóa bằng Zod | Cài `zod`. Tạo schema cho: login, register, send-otp, product create/update, order create, payment. Gọi `schema.parse(body)` hoặc `schema.safeParse` và trả 400 với message rõ ràng. Giữ validation frontend nhưng coi backend là nguồn tin cậy. |

**Vị trí:** `server/api/admin/products.post.ts`, `products/[id].put.ts`, `server/api/auth/login.post.ts`, `register.post.ts`, `send-otp-login.post.ts`, `register/send-otp.post.ts`, `orders/create.post.ts`, v.v.

---

### 2.3 Rate limiting cho OTP

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Chưa có | `server/api/auth/send-otp-login.post.ts` và `server/api/auth/register/send-otp.post.ts` không gọi rate limit. Chỉ có `server/utils/rateLimit.ts` cho **đăng nhập thất bại** (5 lần / 15 phút theo IP). |
| Khuyến nghị | Thêm rate limit OTP | Tạo `server/utils/otpRateLimit.ts`: theo email (và/hoặc IP), tối đa 1 lần gửi OTP mỗi 2 phút. Gọi trong cả hai endpoint send-otp (login + register). Trả 429 + message khi vượt limit. |

**File cần sửa:** `server/api/auth/send-otp-login.post.ts`, `server/api/auth/register/send-otp.post.ts`; tạo mới `server/utils/otpRateLimit.ts`.

---

## 3. Trải nghiệm người dùng (UX) & chất lượng code

### 3.1 Loading đồng nhất (AppLoading)

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Rải rác | Nhiều trang dùng `loading` ref + class riêng: `table-loading`, `state-text`, `detail-state`, `history-state` (deposits, ledger, revenue, users, orders, products, logs, profile, cart, modals). |
| Khuyến nghị | Component chung | Tạo `app/components/AppLoading.vue` (props: `message` hoặc dùng i18n "Đang tải..."). Các trang thay `<div v-if="loading" class="table-loading">` bằng `<AppLoading v-if="loading" />` và chuẩn hóa style (spinner + text). |

**File tham khảo:** `app/pages/admin/deposits/index.vue`, `admin/orders/index.vue`, `admin/products/index.vue`, `profile.vue`, `products/[id].vue`, v.v.

---

### 3.2 Composition API + TypeScript

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Script setup | Đã dùng | Các file `.vue` đều dùng `<script setup>`. |
| TypeScript | Chưa đầy đủ | Hầu hết file không khai báo `lang="ts"` trong `<script setup>`. Chỉ một số ít dùng. |
| Khuyến nghị | Chuyển dần sang TS | Thêm `lang="ts"` cho từng component/page, khai báo type cho props, emit, ref. Tận dụng `tsconfig.json` có sẵn để bắt lỗi sớm. |

---

### 3.3 Xử lý lỗi API (useApi)

| Mục | Trạng thái | Chi tiết |
|-----|------------|----------|
| Hiện trạng | Tự xử lý từng nơi | Mỗi trang/composable gọi `$fetch`, bắt catch rồi gán `error.value = e?.data?.statusMessage` hoặc `showToast(...)`. Không có lớp xử lý chung cho 401 (hết phiên) hoặc toast thống nhất. |
| Khuyến nghị | Composable useApi | Tạo `app/composables/useApi.ts`: wrapper quanh `$fetch` (hoặc `useFetch`) để: (1) 401 → clear cookie / redirect login hoặc refresh token nếu có; (2) 4xx/5xx → gọi `useToast()` với message từ server hoặc mặc định; (3) return `{ data, error, execute }`. Các trang dần chuyển sang dùng `useApi` thay vì gọi `$fetch` trực tiếp. |

**Vị trí gọi API nhiều:** `cart.vue`, `profile.vue`, `products/index.vue`, `products/[id].vue`, `admin/*`, `ContactBubble.vue`, các modal (Payment, Order, Login, Register), v.v.

---

## Tóm tắt ưu tiên

| Ưu tiên | Hạng mục | Effort | Ghi chú |
|---------|----------|--------|--------|
| Cao | Rate limiting OTP | Nhỏ | Bảo mật, chống spam email. |
| Cao | Cookie SameSite=Strict | Rất nhỏ | Đổi 2 chỗ trong login.post.ts. |
| Trung bình | useApi + xử lý 401/toast | Trung bình | Giảm lặp code, UX đồng nhất. |
| Trung bình | AppLoading chung | Nhỏ | Một component + thay thế dần. |
| Trung bình | Validation backend (Zod) | Lớn | Từng nhóm API (auth, products, orders). |
| Trung bình | Lazy load Modal | Nhỏ | defineAsyncComponent cho vài component. |
| Thấp | Pinia cho giỏ hàng | Trung bình | Cần cài pinia + refactor useCart và các page. |
| Thấp | Nuxt Image | Trung bình | Cài module + thay ảnh sản phẩm. |
| Thấp | TypeScript script setup | Trung bình | Bổ sung lang="ts" và type từng file. |

---

## Ghi chú kỹ thuật

- **Pinia:** Nuxt 3/4 có thể dùng `pinia` (Nuxt module `@pinia/nuxt`); persist qua `pinia-plugin-persistedstate`.
- **Nuxt Image:** Cấu hình provider (ví dụ `none` hoặc `ipx`) tùy host; ảnh từ URL ngoài cần provider hỗ trợ (ví dụ `external`).
- **Zod:** Có thể đặt schema trong `server/utils/schemas/` và import vào từng handler.
- **otpRateLimit:** Có thể dùng Map in-memory (key = email hoặc IP) với TTL 2 phút; production nên cân nhắc Redis.

File báo cáo: `docs/CODE_AUDIT_REPORT.md`. Có thể triển khai lần lượt theo bảng ưu tiên trên.

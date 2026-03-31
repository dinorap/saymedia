## Giới thiệu hệ thống

- **Mục đích**: Nền tảng bán sản phẩm/dịch vụ online, cho phép người dùng đăng ký tài khoản, nạp tiền (credit) và mua các sản phẩm/dịch vụ số.
- **Kiến trúc**:
  - Frontend: Nuxt 3, giao diện trang chủ, danh sách sản phẩm, giỏ hàng/đặt hàng, khu vực tài khoản.
  - Backend: API Nuxt server-side, kết nối MySQL (qua `pool`), bảo mật JWT + cookie `httpOnly`.
  - **Bảo mật**:
    - JWT lưu trong cookie an toàn (`httpOnly`, `sameSite`, `secure` trong production).
    - Rate-limit cho đăng nhập và tạo đơn hàng.
    - Các header bảo mật: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.

## Deploy production

Xem hướng dẫn triển khai và chính sách migrate DB trong `DEPLOYMENT.md`.

## Danh sách cổng đang sử dụng

- `4012` - Nuxt/Nitro app (HTTP nội bộ).
  - Nơi cấu hình: `start_main.bat`, `start-server-and-tunnel.bat`, `nuxt.config.ts`, `nginx-1.29.6/conf/nginx.conf`, `nginx_saymedia.conf`, `.cloudflared/config.yml`.
- `80` - Nginx reverse proxy.
  - Nơi cấu hình: `nginx-1.29.6/conf/nginx.conf`, `nginx_saymedia.conf`, `start_main.bat` (đoạn check/start Nginx).
- `3301` - MySQL host port (map vào container `3306`).
  - Nơi cấu hình: `docker-compose.yml` (`3301:3306`), `.env` (`DB_PORT=3301`).

## Gợi ý chuẩn hóa về dải 4012+

Nếu muốn đổi toàn bộ sang dải `4012`, `4013`, `4014`:

- Giữ app Nuxt/Nitro ở `4012`.
- Đổi Nginx từ `80` sang `4013` (sửa cả `listen` và các script check cổng Nginx).
- Đổi MySQL host port từ `3301` sang `4014` (sửa `docker-compose.yml` và `.env`).
- Nếu dùng Cloudflare Tunnel với ingress tĩnh, sửa `.cloudflared/config.yml` để trỏ đúng cổng mới của service đích.

## Chức năng người dùng (role `user`)

- **Đăng ký / Đăng nhập**
  - Đăng ký tài khoản với `username`, `email`, `password`.
  - Đăng nhập, nhận JWT lưu trong cookie, có thể xem thông tin cá nhân qua API `/api/auth/me`.
- **Quản lý tài khoản**
  - Xem thông tin email, số dư `credit` hiện tại.
  - Đổi mật khẩu (API `/api/auth/change-password.post.ts`).
- **Nạp tiền (payment)**
  - Tạo giao dịch nạp tiền (SePay/manual/test) lưu vào bảng `payment_transactions`.
  - Hệ thống nhận webhook từ SePay (`/api/payment/webhook.post.ts`) để tự động cập nhật trạng thái giao dịch, cộng `credit` cho user.
  - API test/simulate payment (`/api/payment/test/simulate-payment.post.ts`) dùng cho môi trường dev.
- **Mua hàng / Đặt dịch vụ**
  - Danh sách sản phẩm/dịch vụ (`products`, `services`) được cấu hình bởi admin.
  - User dùng `credit` để đặt mua; mỗi đơn hàng lưu vào bảng `orders`.
  - Có thể xem lịch sử đơn hàng, trạng thái đơn (`pending/completed/cancelled`).
- **Hiển thị social proof & đơn hàng gần đây**
  - Component `SocialProof.vue` + API `/api/recent-orders.get.ts` đọc dữ liệu từ `recent_orders_feed` để hiển thị “Đơn hàng gần đây”, có cả bản ghi thật và bản ghi fake.
- **Chat cộng đồng**
  - Component `CommunityChat.vue` + `server/utils/chat.ts` cho phép user tham gia phòng chat cộng đồng (gửi/nhận tin nhắn theo thời gian thực hoặc gần real-time).
  - Một số thao tác (xoá/lọc/tắt tiếng) có thể bị giới hạn theo quyền admin.

## Hệ thống phân quyền admin

Hệ thống có 3 mức admin chính lưu trong bảng `admins.role`:

- `admin_0`: Super Admin (toàn quyền).
- `admin_1`: Admin / Đại lý chính.
- `admin_2`: Admin chat cộng đồng (chỉ lo phần cộng đồng/chat).

Cookie `user_role` và API `/api/auth/me` dùng để phân quyền hiển thị giao diện và API.

### admin_0 – Super Admin

- **Quản lý admin**
  - Tạo/sửa/xoá admin mới qua trang `app/pages/admin/users/index.vue` (tab Admins) + API `/api/admin/admins.*`.
  - Chỉ `admin_0` mới gọi được `/api/admin/admins.post.ts` để tạo admin mới (bao gồm cả `admin_0`, `admin_1`, `admin_2`).
  - Khoá/mở khoá tài khoản admin (`is_active`), xem mã `ref_code`, quản lý liên hệ (contact info).
- **Quản lý user**
  - Xem toàn bộ user trong hệ thống, lọc theo admin quản lý.
  - Tạo/sửa/xoá user.
  - Khoá/mở khoá user.
  - **Điều chỉnh tín chỉ (credit)**: chỉ `admin_0` được phép gọi `/api/admin/users/[id]/credit-adjust.post.ts` (tăng/giảm credit thủ công, ghi log vào `credit_ledger`).
- **Quản lý sản phẩm/dịch vụ**
  - Quản lý tất cả `services` và `products` của mọi admin.
  - Sửa sản phẩm/dịch vụ, bật/tắt `is_active`.
  - Upload ảnh sản phẩm qua `/api/admin/upload/product-image.post.ts` (được quyền giống `admin_1`).
- **Quản lý đơn hàng & báo cáo**
  - Xem toàn bộ đơn hàng (`orders`), lọc theo user/admin.
  - Xử lý refund, huỷ đơn, ghi chú.
  - Xem báo cáo doanh thu/tổng quan qua `/api/admin/revenue-summary.get.ts` (bao gồm thống kê `admin_1`).
- **Log & audit**
  - Xem nhật ký hệ thống qua `/api/admin/logs.get.ts` (chỉ `admin_0`), dữ liệu từ bảng `audit_logs`.
  - Theo dõi biến động credit trong `credit_ledger` (API `/api/admin/credit-ledger.get.ts`).

### admin_1 – Admin / Đại lý

- **Quản lý người dùng của riêng mình**
  - Mỗi `user` có `admin_id` trỏ về một admin.
  - `admin_1` chỉ xem/sửa user mà `admin_id` thuộc về mình (API check `existing[0].admin_id !== currentUser.id` trong `/api/admin/users/[id].put.ts`).
  - Khoá/mở khoá user, không được tự ý điều chỉnh credit (endpoint credit-adjust bị chặn).
- **Quản lý sản phẩm/dịch vụ của mình**
  - Xem danh sách `products`/`services` do mình tạo (`admin_id` là id của admin).
  - Chỉ sửa/xoá được sản phẩm/dịch vụ thuộc về mình (API `/api/admin/products.get.ts`, `/api/admin/products/[id].put.ts`, `/api/admin/services/[id].delete.ts` đều check `admin_id === currentUser.id` khi `role = admin_1`).
  - Upload ảnh sản phẩm qua `/api/admin/upload/product-image.post.ts`.
- **Quản lý đơn hàng liên quan**
  - Xem các `orders` có `admin_id` là mình (do user dưới hệ thống của mình tạo).
  - Xử lý ghi chú, cập nhật trạng thái nằm trong phạm vi đơn hàng của mình.
- **Giới hạn**
  - Không được tạo admin mới, không truy cập log hệ thống (`/api/admin/logs.get.ts` chặn).
  - Không xem/đụng tới user, sản phẩm, đơn hàng của admin khác.

### admin_2 – Admin chat cộng đồng

- **Vai trò chính**: quản lý cộng đồng/chat, không tham gia phần tài chính – sản phẩm.
- **Chức năng đi kèm (tùy thiết kế UI)**
  - Moderation trong `CommunityChat.vue`: xoá tin nhắn vi phạm, chặn tạm thời user trong phòng chat, ghim thông báo… (tuỳ các API trong `server/utils/chat.ts`).
  - Có `ref_code` và `contact_info` như các admin khác nhưng không dùng cho quản lý user/sản phẩm.
- **Giới hạn**
  - Không có quyền truy cập các API tài chính/đơn hàng/credit.
  - Không tạo được admin khác, không điều chỉnh credit, không quản lý sản phẩm/dịch vụ.

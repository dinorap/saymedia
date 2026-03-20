# Hướng dẫn gắn tên miền cho Cloudflare Tunnel (Windows)

Tài liệu này hướng dẫn chi tiết từng bước để dùng **tên miền đã mua `saymediaai.com`** với Cloudflare Tunnel.

Khuyến nghị dùng **subdomain**: `game.saymediaai.com` thay vì cố trỏ thẳng apex `saymediaai.com`.

## 0) Chuẩn bị

1. Trên máy khách, đảm bảo trong thư mục dự án có `cloudflared.exe`:
   - `D:\FreeLand\taphoa-mmo\cloudflared.exe`
2. Đảm bảo bạn có thể chạy Nuxt production trên port `4012`:
   - `npm run preview -- --port 4012` (Nuxt production-mode, dùng sau khi `npm run build`)
3. Bạn có quyền quản lý DNS tại nơi bạn mua domain (ảnh bạn gửi cho thấy nameserver là `ns1.dns-parking.com` và `ns2.dns-parking.com`).

## 1) Login Cloudflare (làm 1 lần)

Trong thư mục dự án:

```bash
cd /d D:\FreeLand\taphoa-mmo
.\cloudflared.exe login
```

Sau khi login xong, Cloudflare sẽ lưu thông tin cấu hình vào thư mục `.cloudflared`.

## 2) Tạo tunnel có tên ổn định (làm 1 lần)

Chọn tên tunnel ổn định (ví dụ):

```bash
cd /d D:\FreeLand\taphoa-mmo
.\cloudflared.exe tunnel create taphoa-mmo-tunnel
```

Sau khi chạy xong, bạn cần lấy **Tunnel ID (UUID)** hoặc có thể lấy lại sau bằng lệnh:

```bash
.\cloudflared.exe tunnel list
```

Ghi chú:
- Tunnel “tên” là `taphoa-mmo-tunnel` (dễ nhớ).
- Tunnel “ID” là UUID (dùng để tạo DNS thủ công khi DNS nằm ngoài Cloudflare).

Nếu tunnel của bạn có tên khác (ví dụ bạn đang dùng tunnel tên `server` như lệnh `cloudflared tunnel list` của bạn),
hãy thay `taphoa-mmo-tunnel` bằng đúng tên tunnel đó trong toàn bộ các lệnh ở phần sau.

## 3) Chạy tunnel để test (trỏ tới Nuxt port 4012)

Mở một cửa sổ PowerShell/CMD và chạy:

```bash
.\cloudflared.exe tunnel run taphoa-mmo-tunnel --url http://localhost:4012
```

Để tunnel hoạt động, bạn đồng thời phải có Nuxt production chạy.

Nếu bạn muốn test theo kiểu chạy server trước rồi chạy tunnel thì làm như sau:

1. Chạy Nuxt production (cửa sổ 1):
   ```bash
   npm run preview -- --port 4012
   ```
2. Chạy tunnel (cửa sổ 2):
   ```bash
   .\cloudflared.exe tunnel run taphoa-mmo-tunnel --url http://localhost:4012
   ```

Giữ cửa sổ tunnel đang chạy để xem log.

## 4) Thêm DNS cho `game.saymediaai.com`

### Trường hợp A: DNS của `saymediaai.com` đang ở nhà cung cấp (không trỏ nameserver về Cloudflare)

Ảnh của bạn cho thấy DNS đang do `dns-parking.com` quản lý, nên làm theo hướng dẫn A.

Tại DNS provider tạo bản ghi:

- Loại bản ghi: `CNAME`
- Host/Name: `game` (=> `game.saymediaai.com`)
- Target/Value: `<TUNNEL_ID>.cfargotunnel.com`
  - Trong đó `<TUNNEL_ID>` chính là UUID của tunnel `taphoa-mmo-tunnel`
- TTL: để mặc định (nếu DNS cho chọn)
- Lưu ý: đợi DNS cập nhật (thường 5-30 phút, có thể lâu hơn tùy provider)

Ví dụ mục target (dạng chuỗi):
- `01234567-89ab-cdef-0123-456789abcdef.cfargotunnel.com`

Sau khi DNS cập nhật, bạn truy cập:
- `https://game.saymediaai.com`

### Trường hợp B: `saymediaai.com` được quản lý trực tiếp bởi Cloudflare (nameserver trỏ về Cloudflare)

Nếu nameserver của domain đã trỏ về Cloudflare (Cloudflare tự quản lý DNS zone), bạn có thể để `cloudflared` tự tạo CNAME:

```bash
.\cloudflared.exe tunnel route dns taphoa-mmo-tunnel game.saymediaai.com
```

Nếu bạn đã có bản ghi cũ và muốn ghi đè:

```bash
.\cloudflared.exe tunnel route dns taphoa-mmo-tunnel game.saymediaai.com --overwrite-dns
```

## 5) Chạy production “đúng theo domain cố định” (mỗi lần bật server)

Bạn cần chạy tunnel theo **tên ổn định** `taphoa-mmo-tunnel`, không chạy dạng quick tunnel `*.trycloudflare.com`.

Trong file `.bat` (hoặc tự chạy lệnh), đảm bảo dùng:

```bat
.\cloudflared.exe tunnel run taphoa-mmo-tunnel --url http://localhost:4012
```

Nếu bạn dùng `start-prod-and-tunnel.bat` thì hãy kiểm tra/chỉnh dòng lệnh `cloudflared` cho khớp.

## 6) Kiểm tra nhanh khi chưa lên domain

1. Chắc chắn tunnel đang chạy lệnh `tunnel run taphoa-mmo-tunnel`.
2. Chờ DNS đủ thời gian rồi thử lại.
3. Kiểm tra CNAME đã đúng form:
   - `game` => `<UUID>.cfargotunnel.com`
4. Nếu bạn dùng `https://game.saymediaai.com` mà báo lỗi:
   - đảm bảo Nuxt production port `4012` đang chạy và `http://localhost:4012` trả về được.

---

Nếu bạn muốn, bạn gửi mình tên tunnel bạn đang dùng thực tế (hoặc output từ `cloudflared tunnel list`) để mình hướng dẫn chính xác lấy `<TUNNEL_ID>` trong trường hợp bạn không copy được UUID ở bước 2.


## Hướng dẫn setup server trên PC Windows (máy khách 24/24)

Tài liệu này dành cho **máy khách** muốn biến PC Windows thành server chạy web Nuxt + database (qua Docker) + Cloudflare Tunnel.

Giả sử:
- Mã nguồn đã push lên Git (GitHub/GitLab/…) với repo: `REPO_URL` (thay bằng repo thật).
- Dự án Nuxt dùng port **4012** (đã cấu hình trong `nuxt.config.ts`).
- Database chạy bằng **Docker** (ví dụ qua `docker-compose.yml`).

---

## 1. Chuẩn bị phần mềm trên máy khách

1. **Cài Git**
   - Tải và cài Git từ trang chủ (`https://git-scm.com/download/win`).

2. **Cài Node.js (kèm npm)**
   - Tải bản LTS từ `https://nodejs.org/` và cài đặt.

3. **Cài Docker Desktop**
   - Tải Docker Desktop cho Windows từ `https://www.docker.com/products/docker-desktop/` và cài.
   - Mở Docker Desktop, đảm bảo nó đang **Running**.

4. **Tạo thư mục chứa dự án**
   - Ví dụ: `D:\FreeLand\taphoa-mmo`

---

## 2. Clone code và cài thư viện Node

Mở **Command Prompt / PowerShell**:

```bash
cd /d D:\FreeLand
git clone REPO_URL taphoa-mmo
cd taphoa-mmo

# Cài dependencies Node
npm install
```

Thay `REPO_URL` bằng URL repo thực tế (HTTPS).

---

## 3. Chuẩn bị database bằng Docker

Giả sử project đã có file `docker-compose.yml` cấu hình database (MySQL/PostgreSQL/MongoDB/...), trên máy khách chỉ cần:

```bash
cd /d D:\FreeLand\taphoa-mmo
docker compose up -d
```

Hoặc nếu file là `docker-compose.yml` cũ:

```bash
docker-compose up -d
```

Sau lệnh này:
- Docker sẽ kéo image về (lần đầu có thể hơi lâu).
- Container database sẽ chạy nền 24/24 miễn là Docker đang chạy.

> Nếu bạn chưa có file `docker-compose.yml`, hãy lấy file đó từ dev (hoặc người làm dự án) và đặt vào thư mục gốc dự án, rồi chạy lại các lệnh trên.

---

## 4. Đặt `cloudflared.exe` vào thư mục dự án

1. Copy file `cloudflared.exe` (do dev cung cấp) vào thư mục:

```text
D:\FreeLand\taphoa-mmo\cloudflared.exe
```

2. Trong thư mục dự án, đã có sẵn 2 file `.bat`:
   - `start-server-and-tunnel.bat` (chạy **dev** + tunnel, chỉ dùng để test).
   - `start-prod-and-tunnel.bat` (chạy **production** + tunnel, dùng cho chạy thật).

Máy khách chủ yếu sẽ dùng **`start-prod-and-tunnel.bat`**.

---

## 5. Login Cloudflare (làm 1 lần trên máy khách)

Mục tiêu: cho phép `cloudflared.exe` kết nối vào tài khoản Cloudflare của bạn.

Trong thư mục dự án:

```bash
cd /d D:\FreeLand\taphoa-mmo
.\cloudflared.exe login
```

Trình duyệt sẽ mở:
- Chọn **tài khoản Cloudflare** của bạn.
- Chọn **zone (domain)** bạn muốn dùng (nếu có).
- Sau khi xác nhận, Cloudflare sẽ lưu file cấu hình vào thư mục `.cloudflared` trên máy.

> Nếu bạn chỉ dùng **quick tunnel** (link random `*.trycloudflare.com`) thì chỉ cần bước login này.  
> Nếu muốn domain cố định (ví dụ `game.domain.com`), cần thêm bước tạo tunnel + DNS (có thể bổ sung riêng khi có domain cụ thể).

---

## 6. Build production (mỗi khi có version code mới)

Sau khi kéo code mới `git pull`, trên máy khách chạy:

```bash
cd /d D:\FreeLand\taphoa-mmo
npm install       # nếu có thêm/bớt thư viện
npm run build
```

Việc này sẽ build bản production của Nuxt (chỉ cần làm khi có update code).

---

## 7. Chạy server production + Cloudflare Tunnel (dùng file .bat)

### 7.1. File `start-prod-and-tunnel.bat`

Nội dung (tóm tắt):

```bat
@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo Dang khoi dong Nuxt PRODUCTION (npm run start) tren port 4012...
start /B "" npm run start

timeout /t 10 /nobreak >nul

echo Dang khoi tao Cloudflare Tunnel toi http://localhost:4012 ...
.\cloudflared.exe tunnel --url http://localhost:4012

echo.
echo Dang chay:
echo  - npm run start (production)
echo  - cloudflared tunnel --url http://localhost:4012
echo.
echo Nhan Ctrl+C de dung Tunnel. Neu muon dung ca server, dong cua so nay lai.

endlocal
```

### 7.2. Cách sử dụng hằng ngày

1. Mở thư mục:

```text
D:\FreeLand\taphoa-mmo
```

2. Double‑click file:

```text
start-prod-and-tunnel.bat
```

3. Một **cửa sổ CMD duy nhất** sẽ hiện ra:
   - Nuxt production (`npm run start`) chạy nền trên port **4012**.
   - Cloudflare Tunnel chạy foreground, in ra URL (dạng `https://xxxxx.trycloudflare.com`).

4. **Giữ cửa sổ này mở**:
   - Web sẽ sống 24/24 miễn là:
     - Cửa sổ CMD còn mở.
     - Docker Desktop đang chạy (database còn sống).

5. **Tắt server**:
   - Nhấn `Ctrl + C` trong cửa sổ đó để tắt tunnel.
   - Đóng cửa sổ để tắt luôn `npm run start` (hoặc kill process Node nếu cần).

---

## 8. (Tuỳ chọn) Chạy dev để test nhanh trên máy khách

Nếu cần test/dev ngay trên máy khách:

1. Dùng file:

```text
start-server-and-tunnel.bat
```

2. File này sẽ:
   - Chạy `npm run dev` trên port **4012**.
   - Sau 10 giây, chạy `cloudflared.exe tunnel --url http://localhost:4012`.

3. Dùng khi:
   - Bạn muốn debug trực tiếp trên máy khách.
   - Không khuyến nghị dùng lâu dài cho người chơi thật (dev mode chậm và tốn tài nguyên hơn production).

---

## 9. Tóm tắt nhanh cho người vận hành (máy khách)

- **Lần đầu**:
  - Cài: Git, Node, Docker Desktop.
  - `git clone`, `npm install`.
  - `docker compose up -d` (chạy database).
  - Copy `cloudflared.exe` vào thư mục dự án.
  - `.\cloudflared.exe login`.
  - `npm run build`.

- **Mỗi lần bật server cho người dùng**:
  - Đảm bảo Docker Desktop đang chạy.
  - Double‑click `start-prod-and-tunnel.bat`.
  - Lấy URL Cloudflare (hoặc domain cố định nếu đã cài tunnel nâng cao) gửi cho người dùng.


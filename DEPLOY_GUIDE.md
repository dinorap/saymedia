## TapHoa MMO – Hướng dẫn build & deploy

### 1. Yêu cầu môi trường

- **Node.js**: >= 18 (khuyến nghị LTS)
- **npm**: >= 9
- **Git**
- (Production) **VPS Ubuntu 20.04/22.04** với quyền `sudo`

Kiểm tra nhanh:

```bash
node -v
npm -v
git --version
```

### 2. Chuẩn bị source code

Clone project:

```bash
git clone <URL_REPO> taphoa-mmo
cd taphoa-mmo
```

Cài dependencies:

```bash
npm install
```

Lệnh `postinstall` sẽ tự chạy `nuxt prepare` sau khi cài xong.

### 3. Chạy dev trên máy local

```bash
npm run dev
```

Mặc định Nuxt sẽ chạy ở `http://localhost:3000` (xem log terminal để biết chính xác).

### 4. Thiết lập biến môi trường

Tạo file `.env` (hoặc `.env.production` nếu bạn muốn tách riêng cho production) dựa trên file mẫu nếu có:

```bash
cp .env.example .env   # nếu trong repo có file .env.example
```

Sau đó chỉnh các giá trị:

- Thông tin kết nối MySQL
- Cấu hình email (Nodemailer)
- Secret/key cho JWT, thanh toán, v.v.

**Không commit** file `.env` lên git.

### 5. Build cho production

Từ thư mục gốc project:

```bash
npm run build
```

Đây chạy `nuxt build` và tạo ra bundle production.

Để test bundle production trên máy local:

```bash
npm run preview
```

Mặc định `nuxt preview` sẽ chạy một server tạm để bạn kiểm tra build (thường trên port 3000 hoặc port được Nuxt in ra log).

### 6. Deploy lên VPS Ubuntu (cách cơ bản)

#### 6.1. Chuẩn bị VPS

1. Mua VPS (VD: DigitalOcean, Contabo, Vultr, Azdigi, v.v.) với Ubuntu 20.04/22.04.
2. Lấy thông tin IP và tài khoản SSH (thường là `root`).
3. SSH vào VPS:

```bash
ssh root@<IP_VPS>
```

4. Cập nhật hệ thống:

```bash
sudo apt update && sudo apt upgrade -y
```

5. Cài Node.js (nên dùng Node LTS 18+):

Bạn có thể cài qua nvm hoặc qua NodeSource. Ví dụ với Node 18:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Kiểm tra:

```bash
node -v
npm -v
```

#### 6.2. Clone code & build trên VPS

```bash
cd /var/www   # hoặc thư mục bạn muốn chứa source
git clone <URL_REPO> taphoa-mmo
cd taphoa-mmo

npm install
npm run build
```

Sau khi build xong, bạn có thể test nhanh:

```bash
npm run preview
```

#### 6.3. Chạy app bằng PM2 (giữ app chạy nền)

Cài PM2:

```bash
sudo npm install -g pm2
```

Chạy app (dùng `nuxt preview` cho bundle đã build):

```bash
cd /var/www/taphoa-mmo
pm2 start "npm run preview" --name taphoa-mmo
pm2 save
pm2 startup    # để PM2 tự khởi động lại khi reboot
```

Một số lệnh PM2 hữu ích:

```bash
pm2 list
pm2 logs taphoa-mmo
pm2 restart taphoa-mmo
pm2 stop taphoa-mmo
```

### 7. Gắn domain + Nginx + SSL

#### 7.1. Trỏ domain về VPS

Tại trang quản lý domain (nhà cung cấp domain của bạn):

- Tạo **A record**:
  - Name/Host: `@`
  - Value: `IP_VPS`
- (Tuỳ chọn) tạo **CNAME**:
  - Name/Host: `www`
  - Value: `@` (hoặc `yourdomain.com`)

Chờ DNS cập nhật (thường vài phút đến 1–2 giờ).

Bạn có thể kiểm tra:

```bash
ping yourdomain.com
```

Nếu IP trả về là IP VPS là OK.

#### 7.2. Cài & config Nginx làm reverse proxy

Trên VPS:

```bash
sudo apt install -y nginx
```

Tạo file cấu hình, ví dụ:

```bash
sudo nano /etc/nginx/sites-available/taphoa-mmo.conf
```

Nội dung mẫu:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;  # port Nuxt preview đang chạy
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/taphoa-mmo.conf /etc/nginx/sites-enabled/taphoa-mmo.conf
sudo nginx -t
sudo systemctl reload nginx
```

Mở `http://yourdomain.com` để kiểm tra (chưa có HTTPS).

#### 7.3. Cài SSL Let’s Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Chọn tuỳ chọn **redirect toàn bộ HTTP → HTTPS** khi được hỏi.

Sau khi chạy xong, truy cập:

```text
https://yourdomain.com
```

để kiểm tra chứng chỉ SSL.

### 8. Quy trình update code sau này

Mỗi lần bạn cập nhật code và push lên git:

```bash
ssh root@<IP_VPS>
cd /var/www/taphoa-mmo

git pull
npm install          # nếu có thêm package
npm run build
pm2 restart taphoa-mmo
```

### 9. Tóm tắt lệnh quan trọng

- **Dev local**: `npm run dev`
- **Build production**: `npm run build`
- **Test build**: `npm run preview`
- **Chạy production với PM2**: `pm2 start "npm run preview" --name taphoa-mmo`
- **Restart khi có code mới**: `pm2 restart taphoa-mmo`


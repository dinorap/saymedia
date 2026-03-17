## Production deployment playbook (VPS 1 server)

### 1) Required environment variables

- **`NODE_ENV=production`**
- **`JWT_SECRET`**: must be set and must not use the default value.
- **Database**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- **SePay webhook**: `SEPAY_WEBHOOK_API_KEY`
- **SePay QR account**: `SEPAY_BANK_ID`, `SEPAY_ACCOUNT_NO` (required in production)
- **Optional**:
  - `DEPOSIT_VND_PER_CREDIT` (default 1000; can also be configured via admin UI)
  - `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE`, `PAYPAL_CURRENCY`

### 2) Runtime migrations policy (IMPORTANT)

This codebase previously created/altered tables at runtime via many `ensure*Schema()` functions.
For production stability, runtime migrations are now **disabled by default**.

- **Default (recommended)**: do NOT set `ALLOW_RUNTIME_MIGRATIONS`.
- **Temporarily enable** (only during rollout that changes DB schema):
  - set `ALLOW_RUNTIME_MIGRATIONS=true`
  - start server once to let it create/alter tables
  - verify app is healthy
  - set `ALLOW_RUNTIME_MIGRATIONS` back to empty/false and restart

If you deploy a version that expects new tables/columns while runtime migrations are disabled,
you may see errors like "table doesn't exist" or "unknown column".

### 3) Recommended process model

Rate-limiting is currently in-memory. For **1 VPS / 1 instance**, it works as expected.

- Prefer **single Node instance** (no clustering) to keep rate limits effective.
- If you need PM2:
  - Use `pm2 start ...` without `-i` (no cluster)

If you later scale to multiple instances, move rate limit storage to Redis.

### 4) Rollout checklist

- Backup DB
- Export current env
- Pull code + install dependencies
- Start with `ALLOW_RUNTIME_MIGRATIONS=true` if schema changed
- Smoke test:
  - login user/admin
  - deposit QR create + webhook (or simulate in dev)
  - create order + refund flow
  - admin pages load
  - WS community/support works
- Disable `ALLOW_RUNTIME_MIGRATIONS` after schema is applied

1. Tắt Nuxt DevTools ở production
   Hiện nuxt.config.ts đang devtools: { enabled: true } → nên đổi sang chỉ bật khi không phải production.

2. Gỡ cấu hình vite.server.allowedHosts khi production
   Đoạn allowedHosts: ['.ngrok-free.dev', '.localhost.run'] chỉ nên dùng dev. Production không cần và còn tạo bề mặt tấn công Host header

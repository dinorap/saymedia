# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Bảo mật / Security

- **Production**: Đặt biến môi trường `JWT_SECRET` (chuỗi bí mật đủ mạnh) trong `.env` hoặc hosting. Nếu không đặt, server sẽ in cảnh báo khi chạy production.
- **Cookie**: Token đăng nhập dùng `httpOnly`, `sameSite: lax`, `secure` khi `NODE_ENV=production`.
- **Rate limit**: Đăng nhập giới hạn số lần thử sai theo IP; tạo đơn hàng giới hạn theo user để chống spam.
- **Headers**: Response có `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.

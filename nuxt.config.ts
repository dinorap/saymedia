// https://nuxt.com/docs/api/configuration/nuxt-config
const isTunnel = process.env.TUNNEL === '1'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  runtimeConfig: {
    depositVndPerCredit: Number(process.env.DEPOSIT_VND_PER_CREDIT || 1000),
    public: {
      paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
      paypalCurrency: process.env.PAYPAL_CURRENCY || 'USD',
      depositVndPerCredit: Number(process.env.DEPOSIT_VND_PER_CREDIT || 1000),
      sepayBankId: process.env.SEPAY_BANK_ID || process.env.BANK_ID || '',
      sepayAccountNo: process.env.SEPAY_ACCOUNT_NO || process.env.ACCOUNT_NO || '',
      sepayOwnerName: process.env.OWNER_NAME || '',
    },
  },

  devServer: {
    // Khi tunnel/proxy từ bên ngoài, Nuxt dev cần lắng nghe IPv4
    // (tránh trường hợp chỉ listen ::1 khiến cloudflared tunnel tới 127.0.0.1 bị fail).
    host: '0.0.0.0',
    port: 4012
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  vite: {
    server: {
      // Cho phép truy cập dev server qua tunnel như ngrok/localhost.run/trycloudflare.com
      // Nuxt/Vite dev đôi khi trả 404 khi Host header không khớp,
      // nên khi dev (nhất là qua trycloudflare) ta mở rộng allowedHosts.
      allowedHosts: process.env.NODE_ENV === 'production' ? undefined : ['*'],
      // host: true, // không còn thuộc tính host trong kiểu ServerOptions mới
      hmr: isTunnel ? false : undefined,
    },
  },

  routeRules: {
    '/products': { swr: 60 },
    '/products/**': { swr: 60 },
  },

  css: [
    '~/assets/css/reset.css',
    '~/assets/css/theme.css',
    '~/assets/css/components/buttons.css',
    '~/assets/css/components/forms.css',
    '~/assets/css/components/card.css',
    '~/assets/css/layouts/admin.css',
    '~/assets/css/pages/landing.css',
    '~/assets/css/pages/auth.css',
    '~/assets/css/pages/dashboard.css'
  ],

  modules: ['@pinia/nuxt', '@nuxt/image', '@nuxtjs/i18n'],

  image: {
    provider: 'none',
    format: ['webp'],
    quality: 80,
  },

  i18n: {
    locales: [
      { code: 'vi', iso: 'vi-VN', file: 'vi.json', name: 'Tiếng Việt' },
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' }
    ],
    defaultLocale: 'vi',
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      fallbackLocale: 'vi'
    }
  }
})
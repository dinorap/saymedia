// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  runtimeConfig: {
    depositVndPerCredit: Number(process.env.DEPOSIT_VND_PER_CREDIT || 1000),
    public: {
      paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
      paypalCurrency: process.env.PAYPAL_CURRENCY || 'USD',
      depositVndPerCredit: Number(process.env.DEPOSIT_VND_PER_CREDIT || 1000),
    },
  },

  devServer: {
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
      allowedHosts:
        process.env.NODE_ENV === 'production'
          ? undefined
          : ['.ngrok-free.dev', '.localhost.run', '.trycloudflare.com'],
      // host: true, // không còn thuộc tính host trong kiểu ServerOptions mới
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
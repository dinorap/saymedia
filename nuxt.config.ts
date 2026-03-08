// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  devServer: {
    port: 9000
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
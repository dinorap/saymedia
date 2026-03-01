<template>
  <div class="admin-layout">
    <div class="particles" aria-hidden="true" />

    <!-- Sidebar -->
    <aside class="sidebar">
      <NuxtLink to="/admin" class="sidebar-logo">
        <img src="/logo.png" alt="Tạp Hóa MMO" class="sidebar-logo-img" />
      </NuxtLink>
      <nav class="sidebar-nav">
        <NuxtLink to="/admin" class="sidebar-item" active-class="sidebar-item--active">
          <span class="sidebar-item-icon" aria-hidden="true">▣</span>
          <span class="sidebar-item-label">{{ $t('admin.dashboard') }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/centers" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">▦</span>
          <span class="sidebar-item-label">{{ $t('admin.centers') }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/users" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">👥</span>
          <span class="sidebar-item-label">{{ $t('admin.users') }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/services" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">📦</span>
          <span class="sidebar-item-label">{{ $t('admin.services') }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/revenue" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">📈</span>
          <span class="sidebar-item-label">{{ $t('admin.revenue') }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/logs" class="sidebar-item">
          <span class="sidebar-item-icon" aria-hidden="true">📄</span>
          <span class="sidebar-item-label">{{ $t('admin.logs') }}</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="sidebar-profile" @click="showChangePassword = true">
          <div class="sidebar-profile-avatar" />
          <span class="sidebar-profile-name">{{ currentUser?.username || $t('admin.profileName') }}</span>
          <span class="sidebar-profile-chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </aside>

    <!-- Main: header + content -->
    <div class="main-wrap">
      <header class="admin-header">
        <h1 class="admin-header-title">{{ pageTitle }}</h1>
        <div class="admin-header-actions">
          <div class="admin-lang-switcher">
            <button
              type="button"
              class="admin-lang-btn"
              :class="{ active: locale === 'en' }"
              @click="setLocale('en')"
            >
              EN
            </button>
            <span class="admin-lang-sep">|</span>
            <button
              type="button"
              class="admin-lang-btn"
              :class="{ active: locale === 'vi' }"
              @click="setLocale('vi')"
            >
              VI
            </button>
          </div>
          <button type="button" class="admin-icon-btn" aria-label="Thông báo">🔔</button>
          <button type="button" class="admin-icon-btn" aria-label="Hồ sơ">👤</button>
          <button type="button" class="admin-icon-btn" aria-label="Trợ giúp">?</button>
          <button type="button" class="admin-icon-btn" aria-label="Cài đặt">⚙</button>
          <button type="button" class="admin-btn-logout" @click="logout">
            {{ $t('admin.logout') }}
          </button>
        </div>
      </header>
      <main class="admin-content">
        <NuxtPage />
      </main>
    </div>

    <!-- Modal đổi mật khẩu -->
    <Teleport to="body">
      <div v-if="showChangePassword" class="admin-modal-overlay" @click.self="showChangePassword = false">
        <div class="admin-modal">
          <h3 class="admin-modal-title">{{ $t('admin.changePassword') }}</h3>
          <form class="admin-modal-form" @submit.prevent="submitChangePassword">
            <div class="admin-form-row">
              <label>{{ $t('admin.oldPassword') }}</label>
              <input v-model="pwForm.oldPassword" type="password" class="admin-input" required />
            </div>
            <div class="admin-form-row">
              <label>{{ $t('admin.newPassword') }}</label>
              <input v-model="pwForm.newPassword" type="password" class="admin-input" required minlength="6" />
            </div>
            <div class="admin-form-row">
              <label>{{ $t('admin.confirmPassword') }}</label>
              <input v-model="pwForm.confirmPassword" type="password" class="admin-input" required />
            </div>
            <p v-if="pwError" class="admin-error-msg">{{ pwError }}</p>
            <div class="admin-modal-actions">
              <button type="button" class="admin-btn-secondary" @click="showChangePassword = false">{{ $t('admin.cancel') }}</button>
              <button type="submit" class="admin-btn-primary" :disabled="pwSaving">{{ pwSaving ? '...' : $t('admin.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const route = useRoute()
const { locale, setLocale, t } = useI18n()

const currentUser = ref(null)
const showChangePassword = ref(false)
const pwForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwError = ref('')
const pwSaving = ref(false)

onMounted(async () => {
  try {
    const res = await $fetch('/api/auth/me')
    if (res?.success && res.user) currentUser.value = res.user
  } catch {
    currentUser.value = null
  }
})

async function submitChangePassword() {
  pwError.value = ''
  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = t('admin.passwordMismatch')
    return
  }
  if (pwForm.newPassword.length < 6) {
    pwError.value = locale.value === 'vi' ? 'Mật khẩu mới tối thiểu 6 ký tự' : 'New password must be at least 6 characters'
    return
  }
  pwSaving.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        old_password: pwForm.oldPassword,
        new_password: pwForm.newPassword
      }
    })
    showChangePassword.value = false
    pwForm.oldPassword = ''
    pwForm.newPassword = ''
    pwForm.confirmPassword = ''
  } catch (e) {
    pwError.value = e?.data?.statusMessage || 'Lỗi đổi mật khẩu'
  } finally {
    pwSaving.value = false
  }
}

const pageTitle = computed(() => {
  const name = route.name?.toString() || ''
  if (name === 'admin') return t('admin.dashboard')
  if (name.includes('centers')) return t('admin.centers')
  if (name.includes('users')) return t('admin.users')
  if (name.includes('services')) return t('admin.services')
  if (name.includes('revenue')) return t('admin.revenue')
  if (name.includes('logs')) return t('admin.logs')
  return t('admin.profileName')
})

function logout() {
  const cookiesToClear = ['user_role']
  for (const name of cookiesToClear) {
    const cookie = useCookie(name, { path: '/' })
    cookie.value = null
  }
  if (import.meta.client) {
    document.cookie.split(';').forEach((c) => {
      const name = c.replace(/^ +/, '').split('=')[0]
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    })
  }
  return navigateTo('/')
}
</script>

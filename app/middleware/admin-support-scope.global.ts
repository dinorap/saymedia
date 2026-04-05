/**
 * admin_support chỉ dùng chat hỗ trợ + xem thông báo (khớp API assertShopManagementRole).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/admin')) return

  const role = useCookie('user_role', { path: '/' }).value
  if (typeof role === 'undefined' && import.meta.client) return

  if (String(role || '') !== 'admin_support') return

  const p = to.path
  if (
    p === '/admin/support' ||
    p.startsWith('/admin/support/') ||
    p === '/admin/announcements' ||
    p.startsWith('/admin/announcements/')
  ) {
    return
  }

  return navigateTo('/admin/support')
})

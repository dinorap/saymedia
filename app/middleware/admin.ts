export default defineNuxtRouteMiddleware(() => {
  // user_role được set ở `path: "/"` trong LoginModal, nên middleware cũng phải đọc đúng path
  // để tránh trường hợp role đọc được là `null/undefined` trong một số pha SSR/hydration => redirect vòng.
  const role = useCookie('user_role', { path: '/' }).value

  // Trường hợp role chưa được hydrate xong trên client: không redirect ngay để tránh nháy trang.
  if (typeof role === 'undefined' && import.meta.client) return

  const r = String(role || '')
  if (!r || !["admin_0", "admin_1", "admin_support", "admin_2"].includes(r)) {
    return navigateTo('/login')
  }
})

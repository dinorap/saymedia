export default defineNuxtRouteMiddleware(() => {
  const role = useCookie('user_role').value

  if (!role || !String(role).startsWith('admin')) {
    return navigateTo('/login')
  }
})

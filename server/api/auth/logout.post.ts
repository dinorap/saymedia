export default defineEventHandler((event) => {
  deleteCookie(event, 'auth_token', { path: '/' })
  deleteCookie(event, 'user_role', { path: '/' })
  return { success: true }
})

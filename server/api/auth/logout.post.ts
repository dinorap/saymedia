export default defineEventHandler((event) => {
  const cookieOpts = { path: '/', sameSite: 'lax' as const }
  deleteCookie(event, 'auth_token', cookieOpts)
  deleteCookie(event, 'user_role', cookieOpts)
  return { success: true }
})

const DEFAULT_JWT_SECRET = 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

function mustSet(name: string) {
  const v = (process.env[name] || '').trim()
  if (!v) {
    throw new Error(`[security] Missing required env: ${name}`)
  }
  return v
}

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const jwtSecret = mustSet('JWT_SECRET')
  if (jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error('[security] JWT_SECRET must not use the default value in production')
  }

  const sepayKey = mustSet('SEPAY_WEBHOOK_API_KEY')
  if (sepayKey.length < 16) {
    throw new Error('[security] SEPAY_WEBHOOK_API_KEY looks too short; set a strong key in production')
  }
})


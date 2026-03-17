const DEFAULT_JWT_SECRET = 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim()

  // Production must always be explicitly configured.
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('[security] Missing required env: JWT_SECRET')
    }
    if (secret === DEFAULT_JWT_SECRET) {
      throw new Error('[security] JWT_SECRET must not use the default value in production')
    }
    return secret
  }

  // Dev/test fallback for convenience.
  return secret || DEFAULT_JWT_SECRET
}


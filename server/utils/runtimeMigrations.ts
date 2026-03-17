export function assertRuntimeMigrationsAllowed(feature: string) {
  // In production, runtime migrations should be disabled by default.
  // Enable explicitly via ALLOW_RUNTIME_MIGRATIONS=true when you really need it.
  const isProd = process.env.NODE_ENV === 'production'
  const allow =
    !isProd || String(process.env.ALLOW_RUNTIME_MIGRATIONS || '').toLowerCase() === 'true'
  if (!allow) {
    throw new Error(
      `[migration] Runtime migrations disabled in production (${feature}). ` +
        `Run migrations during deploy or set ALLOW_RUNTIME_MIGRATIONS=true temporarily.`,
    )
  }
}


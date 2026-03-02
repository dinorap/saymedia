import { ensureAuditSchema } from '../utils/audit'

export default defineNitroPlugin(async () => {
  try {
    await ensureAuditSchema()
  } catch (e) {
    console.error('[audit] Failed to ensure schema', e)
  }
})


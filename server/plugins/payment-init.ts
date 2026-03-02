import { ensurePaymentSchema } from '../utils/payment'

export default defineNitroPlugin(async () => {
  try {
    await ensurePaymentSchema()
  } catch (e) {
    console.error('[payment-init] cannot ensure schema:', e)
  }
})


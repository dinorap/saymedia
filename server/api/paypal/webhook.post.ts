import { handlePaypalWebhook } from '../../utils/paypal'

export default defineEventHandler(async (event) => {
  const transmissionId = String(getHeader(event, 'paypal-transmission-id') || '').trim()
  const transmissionTime = String(getHeader(event, 'paypal-transmission-time') || '').trim()
  const transmissionSig = String(getHeader(event, 'paypal-transmission-sig') || '').trim()
  const certUrl = String(getHeader(event, 'paypal-cert-url') || '').trim()
  const authAlgo = String(getHeader(event, 'paypal-auth-algo') || '').trim()

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Thiếu header webhook từ PayPal',
    })
  }

  const webhookEvent = await readBody(event)
  const result = await handlePaypalWebhook({
    headers: {
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl,
      authAlgo,
    },
    webhookEvent,
  })

  return {
    success: true,
    ...result,
  }
})

import jwt from 'jsonwebtoken'
import { capturePaypalDepositOrder } from '../../../utils/paypal'
import { getJwtSecret } from '../../../utils/jwt'
import { isCustomerRole } from '../../../utils/authHelpers'

const JWT_SECRET = getJwtSecret()

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  let decoded: { id: number; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Phiên đăng nhập hết hạn',
    })
  }

  if (!isCustomerRole(decoded.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Chỉ người dùng mới nạp tiền được',
    })
  }

  const body = await readBody<{ order_id?: string }>(event)
  const orderId = String(body?.order_id || '').trim()
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu order_id' })
  }

  const result = await capturePaypalDepositOrder(decoded.id, orderId)

  return {
    success: true,
    alreadyCompleted: result.alreadyCompleted,
    amount: result.amount,
    credited: result.credited,
  }
})


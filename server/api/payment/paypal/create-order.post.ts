import jwt from 'jsonwebtoken'
import { createPaypalDepositOrder } from '../../../utils/paypal'
import { parseBodyOrThrow, paymentPaypalSchema } from '../../../utils/schemas'
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

  const body = parseBodyOrThrow(await readBody(event), paymentPaypalSchema)

  const out = await createPaypalDepositOrder(
    decoded.id,
    body.amount,
    (body as any).promo_code || null,
  )

  return {
    success: true,
    order_id: out.orderId,
    trans_id: out.transId,
    amount_vnd: out.amountVnd,
    currency: out.currency,
  }
})


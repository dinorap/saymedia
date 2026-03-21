import pool from './db'
import { convertVndToCredit, ensurePaymentSchema, PAYMENT_EXPIRE_MINUTES } from './payment'
import { ensureCreditLedgerSchema, applyDepositCredit } from './creditLedger'
import { addAuditLog } from './audit'
import { addDepositSocialProofItem } from './socialProof'
import crypto from 'crypto'

const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox'
const PAYPAL_API_BASE =
  PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || ''
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || 'USD'
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || ''

// Tỷ giá VND cho 1 đơn vị tiền PayPal (thường là 1 USD) – mặc định từ .env.
// Ta sẽ dùng nó làm fallback nếu API tỷ giá thị trường lỗi.
const DEFAULT_PAYPAL_VND_RATE = Number(process.env.PAYPAL_VND_RATE || '24000') || 24000

let cachedUsdVndRate = DEFAULT_PAYPAL_VND_RATE
let cachedUsdVndFetchedAt = 0
const certPemCache = new Map<string, { pem: string; expiresAt: number }>()
const WEBHOOK_CERT_CACHE_MS = 6 * 60 * 60 * 1000

function crc32Decimal(input: string) {
  let crc = 0 ^ -1
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i)
    crc ^= c
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ -1) >>> 0
}

function isTrustedPaypalCertUrl(url: string) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return (
      host === 'api-m.paypal.com' ||
      host === 'api-m.sandbox.paypal.com' ||
      host === 'api.paypal.com' ||
      host === 'api.sandbox.paypal.com'
    )
  } catch {
    return false
  }
}

async function getPaypalCertPem(certUrl: string) {
  if (!isTrustedPaypalCertUrl(certUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'paypal-cert-url không hợp lệ' })
  }

  const cached = certPemCache.get(certUrl)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.pem

  const res = await fetch(certUrl)
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Không tải được chứng chỉ PayPal' })
  }
  const pem = await res.text()
  certPemCache.set(certUrl, { pem, expiresAt: now + WEBHOOK_CERT_CACHE_MS })
  return pem
}

async function getUsdVndRate() {
  const now = Date.now()
  // Cache 30 phút để tránh gọi API quá nhiều
  if (cachedUsdVndRate && now - cachedUsdVndFetchedAt < 30 * 60 * 1000) {
    return cachedUsdVndRate
  }

  try {
    // Dùng API khác ổn định hơn, trả JSON dạng { result: 'success', rates: { VND: ... } }
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) {
      throw new Error(`fx http ${res.status}`)
    }
    const data: any = await res.json()
    const rate = Number(data?.rates?.VND || 0)
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('invalid fx data')
    }
    cachedUsdVndRate = rate
    cachedUsdVndFetchedAt = now
    return rate
  } catch (err) {
    // Không chặn thanh toán nếu API tỷ giá lỗi – chỉ fallback về cấu hình cố định.
    console.warn('[paypal] getUsdVndRate failed, fallback to DEFAULT')
    // Fallback: dùng giá trị .env, vẫn đảm bảo > 0
    cachedUsdVndRate = DEFAULT_PAYPAL_VND_RATE
    cachedUsdVndFetchedAt = now
    return DEFAULT_PAYPAL_VND_RATE
  }
}

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Chưa cấu hình PAYPAL_CLIENT_ID/PAYPAL_SECRET',
    })
  }

  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('PayPal auth error', text)
    throw createError({ statusCode: 502, statusMessage: 'Không kết nối được PayPal' })
  }

  const data: any = await res.json()
  return data.access_token as string
}

async function verifyPayPalWebhookSignature(
  headers: {
    transmissionId: string
    transmissionTime: string
    transmissionSig: string
    certUrl: string
    authAlgo: string
  },
  rawBody: string,
) {
  if (!PAYPAL_WEBHOOK_ID) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Chưa cấu hình PAYPAL_WEBHOOK_ID',
    })
  }

  const crc32 = crc32Decimal(rawBody)
  const message = `${headers.transmissionId}|${headers.transmissionTime}|${PAYPAL_WEBHOOK_ID}|${crc32}`
  const certPem = await getPaypalCertPem(headers.certUrl)
  const signatureBuffer = Buffer.from(headers.transmissionSig, 'base64')

  const algo = String(headers.authAlgo || '').toUpperCase()
  const verifyAlgo = algo.includes('SHA512')
    ? 'RSA-SHA512'
    : algo.includes('SHA1')
      ? 'RSA-SHA1'
      : 'RSA-SHA256'

  const verifier = crypto.createVerify(verifyAlgo)
  verifier.update(message)
  verifier.end()
  return verifier.verify(certPem, signatureBuffer)
}

function extractOrderIdFromWebhookEvent(webhookEvent: any) {
  const eventType = String(webhookEvent?.event_type || '')
  const resource = webhookEvent?.resource || {}
  if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'CHECKOUT.ORDER.COMPLETED') {
    return String(resource?.id || '').trim()
  }
  if (eventType.startsWith('PAYMENT.CAPTURE.')) {
    return String(resource?.supplementary_data?.related_ids?.order_id || '').trim()
  }
  return ''
}

async function getUserIdByPaypalOrderId(orderId: string) {
  const [[tx]]: any = await pool.query(
    `
      SELECT user_id
      FROM payment_transactions
      WHERE provider = 'paypal'
        AND provider_payment_id = ?
      LIMIT 1
    `,
    [orderId],
  )
  return Number(tx?.user_id || 0) || 0
}

export async function createPaypalDepositOrder(
  userId: number,
  amountVnd: number,
  promoCode?: string | null,
) {
  if (!amountVnd || amountVnd <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Số tiền không hợp lệ' })
  }

  await ensurePaymentSchema()

  // Chỉ là mã nội bộ để đối soát, không hiển thị cho khách.
  const internalId = crypto.randomBytes(8).toString('hex').toUpperCase()

  const accessToken = await getPayPalAccessToken()

  const usdVndRate = await getUsdVndRate()
  const providerAmount = Number((amountVnd / usdVndRate).toFixed(2))

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: internalId,
          amount: {
            currency_code: PAYPAL_CURRENCY,
            value: providerAmount.toFixed(2),
          },
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('PayPal create order error', text)
    throw createError({ statusCode: 502, statusMessage: 'Tạo đơn PayPal thất bại' })
  }

  const data: any = await res.json()

  // Lưu giao dịch nạp tiền dạng "paypal" với amount lưu theo VND.
  await pool.query(
    `
      INSERT INTO payment_transactions
        (trans_id, user_id, amount, status, memo, provider, currency, provider_payment_id, promo_code)
      VALUES (?, ?, ?, 'pending', ?, 'paypal', ?, ?, ?)
    `,
    [
      internalId,
      userId,
      amountVnd,
      `PAYPAL-${internalId}`,
      PAYPAL_CURRENCY,
      data.id,
      promoCode || null,
    ],
  )

  return {
    orderId: data.id as string,
    transId: internalId,
    amountVnd,
    currency: PAYPAL_CURRENCY,
  }
}

async function finalizePaypalDepositOrder(
  userId: number,
  orderId: string,
  source: 'paypal_capture' | 'paypal_webhook' = 'paypal_capture',
) {
  await ensurePaymentSchema()
  await ensureCreditLedgerSchema()

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu orderId' })
  }

  const conn = await pool.getConnection()
  let credited = 0
  let userIdForFeed: number | null = null
  let vndAmount = 0
  let transId: string | null = null
  let bonusCredit = 0

  try {
    await conn.beginTransaction()

    const [[tx]]: any = await conn.query(
      `
        SELECT *
        FROM payment_transactions
        WHERE provider = 'paypal'
          AND provider_payment_id = ?
          AND user_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderId, userId],
    )

    if (!tx) {
      await conn.rollback()
      throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy giao dịch PayPal' })
    }

    if (tx.status === 'success') {
      await conn.rollback()
      return { alreadyCompleted: true, amount: tx.actual_amount || tx.amount, transId: tx.trans_id }
    }

    const createdAt = tx.created_at instanceof Date ? tx.created_at : new Date(tx.created_at)
    const ageMs = Date.now() - createdAt.getTime()
    if (ageMs > PAYMENT_EXPIRE_MINUTES * 60 * 1000) {
      await conn.query(
        `UPDATE payment_transactions SET status = 'cancelled' WHERE id = ?`,
        [tx.id],
      )
      await conn.commit()
      throw createError({
        statusCode: 400,
        statusMessage: 'Giao dịch đã hết hạn, vui lòng tạo đơn nạp mới',
      })
    }

    vndAmount = Number(tx.amount || 0)
    transId = tx.trans_id

    const converted = convertVndToCredit(vndAmount)
    credited = converted.credit
    if (credited <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Số tiền nạp chưa đủ để quy đổi tín chỉ (1 tín chỉ = ${converted.vndPerCredit.toLocaleString(
          'vi-VN',
        )}đ)`,
      })
    }
    const promoCode: string | null = tx.promo_code || null
    if (promoCode && credited > 0) {
      const [[promo]]: any = await conn.query(
        `
          SELECT *
          FROM deposit_promotions
          WHERE code = ?
            AND (starts_at IS NULL OR starts_at <= NOW())
            AND (ends_at IS NULL OR ends_at >= NOW())
            AND (
              daily_start_time IS NULL
              OR daily_end_time IS NULL
              OR (TIME(NOW()) BETWEEN daily_start_time AND daily_end_time)
            )
          LIMIT 1
        `,
        [promoCode],
      )

      if (promo) {
        const minAmountOk =
          !promo.min_amount || Number(vndAmount) >= Number(promo.min_amount || 0)

        if (minAmountOk) {
          const [[usageRow]]: any = await conn.query(
            `
              SELECT
                SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS user_uses,
                COUNT(*) AS total_uses
              FROM payment_transactions
              WHERE promo_code = ?
                AND status = 'success'
            `,
            [tx.user_id, promoCode],
          )

          const userUses = Number(usageRow?.user_uses || 0)
          const totalUses = Number(usageRow?.total_uses || 0)
          const underUserLimit =
            !promo.max_uses_per_user || userUses < Number(promo.max_uses_per_user || 0)
          const underTotalLimit =
            !promo.max_total_uses || totalUses < Number(promo.max_total_uses || 0)

          if (underUserLimit && underTotalLimit) {
            const [[tier]]: any = await conn.query(
              `
                SELECT *
                FROM deposit_promo_tiers
                WHERE promo_id = ?
                  AND min_amount <= ?
                  AND (max_amount IS NULL OR max_amount > ?)
                ORDER BY min_amount DESC
                LIMIT 1
              `,
              [promo.id, vndAmount, vndAmount],
            )

            const basePercent = Number(promo.bonus_percent || 0)
            const baseFixed = Number(promo.bonus_credit || 0)

            const percent = tier
              ? Number(tier.bonus_percent || basePercent)
              : basePercent
            const fixedBonus = tier
              ? Number(tier.bonus_credit || baseFixed)
              : baseFixed

            const percentBonus =
              percent > 0 ? Math.floor((credited * percent) / 100) : 0
            bonusCredit = percentBonus + (fixedBonus > 0 ? fixedBonus : 0)
            if (bonusCredit < 0) bonusCredit = 0
            credited += bonusCredit
          }
        }
      }
    }
    await conn.query(
      `
        UPDATE payment_transactions
        SET status = 'success',
            actual_amount = ?,
            credit_amount = ?,
            promo_bonus_credit = ?
        WHERE id = ?
      `,
      [vndAmount, credited, bonusCredit || null, tx.id],
    )

    const baseCredit = credited - (bonusCredit || 0)
    await applyDepositCredit(conn, {
      userId: tx.user_id,
      paidCredit: baseCredit,
      bonusCredit: bonusCredit || 0,
      referenceType: 'payment_transaction',
      referenceId: tx.trans_id,
      note: `Nạp qua PayPal (${vndAmount.toLocaleString('vi-VN')}đ)`,
      actorType: 'system',
    })

    userIdForFeed = tx.user_id

    await conn.commit()
  } catch (e) {
    try {
      await conn.rollback()
    } catch {}
    throw e
  } finally {
    conn.release()
  }

  if (userIdForFeed) {
    try {
      const [[user]]: any = await pool.query(
        `
          SELECT username
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        [userIdForFeed],
      )

      const rawName = String(user?.username || '').trim()
      let displayName = 'Khách hàng'
      if (rawName) {
        if (rawName.length <= 3) {
          displayName = `${rawName[0]}***`
        } else {
          displayName = `${rawName[0]}***${rawName[rawName.length - 1]}`
        }
      }

      await addDepositSocialProofItem(displayName, vndAmount, false)
    } catch {
      // Không làm hỏng giao dịch nếu feed lỗi
    }
  }

  await addAuditLog({
    actorType: 'system',
    action: 'payment_success',
    targetType: 'payment_transaction',
    targetId: transId || orderId,
    metadata: {
      amount: vndAmount,
      credited,
      // có thể 0 nếu không có khuyến mãi
      bonus_credit: bonusCredit || 0,
      user_id: userId,
      source,
    },
  })

  return {
    alreadyCompleted: false,
    amount: vndAmount,
    credited,
    transId,
  }
}

export async function capturePaypalDepositOrder(userId: number, orderId: string) {
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Thiếu orderId' })
  }

  const accessToken = await getPayPalAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('PayPal capture error', text)
    throw createError({ statusCode: 502, statusMessage: 'Xác nhận thanh toán PayPal thất bại' })
  }

  const data: any = await res.json()
  const status = data.status
  if (status !== 'COMPLETED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Thanh toán PayPal chưa hoàn tất',
    })
  }

  return finalizePaypalDepositOrder(userId, orderId, 'paypal_capture')
}

export async function handlePaypalWebhook(input: {
  headers: {
    transmissionId: string
    transmissionTime: string
    transmissionSig: string
    certUrl: string
    authAlgo: string
  }
  rawBody: string
  webhookEvent: any
}) {
  const { headers, rawBody, webhookEvent } = input

  const isValid = await verifyPayPalWebhookSignature(headers, rawBody)
  if (!isValid) {
    throw createError({ statusCode: 400, statusMessage: 'Webhook PayPal không hợp lệ' })
  }

  const eventType = String(webhookEvent?.event_type || '')
  if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
    return {
      ok: true,
      ignored: true,
      reason: `Unsupported event_type: ${eventType || 'unknown'}`,
    }
  }

  const resourceStatus = String(webhookEvent?.resource?.status || '').toUpperCase()
  if (resourceStatus && resourceStatus !== 'COMPLETED') {
    return {
      ok: true,
      ignored: true,
      reason: `Capture status is not COMPLETED: ${resourceStatus}`,
    }
  }

  const orderId = extractOrderIdFromWebhookEvent(webhookEvent)
  if (!orderId) {
    return {
      ok: true,
      ignored: true,
      reason: 'Missing order_id in webhook event',
    }
  }

  const userId = await getUserIdByPaypalOrderId(orderId)
  if (!userId) {
    return {
      ok: true,
      ignored: true,
      reason: 'Order not found in local transactions',
    }
  }

  const captureResult = await finalizePaypalDepositOrder(userId, orderId, 'paypal_webhook')
  return {
    ok: true,
    ignored: false,
    eventType,
    orderId,
    captureResult,
  }
}


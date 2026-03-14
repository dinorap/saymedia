import pool from '../../utils/db'
import {
  ensureProductKeySchema,
  VALID_KEY_DURATIONS,
  type ProductKeyDuration,
} from '../../utils/productKeys'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  await ensureProductKeySchema()

  const body = await readBody(event)
  const rawProductName = String(body?.product_name || '').trim()
  const rawDuration = String(body?.valid_duration || '').trim() as ProductKeyDuration
  const rawPrice = Number(body?.price ?? 0)
  const productId = body?.product_id ? Number(body.product_id) : null
  if (!rawProductName) {
    throw createError({ statusCode: 400, statusMessage: 'Tên sản phẩm không được để trống' })
  }
  if (!VALID_KEY_DURATIONS.includes(rawDuration)) {
    throw createError({ statusCode: 400, statusMessage: 'Thời hạn key không hợp lệ' })
  }
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Giá key không hợp lệ' })
  }

  // Chuẩn hoá danh sách key: có thể là 1 key hoặc mảng nhiều key
  let keys: string[] = []
  if (Array.isArray(body?.keys)) {
    keys = body.keys
      .map((k: any) => String(k || '').trim())
      .filter((k: string) => !!k)
  } else if (typeof body?.keys_text === 'string') {
    keys = String(body.keys_text || '')
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => !!k)
  } else if (body?.key) {
    const single = String(body.key || '').trim()
    if (single) keys = [single]
  }

  // Giới hạn để tránh spam
  keys = Array.from(new Set(keys)).slice(0, 2000)
  if (!keys.length) {
    throw createError({ statusCode: 400, statusMessage: 'Danh sách key trống' })
  }

  let finalProductId: number | null = null
  if (Number.isFinite(productId) && productId && productId > 0) {
    const [[product]]: any = await pool.query(
      'SELECT id, name FROM products WHERE id = ? LIMIT 1',
      [productId],
    )
    if (product) {
      finalProductId = product.id
    }
  }

  let inserted = 0
  let skipped = 0

  for (const k of keys) {
    try {
      await pool.query(
        `
          INSERT INTO product_keys (product_id, product_name, \`key\`, valid_duration, price)
          VALUES (?, ?, ?, ?, ?)
        `,
        [finalProductId, rawProductName, k, rawDuration, Math.round(rawPrice)],
      )
      inserted++
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
        skipped++
        continue
      }
      throw e
    }
  }

  return {
    success: true,
    inserted,
    skipped,
  }
})


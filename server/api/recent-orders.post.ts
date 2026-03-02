import { addSocialProofItem } from '../utils/socialProof'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const product = String(body?.product || '').trim()
  const isFake = Boolean(body?.isFake)

  if (!name || !product) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Thiếu tên hoặc sản phẩm',
    })
  }

  await addSocialProofItem(name, product, isFake)

  return { success: true }
})


import { ensureChatSchema } from '../../utils/chat'
import pool from '../../utils/db'
import { requireAuth } from '../../utils/authHelpers'
import { checkRateLimit, rateLimitKey } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const decoded = requireAuth(event)
  checkRateLimit({
    key: rateLimitKey(['chat', decoded.id]),
    max: 10,
    windowMs: 30_000,
    statusMessage: 'Bạn chat quá nhanh, vui lòng thử lại sau.',
    auditAction: 'rate_limited_chat',
    auditMetadata: { user_id: decoded.id },
  })

  const body = await readBody(event)
  let content = String(body?.content || '').trim()
  const imageUrl = String(body?.imageUrl || '').trim()

  const safeImageUrl = imageUrl && imageUrl.startsWith('/uploads/chat/')
    ? imageUrl
    : ''

  if (!content && !safeImageUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Nội dung hoặc ảnh là bắt buộc.' })
  }

  if (content.length > 500) {
    content = content.slice(0, 500)
  }

  await ensureChatSchema()

  const authorId = decoded.id
  const authorRole = decoded.role || 'user'
  const authorName = decoded.username || 'Khách'

  await pool.query(
    `
      INSERT INTO community_messages (author_id, author_role, author_name, content, image_url)
      VALUES (?, ?, ?, ?, ?)
    `,
    [authorId, authorRole, authorName, content || '', safeImageUrl || null],
  )

  return { success: true }
})


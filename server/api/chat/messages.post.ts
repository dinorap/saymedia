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
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: 'Nội dung trống.' })
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
      INSERT INTO community_messages (author_id, author_role, author_name, content)
      VALUES (?, ?, ?, ?)
    `,
    [authorId, authorRole, authorName, content],
  )

  return { success: true }
})


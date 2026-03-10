import jwt from 'jsonwebtoken'
import { ensureChatSchema } from '../../utils/chat'
import pool from '../../utils/db'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Bạn cần đăng nhập để chat.' })
  }

  let decoded: { id: number; username: string; role: string }
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Phiên đăng nhập hết hạn.' })
  }

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


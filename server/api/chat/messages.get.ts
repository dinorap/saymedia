import jwt from 'jsonwebtoken'
import pool from '../../utils/db'
import { ensureChatSchema, ChatMessageRow } from '../../utils/chat'

const JWT_SECRET = process.env.JWT_SECRET || 'chuoi_bi_mat_jwt_ngau_nhien_cua_sep_123456'

export default defineEventHandler(async (event) => {
  await ensureChatSchema()

  // Không bắt buộc đăng nhập để đọc, nhưng nếu có token thì decode để future dùng (nếu cần)
  const token = getCookie(event, 'auth_token')
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET)
    } catch {
      // ignore
    }
  }

  const limit = 100

  const [rows]: any = await pool.query(
    `
      SELECT id, author_id, author_role, author_name, content, created_at
      FROM community_messages
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  )

  const items: ChatMessageRow[] = rows || []

  // trả ngược lại theo thời gian tăng dần cho dễ đọc
  return items
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorRole: m.author_role,
      authorName: m.author_name,
      content: m.content,
      createdAt: m.created_at,
    }))
}
)


import pool from '../../utils/db'
import { ensureServicesSchema } from '../../utils/services'

const MAX_NAME = 120
const MAX_DESCRIPTION = 2000

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  await ensureServicesSchema()

  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, MAX_NAME)
  const description = (String(body?.description || '').trim() || null)?.slice(0, MAX_DESCRIPTION) || null
  const isActive = body?.is_active === false ? 0 : 1

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Tên dịch vụ là bắt buộc' })
  }

  const [result]: any = await pool.query(
    `
      INSERT INTO services (admin_id, name, description, is_active)
      VALUES (?, ?, ?, ?)
    `,
    [currentUser.id, name, description, isActive],
  )

  return {
    success: true,
    id: result.insertId,
  }
})

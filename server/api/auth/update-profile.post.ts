import pool from '../../utils/db'
import { requireUser } from '../../utils/authHelpers'
import { ensureUserProfileSchema } from '../../utils/userProfile'
import { addAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event)

  await ensureUserProfileSchema()

  const body = await readBody(event)
  const display_name = String(body?.display_name ?? '').trim()
  const phone = String(body?.phone ?? '').trim()

  if (!display_name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Vui lòng nhập tên người dùng.',
    })
  }
  if (!phone) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Vui lòng nhập số điện thoại.',
    })
  }

  await pool.query(
    'UPDATE users SET display_name = ?, phone = ? WHERE id = ?',
    [display_name, phone, decoded.id],
  )

  await addAuditLog({
    actorType: 'user',
    actorId: decoded.id,
    action: 'update_user_profile_info',
    targetType: 'user',
    targetId: decoded.id,
    metadata: { display_name, phoneMasked: phone.slice(0, 3) + '***' },
  })

  return {
    success: true,
    user: {
      display_name,
      phone,
    },
  }
})


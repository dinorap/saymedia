import pool from '../../../utils/db'
import { addAuditLog } from '../../../utils/audit'
import { resolveShopAdminId } from '../../../utils/adminHierarchy'
import { assertShopManagementRole } from '../../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }
  assertShopManagementRole(currentUser.role)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID đơn hàng không hợp lệ' })
  }

  const [[order]]: any = await pool.query(
    'SELECT id, admin_id FROM orders WHERE id = ? LIMIT 1',
    [id],
  )
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn hàng' })
  }
  if (currentUser.role === 'admin_1' && order.admin_id !== currentUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Bạn chỉ được sửa đơn hàng do mình phụ trách',
    })
  }
  if (currentUser.role === 'admin_2') {
    const shopId = await resolveShopAdminId(currentUser.id, currentUser.role)
    const [[vis]]: any = await pool.query(
      `
        SELECT o.id
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
          AND (
            u.admin_id = ?
            OR o.seller_admin_id = ?
            OR o.product_owner_admin_id = ?
          )
        LIMIT 1
      `,
      [id, shopId, currentUser.id, shopId],
    )
    if (!vis) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Bạn không có quyền sửa đơn hàng này',
      })
    }
  }

  const body = await readBody(event).catch(() => ({}))
  const rawNote = body?.note != null ? String(body.note) : undefined
  const status = body?.status != null ? String(body.status).trim() : undefined

  const MAX_NOTE_LENGTH = 5000
  const note = rawNote !== undefined
    ? (rawNote || null) && rawNote.length > MAX_NOTE_LENGTH
      ? rawNote.slice(0, MAX_NOTE_LENGTH)
      : (rawNote || null)
    : undefined

  const updates: string[] = []
  const values: any[] = []

  if (note !== undefined) {
    updates.push('note = ?')
    values.push(note)
  }
  if (status !== undefined) {
    const allowed = ['pending', 'completed', 'cancelled']
    if (!allowed.includes(status)) {
      throw createError({ statusCode: 400, statusMessage: 'Trạng thái không hợp lệ' })
    }
    updates.push('status = ?')
    values.push(status)
  }

  if (updates.length === 0) {
    return { success: true }
  }

  values.push(id)
  const [result]: any = await pool.query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
    values,
  )

  if (!result?.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy đơn hàng' })
  }

  // Ghi log audit khi admin sửa đơn (note/status)
  try {
    await addAuditLog({
      actorType: 'admin',
      actorId: currentUser.id,
      action: 'order_update',
      targetType: 'order',
      targetId: id,
      metadata: {
        updatedFields: updates,
      },
    })
  } catch {}

  return { success: true }
})

import pool from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser || currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới sửa được admin' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const body = await readBody(event)
  const { role, is_active } = body

  const updates: string[] = []
  const params: any[] = []

  if (role !== undefined) {
    const r = role === 'admin_0' ? 'admin_0' : 'admin_1'
    updates.push('role = ?')
    params.push(r)
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?')
    params.push(is_active ? 1 : 0)
  }

  if (updates.length === 0) {
    return { success: true, message: 'Không có thay đổi' }
  }

  params.push(id)
  await pool.query(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`, params)
  return { success: true, message: 'Cập nhật thành công' }
})

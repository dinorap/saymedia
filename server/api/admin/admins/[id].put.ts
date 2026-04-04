import bcrypt from 'bcryptjs'
import pool from '../../../utils/db'
import { addAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser || currentUser.role !== 'admin_0') {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ Super Admin mới sửa được admin' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const body = await readBody(event)
  const { role, is_active, password } = body

  const updates: string[] = []
  const params: any[] = []
  let didChangePassword = false

  if (role !== undefined) {
    let r: 'admin_0' | 'admin_1' | 'admin_2'
    if (role === 'admin_0') {
      r = 'admin_0'
    } else if (role === 'admin_2') {
      r = 'admin_2'
    } else {
      r = 'admin_1'
    }
    updates.push('role = ?')
    params.push(r)
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?')
    params.push(is_active ? 1 : 0)
  }

  if (password !== undefined) {
    const pwd = String(password).trim()
    if (pwd.length > 0) {
      if (pwd.length < 6) {
        throw createError({ statusCode: 400, statusMessage: 'Mật khẩu mới tối thiểu 6 ký tự!' })
      }
      const hashedPassword = await bcrypt.hash(pwd, 10)
      updates.push('password_hash = ?')
      params.push(hashedPassword)
      didChangePassword = true
    }
  }

  if (updates.length === 0) {
    return { success: true, message: 'Không có thay đổi' }
  }

  params.push(id)
  await pool.query(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`, params)

  if (didChangePassword) {
    await addAuditLog({
      actorType: 'admin',
      actorId: currentUser.id,
      action: 'admin_change_admin_password',
      targetType: 'admin',
      targetId: String(id),
    })
  }

  return { success: true, message: 'Cập nhật thành công' }
})

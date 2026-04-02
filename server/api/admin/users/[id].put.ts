import bcrypt from 'bcryptjs'
import pool from '../../../utils/db'
import { addAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Thiếu id' })

  const body = await readBody(event)
  const { admin_id, status, password } = body

  const [existing]: any = await pool.query('SELECT id, admin_id FROM users WHERE id = ?', [id])
  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Người dùng không tồn tại' })
  }

  if (currentUser.role === 'admin_1' && existing[0].admin_id !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'Chỉ sửa được người dùng của mình' })
  }

  const updates: string[] = []
  const params: any[] = []
  let didChangePassword = false

  if (admin_id !== undefined && currentUser.role === 'admin_0') {
    const aid = parseInt(admin_id, 10)
    if (!isNaN(aid)) {
      updates.push('admin_id = ?')
      params.push(aid)
    }
  }
  if (status !== undefined) {
    const s = status === 'blocked' ? 'blocked' : 'active'
    updates.push('status = ?')
    params.push(s)
  }

  // Admin_0 có thể đổi password của user trực tiếp (không cần password cũ).
  if (password !== undefined) {
    if (currentUser.role !== 'admin_0') {
      throw createError({ statusCode: 403, statusMessage: 'Chỉ admin_0 được đổi mật khẩu người dùng' })
    }
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
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

  if (didChangePassword) {
    await addAuditLog({
      actorType: 'admin',
      actorId: currentUser.id,
      action: 'admin_change_user_password',
      targetType: 'user',
      targetId: id,
    })
  }
  return { success: true, message: 'Cập nhật thành công' }
})

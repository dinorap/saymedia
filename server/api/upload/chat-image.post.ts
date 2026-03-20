import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'
import crypto from 'node:crypto'
import { requireAuth } from '../../utils/authHelpers'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 1
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export default defineEventHandler(async (event) => {
  // Bảo vệ endpoint upload để tránh spam/abuse.
  requireAuth(event)

  const form = await readMultipartFormData(event)
  if (!form || !form.length) {
    throw createError({ statusCode: 400, statusMessage: 'Không có file upload' })
  }
  if (form.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      statusMessage: `Tối đa ${MAX_FILES} file mỗi lần upload`,
    })
  }

  const part = form.find((p) => p?.filename && p?.data)
  if (!part?.filename || !part.data) {
    throw createError({ statusCode: 400, statusMessage: 'File không hợp lệ' })
  }

  if (part.data.length > MAX_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ảnh quá lớn, tối đa 10MB',
    })
  }

  const originalExt = extname(part.filename || '').toLowerCase()
  if (!ALLOWED_EXT.has(originalExt)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Phần mở rộng file phải là .jpg/.jpeg/.png/.webp/.gif',
    })
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat')
  await fs.mkdir(uploadDir, { recursive: true })

  const fileName =
    crypto.randomBytes(16).toString('hex') +
    Date.now().toString(36) +
    originalExt

  const filePath = join(uploadDir, fileName)
  await fs.writeFile(filePath, part.data)

  // Trả URL tĩnh để client gửi lại cho WS/REST.
  return {
    success: true,
    url: `/uploads/chat/${fileName}`,
  }
})


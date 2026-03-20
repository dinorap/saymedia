import { createReadStream, promises as fs } from 'node:fs'
import { resolve, sep } from 'node:path'
import { sendStream } from 'h3'

export default defineEventHandler(async (event) => {
  const rawPathParam = event.context.params?.path

  const relPath = Array.isArray(rawPathParam)
    ? rawPathParam.join('/')
    : typeof rawPathParam === 'string'
      ? rawPathParam
      : ''

  const safeRelPath = relPath.replace(/^[/\\]+/, '')
  if (!safeRelPath) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Prefer serving from build output in production.
  const outputUploadsRoot = resolve(process.cwd(), '.output', 'public', 'uploads')
  const devUploadsRoot = resolve(process.cwd(), 'public', 'uploads')

  let uploadsRoot = devUploadsRoot
  try {
    const st = await fs.stat(outputUploadsRoot)
    if (st.isDirectory()) uploadsRoot = outputUploadsRoot
  } catch {
    // ignore; fall back to dev root
  }

  const filePath = resolve(uploadsRoot, safeRelPath)
  const rootPrefix = uploadsRoot.endsWith(sep) ? uploadsRoot : `${uploadsRoot}${sep}`
  if (!filePath.startsWith(rootPrefix)) {
    // Prevent ../ path traversal.
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  try {
    const st = await fs.stat(filePath)
    if (!st.isFile()) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' })
    }
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return sendStream(event, createReadStream(filePath))
})


import pool from '../../utils/db'
import { DEFAULT_VND_PER_CREDIT, getVndPerCredit } from '../../utils/payment'

export default defineEventHandler(async () => {
  // Public endpoint for UI to display correct expected credit.
  // Prefer DB setting if table exists; fallback to in-memory/env cache.
  let value = getVndPerCredit()
  try {
    const [[row]]: any = await pool.query(
      'SELECT vnd_per_credit FROM payment_settings WHERE id = 1 LIMIT 1',
    )
    if (row && Number(row.vnd_per_credit) > 0) {
      value = Math.round(Number(row.vnd_per_credit))
    }
  } catch {
    // ignore
  }

  return { success: true, vnd_per_credit: value || DEFAULT_VND_PER_CREDIT }
})


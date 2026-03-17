import pool from '../../utils/db'
import { ensureOrderRefundSchema } from '../../utils/orderRefund'
import { ensureCommerceSchema } from '../../utils/commerce'
import { requireUser } from '../../utils/authHelpers'

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event)

  await ensureOrderRefundSchema()
  await ensureCommerceSchema()

  let limit = 50
  const query = getQuery(event)
  if (query.limit) {
    const parsed = parseInt(String(query.limit), 10)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) {
      limit = parsed
    }
  }

  const [rows]: any = await pool.query(
    `
      SELECT
        o.id,
        o.admin_id,
        o.product_id,
        COALESCE(o.amount_credit, ROUND(o.amount)) AS amount,
        o.amount_credit,
        o.status,
        o.note,
        o.refund_reason,
        o.refunded_at,
        o.refund_request_reason,
        o.refund_requested_at,
        o.refund_request_status,
        o.created_at,
        p.name AS product_name,
        p.type AS product_type,
        p.download_url AS product_download_url
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT ?
    `,
    [decoded.id, limit],
  )

  return {
    success: true,
    data: rows,
  }
})


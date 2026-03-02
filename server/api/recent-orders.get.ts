import pool from '../utils/db'
import { ensureSocialProofSchema } from '../utils/socialProof'

/**
 * API công khai: lấy feed "Đơn hàng gần đây" (tối đa 20 bản ghi).
 * Ưu tiên đọc từ bảng recent_orders_feed để giữ trạng thái qua F5.
 */
export default defineEventHandler(async () => {
  try {
    await ensureSocialProofSchema()

    const [rows]: any = await pool.query(
      `
        SELECT id, display_name, item_name, is_fake, created_at
        FROM recent_orders_feed
        ORDER BY created_at DESC
        LIMIT 20
      `,
    )

    return rows.map((r: any) => ({
      id: `feed-${r.id}`,
      name: r.display_name,
      product: r.item_name,
      created_at: r.created_at,
      isFake: !!r.is_fake,
    }))
  } catch (e) {
    return []
  }
})


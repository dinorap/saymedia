import pool from '../utils/db'

/**
 * API công khai: lấy đơn hàng gần đây (completed) để hiển thị social proof.
 * Trả về: username, product (mô tả), timeAgo
 */
export default defineEventHandler(async () => {
  try {
    const [rows]: any = await pool.query(
      `SELECT o.id, o.amount, o.created_at, u.username
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.status = 'completed'
       ORDER BY o.created_at DESC
       LIMIT 20`
    )
    return rows.map((r: any) => {
      const minutes = Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000))
      return {
        id: `real-${r.id}`,
        name: r.username,
        product: `Dịch vụ ${Number(r.amount).toLocaleString('vi-VN')}đ`,
        minutes,
        isReal: true,
      }
    })
  } catch (e) {
    return []
  }
})

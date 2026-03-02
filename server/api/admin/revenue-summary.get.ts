import pool from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'Chưa đăng nhập' })
  }

  const isSuperAdmin = currentUser.role === 'admin_0'
  const scopeWhere = isSuperAdmin ? '' : ' WHERE o.admin_id = ?'
  const scopeParams = isSuperAdmin ? [] : [currentUser.id]

  const userWhere = isSuperAdmin ? '' : ' WHERE admin_id = ?'
  const userParams = isSuperAdmin ? [] : [currentUser.id]

  const [[usersRow]]: any = await pool.query(
    `SELECT COUNT(*) AS total_users FROM users${userWhere}`,
    userParams,
  )

  const [[ordersRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_amount
      FROM orders o
      ${scopeWhere}
    `,
    scopeParams,
  )

  const depositWhere = isSuperAdmin
    ? " WHERE pt.status = 'success'"
    : " WHERE pt.status = 'success' AND u.admin_id = ?"
  const depositParams = isSuperAdmin ? [] : [currentUser.id]
  const [[depositRow]]: any = await pool.query(
    `
      SELECT
        COUNT(*) AS successful_deposits,
        SUM(COALESCE(pt.actual_amount, pt.amount, 0)) AS total_deposit_amount
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${depositWhere}
    `,
    depositParams,
  )

  const [recentOrders]: any = await pool.query(
    `
      SELECT o.id, o.amount, o.status, o.created_at, u.username AS user_username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${scopeWhere}
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
    scopeParams,
  )

  const recentDepositWhere = isSuperAdmin
    ? ''
    : ' WHERE u.admin_id = ?'
  const [recentDeposits]: any = await pool.query(
    `
      SELECT
        pt.id,
        pt.amount,
        pt.actual_amount,
        pt.status,
        pt.created_at,
        u.username AS user_username
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.id
      ${recentDepositWhere}
      ORDER BY pt.created_at DESC
      LIMIT 5
    `,
    isSuperAdmin ? [] : [currentUser.id],
  )

  return {
    success: true,
    data: {
      totalUsers: Number(usersRow?.total_users || 0),
      totalOrders: Number(ordersRow?.total_orders || 0),
      completedOrders: Number(ordersRow?.completed_orders || 0),
      completedAmount: Number(ordersRow?.completed_amount || 0),
      successfulDeposits: Number(depositRow?.successful_deposits || 0),
      totalDepositAmount: Number(depositRow?.total_deposit_amount || 0),
      recentOrders,
      recentDeposits,
      isSuperAdmin,
    },
  }
})


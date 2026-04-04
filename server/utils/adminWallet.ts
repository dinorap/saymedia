import type { PoolConnection } from "mysql2/promise";
import pool from "./db";
import { applyDepositCredit } from "./creditLedger";

let schemaReady = false

export type AdminWalletType =
  | "sale_commission"   // Hoa hồng shop bán hộ
  | "product_revenue"   // Doanh thu chủ/shop (phần còn lại sau commission)
  | "payout"            // admin_0 đã chuyển tiền cho shop (âm)
  | "adjust"            // Điều chỉnh thủ công

export async function ensureAdminWalletSchema() {
  if (schemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_wallet (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      amount_credit BIGINT NOT NULL,
      wallet_type VARCHAR(30) NOT NULL,
      order_id INT NULL,
      reference_type VARCHAR(50) NULL,
      reference_id VARCHAR(100) NULL,
      note TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_wallet_admin_id (admin_id),
      INDEX idx_admin_wallet_created_at (created_at),
      INDEX idx_admin_wallet_order_id (order_id),
      INDEX idx_admin_wallet_type (wallet_type)
    )
  `)

  schemaReady = true
}

/**
 * Ghi doanh thu/hoa hồng sau khi đơn hoàn thành.
 * Chỉ tính trên paid_part (bonus không chia).
 * - Sản phẩm chủ (master): seller != owner → shop ăn commission %, chủ ăn phần còn lại.
 * - Sản phẩm shop (seller = owner): shop ăn 100% paid_part.
 */
export async function recordOrderEarnings(
  conn: PoolConnection,
  payload: {
    orderId: number
    sellerAdminId: number
    productOwnerAdminId: number
    paidPartCredit: number
    commissionPercent: number | null
    productName?: string
  }
) {
  const { orderId, sellerAdminId, productOwnerAdminId, paidPartCredit, commissionPercent, productName } = payload
  if (paidPartCredit <= 0) return

  const note = productName ? `Đơn #${orderId}: ${productName}` : `Đơn #${orderId}`

  if (sellerAdminId === productOwnerAdminId) {
    // Shop bán sản phẩm của chính mình → 100% cho shop
    await conn.query(
      `INSERT INTO admin_wallet (admin_id, amount_credit, wallet_type, order_id, reference_type, reference_id, note)
       VALUES (?, ?, 'product_revenue', ?, 'order', ?, ?)`,
      [sellerAdminId, paidPartCredit, orderId, String(orderId), note]
    )
    return
  }

  // Bán hộ: shop ăn commission %, chủ ăn phần còn lại
  const pct = commissionPercent != null && Number.isFinite(commissionPercent) ? Math.min(100, Math.max(0, commissionPercent)) : 20
  const commissionCredit = Math.floor((paidPartCredit * pct) / 100)
  const ownerCredit = paidPartCredit - commissionCredit

  if (commissionCredit > 0) {
    await conn.query(
      `INSERT INTO admin_wallet (admin_id, amount_credit, wallet_type, order_id, reference_type, reference_id, note)
       VALUES (?, ?, 'sale_commission', ?, 'order', ?, ?)`,
      [sellerAdminId, commissionCredit, orderId, String(orderId), note]
    )
  }
  if (ownerCredit > 0) {
    await conn.query(
      `INSERT INTO admin_wallet (admin_id, amount_credit, wallet_type, order_id, reference_type, reference_id, note)
       VALUES (?, ?, 'product_revenue', ?, 'order', ?, ?)`,
      [productOwnerAdminId, ownerCredit, orderId, String(orderId), note]
    )
  }
}

/**
 * Ghi doanh thu admin + hoa hồng đối tác giới thiệu (user).
 * Hoa hồng đối tác chỉ trừ vào phần chia cho chủ/seller khi không có bán hộ (seller_admin_id null).
 */
export async function recordOrderEarningsWithPartnerAffiliate(
  conn: PoolConnection,
  payload: {
    orderId: number
    sellerAdminId: number | null
    productOwnerAdminId: number
    paidPartCredit: number
    commissionPercent: number | null
    productName?: string
    partnerUserId: number | null
    partnerCommissionPercent: number | null
  },
) {
  const {
    orderId,
    sellerAdminId,
    productOwnerAdminId,
    paidPartCredit,
    commissionPercent,
    productName,
    partnerUserId,
    partnerCommissionPercent,
  } = payload
  if (paidPartCredit <= 0 || !productOwnerAdminId) return

  let poolForAdmins = paidPartCredit
  let partnerCut = 0

  if (!sellerAdminId && partnerUserId && partnerCommissionPercent != null) {
    const pct = Math.min(100, Math.max(0, Number(partnerCommissionPercent)))
    if (pct > 0) {
      partnerCut = Math.floor((paidPartCredit * pct) / 100)
      poolForAdmins = paidPartCredit - partnerCut
    }
  }

  const effectiveSeller = sellerAdminId ?? productOwnerAdminId
  await recordOrderEarnings(conn, {
    orderId,
    sellerAdminId: effectiveSeller,
    productOwnerAdminId,
    paidPartCredit: poolForAdmins,
    commissionPercent: sellerAdminId ? commissionPercent : null,
    productName,
  })

  if (partnerCut > 0 && partnerUserId) {
    await applyDepositCredit(conn, {
      userId: partnerUserId,
      paidCredit: 0,
      bonusCredit: partnerCut,
      transactionType: "partner_commission",
      referenceType: "order",
      referenceId: orderId,
      note: `Hoa hồng giới thiệu đơn #${orderId}`,
      actorType: "system",
      actorId: null,
    })
  }
}

import pool from './db'

let auditSchemaReady = false

export async function ensureAuditSchema() {
  if (auditSchemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      actor_type ENUM('user', 'admin', 'system') NOT NULL,
      actor_id INT NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NULL,
      target_id VARCHAR(100) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  auditSchemaReady = true
}

export async function addAuditLog(payload: {
  actorType: 'user' | 'admin' | 'system'
  actorId?: number | null
  action: string
  targetType?: string | null
  targetId?: string | number | null
  metadata?: Record<string, any> | null
}) {
  await ensureAuditSchema()

  await pool.query(
    `
      INSERT INTO audit_logs
      (actor_type, actor_id, action, target_type, target_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      payload.actorType,
      payload.actorId ?? null,
      payload.action,
      payload.targetType ?? null,
      payload.targetId != null ? String(payload.targetId) : null,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    ],
  )
}


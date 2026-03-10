import pool from './db'

let chatSchemaReady = false

export async function ensureChatSchema() {
  if (chatSchemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      author_id INT NULL,
      author_role VARCHAR(20) NOT NULL,
      author_name VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  chatSchemaReady = true
}

export interface ChatMessageRow {
  id: number
  author_id: number | null
  author_role: string
  author_name: string
  content: string
  created_at: Date
}


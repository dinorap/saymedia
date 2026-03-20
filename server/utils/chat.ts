import pool from './db'
import { assertRuntimeMigrationsAllowed } from './runtimeMigrations'

let chatSchemaReady = false

export async function ensureChatSchema() {
  if (chatSchemaReady) return

  assertRuntimeMigrationsAllowed('chat')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      author_id INT NULL,
      author_role VARCHAR(20) NOT NULL,
      author_name VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    await pool.query(
      "ALTER TABLE community_messages ADD COLUMN image_url TEXT NULL",
    )
  } catch {
    // Column may already exist.
  }

  chatSchemaReady = true
}

export interface ChatMessageRow {
  id: number
  author_id: number | null
  author_role: string
  author_name: string
  content: string
  image_url?: string | null
  created_at: Date
}


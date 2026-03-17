import pool from './db'
import { assertRuntimeMigrationsAllowed } from './runtimeMigrations'

let schemaReady = false

export async function ensureSocialProofSchema() {
  if (schemaReady) return

  assertRuntimeMigrationsAllowed('socialProof')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recent_orders_feed (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      is_fake TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Bổ sung cột phân loại và số tiền (nếu chưa có)
  try {
    await pool.query(
      "ALTER TABLE recent_orders_feed ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'order'",
    )
  } catch {
    // cột có thể đã tồn tại
  }

  try {
    await pool.query(
      'ALTER TABLE recent_orders_feed ADD COLUMN amount BIGINT NULL',
    )
  } catch {
    // cột có thể đã tồn tại
  }

  schemaReady = true
}

export async function addSocialProofItem(
  displayName: string,
  itemName: string,
  isFake: boolean,
) {
  await ensureSocialProofSchema()

  await pool.query(
    `
      INSERT INTO recent_orders_feed (display_name, item_name, is_fake)
      VALUES (?, ?, ?)
    `,
    [displayName, itemName, isFake ? 1 : 0],
  )

  // Giữ tối đa 20 bản ghi mới nhất
  await pool.query(
    `
      DELETE FROM recent_orders_feed
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id
          FROM recent_orders_feed
          ORDER BY created_at DESC
          LIMIT 20
        ) AS t
      )
    `,
  )
}

export async function addDepositSocialProofItem(
  displayName: string,
  amountVnd: number,
  isFake: boolean,
) {
  await ensureSocialProofSchema()

  const amount = Math.max(0, Math.round(Number(amountVnd) || 0))
  const label = `Nạp ${amount.toLocaleString('vi-VN')}đ`

  await pool.query(
    `
      INSERT INTO recent_orders_feed (display_name, item_name, is_fake, kind, amount)
      VALUES (?, ?, ?, 'deposit', ?)
    `,
    [displayName, label, isFake ? 1 : 0, amount || null],
  )

  // Giữ tối đa 20 bản ghi mới nhất
  await pool.query(
    `
      DELETE FROM recent_orders_feed
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id
          FROM recent_orders_feed
          ORDER BY created_at DESC
          LIMIT 20
        ) AS t
      )
    `,
  )
}

// ===== Fake feed generator (server-side) =====

const FIRST_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Vũ',
  'Bùi',
  'Đặng',
  'Đỗ',
  'Võ',
  'Phan',
  'Dương',
]

const MIDDLE_NAMES = [
  'Văn',
  'Thị',
  'Minh',
  'Anh',
  'Gia',
  'Ngọc',
  'Quang',
  'Thanh',
  'Hồng',
  'Đức',
]

const LAST_NAMES = [
  'An',
  'Khoa',
  'Phúc',
  'Hưng',
  'Linh',
  'Tuấn',
  'Hà',
  'Duy',
  'Mai',
  'Huy',
  'Trang',
  'Quân',
  'Hương',
  'Nam',
  'Long',
]

const PRODUCT_NAMES = [
  'iPhone 15 Pro',
  'Tai nghe Sony WH-1000XM5',
  'MacBook Air M2',
  'Samsung Galaxy S24',
  'Gói nạp thẻ Liên Quân',
  'Tài khoản Valorant',
  'Nạp game Genshin Impact',
  'Gói dịch vụ Netflix',
  'Steam Wallet 200K',
  'Robux 800',
  'Gói PUBG UC',
  'Tài khoản LOL',
  'Nạp thẻ Free Fire',
  'Spotify Premium',
  'YouTube Premium',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

let lastFakeName = ''

function generateFakeName(): string {
  let name = lastFakeName
  for (let i = 0; i < 5; i++) {
    const first = randomItem(FIRST_NAMES)
    const middle = randomItem(MIDDLE_NAMES)
    const last = randomItem(LAST_NAMES)
    name = `${first} ${middle} ${last}`
    if (!lastFakeName || name !== lastFakeName) break
  }
  lastFakeName = name
  return name
}

function generateFakeItemText() {
  const rawName = generateFakeName()

  // Ẩn danh tên fake cho giống real orders (chỉ lộ 1–2 ký tự)
  let displayName = 'Khách hàng'
  const trimmed = String(rawName || '').trim()
  if (trimmed) {
    if (trimmed.length <= 3) {
      displayName = `${trimmed[0]}***`
    } else {
      displayName = `${trimmed[0]}***${trimmed[trimmed.length - 1]}`
    }
  }

  const itemName = randomItem(PRODUCT_NAMES)
  return { name: displayName, itemName }
}

let fakeLoopStarted = false

export function startSocialProofFakeLoop() {
  if (fakeLoopStarted) return
  fakeLoopStarted = true

  const MIN_INTERVAL_MS = 30000
  const MAX_INTERVAL_MS = 60000

  const schedule = () => {
    const delay =
      MIN_INTERVAL_MS +
      Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS))

    setTimeout(async () => {
      try {
        const { name } = generateFakeItemText()

        // Ngẫu nhiên: đôi khi tạo đơn hàng ảo, đôi khi tạo fake nạp tiền
        const roll = Math.random()

        if (roll < 0.5) {
          // Fake đơn hàng mua sản phẩm
          let itemName = ''
          try {
            const [rows]: any = await pool.query(
              `
                SELECT name
                FROM products
                WHERE is_active = 1
                ORDER BY RAND()
                LIMIT 1
              `,
            )
            itemName = rows?.[0]?.name || ''
          } catch {
            itemName = ''
          }

          if (!itemName) {
            itemName = randomItem(PRODUCT_NAMES)
          }

          await addSocialProofItem(name, itemName, true)
        } else {
          // Fake nạp tiền (10k–500k, bội số của 10k)
          const MIN_VND = 10000
          const MAX_VND = 500000
          const STEP = 10000
          const steps = Math.floor((MAX_VND - MIN_VND) / STEP) + 1
          const idx = Math.floor(Math.random() * steps)
          const amount = MIN_VND + idx * STEP

          await addDepositSocialProofItem(name, amount, true)
        }
      } catch (e) {
        console.error('[social-proof] failed to add fake item', e)
      }

      schedule()
    }, delay)
  }

  schedule()
}



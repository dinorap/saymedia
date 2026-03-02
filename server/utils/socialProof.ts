import pool from './db'

let schemaReady = false

export async function ensureSocialProofSchema() {
  if (schemaReady) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recent_orders_feed (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      is_fake TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

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
  const name = generateFakeName()
  const itemName = randomItem(PRODUCT_NAMES)
  return { name, itemName }
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
        const { name, itemName } = generateFakeItemText()
        await addSocialProofItem(name, itemName, true)
      } catch (e) {
        console.error('[social-proof] failed to add fake item', e)
      }

      schedule()
    }, delay)
  }

  schedule()
}



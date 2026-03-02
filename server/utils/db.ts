import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3301),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Đảm bảo mọi kết nối từ app đều dùng múi giờ +07:00 (Asia/Ho_Chi_Minh)
// để CURRENT_TIMESTAMP và việc convert TIMESTAMP hiển thị đúng theo giờ VN.
// mysql2/promise pool vẫn hỗ trợ sự kiện "connection" từ pool gốc.
(pool as any).on('connection', (connection: any) => {
  connection.query("SET time_zone = '+07:00'");
});

export default pool;

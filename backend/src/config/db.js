const mysql = require('mysql2/promise')

// MySQL 连接池：所有数据库操作复用此连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cs2_alert',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 日期以字符串返回，避免时区转换问题，便于 JSON 传输
  dateStrings: true,
})

module.exports = pool

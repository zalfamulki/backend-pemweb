const mysql = require('mysql2/promise');

const dbConfig = {
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'truth_or_trap',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
  connectTimeout:     20000
};

// Enable SSL automatically for remote databases (Railway MySQL, Aiven, PlanetScale, Supabase, etc.)
// Also allow explicit override via DB_SSL=true
if (
  process.env.DB_SSL === 'true' ||
  (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;

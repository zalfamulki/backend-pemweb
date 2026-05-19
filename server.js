require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket');
const db = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server immediately so Railway/Vercel/Postman can reach it and pass health checks
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Server running on http://0.0.0.0:${PORT}`);
  console.log(`🎮  Truth or Trap backend ready!`);
});

// Test DB connection asynchronously without crashing the server
db.getConnection()
  .then((conn) => {
    conn.release();
    console.log('✅  MySQL connected successfully');
  })
  .catch((err) => {
    console.error('❌  MySQL connection failed on startup!');
    console.error('-----------------------------------------');
    console.error('Error:', err.message);
    console.error('-----------------------------------------');
    console.error('TIPS FOR FIXING:');
    console.error('1. Make sure your MySQL service is RUNNING or remote DB host is correct');
    console.error('2. Check if database "' + (process.env.DB_NAME || 'truth_or_trap') + '" exists');
    console.error('3. Verify credentials and SSL settings in Railway variables / .env');
    console.error('-----------------------------------------');
    // We do NOT process.exit(1) so Railway doesn't return 502 Bad Gateway
  });

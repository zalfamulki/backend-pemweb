require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket');
const db = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Test DB connection then start server
db.getConnection()
  .then((conn) => {
    conn.release();
    console.log('✅  MySQL connected successfully');
    server.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
      console.log(`🎮  Truth or Trap backend ready!`);
    });
  })
  .catch((err) => {
    console.error('❌  MySQL connection failed!');
    console.error('-----------------------------------------');
    console.error('Error:', err.message);
    console.error('-----------------------------------------');
    console.error('TIPS FOR FIXING:');
    console.error('1. Make sure your MySQL service is RUNNING (e.g. check XAMPP/WampServer)');
    console.error('2. Check if database "' + (process.env.DB_NAME || 'truth_or_trap') + '" exists');
    console.error('3. Verify credentials in backend/.env');
    console.error('-----------------------------------------');
    process.exit(1);
  });

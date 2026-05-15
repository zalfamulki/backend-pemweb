/**
 * init-db.js  —  Truth or Trap database initializer
 * Usage: node init-db.js
 * Drops and recreates the database cleanly using schema.sql
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const DB_NAME = process.env.DB_NAME || 'truth_or_trap';

async function run() {
  let conn;
  try {
    console.log('Connecting to MySQL...');
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    console.log('✅ Connected.\n');

    // Drop and recreate for a clean state
    await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    console.log(`🗑️  Dropped database "${DB_NAME}" (if existed)`);

    // Read and run schema
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schema);
    console.log(`✅ Schema applied from schema.sql`);

    console.log('\n🚀 Database initialized successfully!');
    console.log('   Tables created: users, news, scenarios, scenario_choices, rooms, room_members, messages, votes');
    console.log('   Seed data: admin user + story "The Anonymous Tip" + sample news');
    console.log('\n   Admin credentials:');
    console.log('   Email:    admin@truthortrap.id');
    console.log('   Password: Admin@1234');
    console.log('\nYou can now run: npm run dev\n');

  } catch (err) {
    console.error('\n❌ Initialization failed!');
    console.error('Error:', err.message);
    console.error('\nMake sure:');
    console.error('1. MySQL/Laragon/XAMPP is RUNNING');
    console.error('2. Credentials in .env are correct');
    console.error(`   DB_HOST=${process.env.DB_HOST}`);
    console.error(`   DB_USER=${process.env.DB_USER}`);
    console.error(`   DB_PORT=${process.env.DB_PORT}`);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();

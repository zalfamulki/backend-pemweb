require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  await db.execute('DELETE FROM messages');
  await db.execute('DELETE FROM room_members');
  await db.execute('DELETE FROM rooms');

  const [cols] = await db.execute("SHOW COLUMNS FROM room_members LIKE 'is_ready'");
  if (!cols.length) {
    await db.execute('ALTER TABLE room_members ADD COLUMN is_ready TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id');
  }

  const [idx] = await db.execute("SHOW INDEX FROM room_members WHERE Key_name = 'uq_room_user'");
  if (!idx.length) {
    await db.execute('ALTER TABLE room_members ADD UNIQUE KEY uq_room_user (room_id, user_id)');
  }

  console.log('Room data cleaned and room_members schema repaired.');
  await db.end();
})().catch(async (err) => {
  console.error(err);
  await db.end().catch(() => {});
  process.exit(1);
});

require('dotenv').config();
const db = require('../src/config/db');

async function hasColumn(table, column) {
  const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
  const safeColumn = column.replace(/'/g, "''");
  const [rows] = await db.query(`SHOW COLUMNS FROM ${safeTable} LIKE '${safeColumn}'`);
  return rows.length > 0;
}

(async () => {
  if (!(await hasColumn('rooms', 'current_scenario_id'))) {
    await db.execute('ALTER TABLE rooms ADD COLUMN current_scenario_id INT UNSIGNED DEFAULT NULL AFTER news_id');
  }
  if (!(await hasColumn('rooms', 'game_timer'))) {
    await db.execute('ALTER TABLE rooms ADD COLUMN game_timer INT DEFAULT 60 AFTER current_scenario_id');
  }

  if (!(await hasColumn('votes', 'choice_id'))) {
    await db.execute('ALTER TABLE votes ADD COLUMN choice_id INT UNSIGNED DEFAULT NULL AFTER news_id');
  }

  await db.execute('ALTER TABLE votes MODIFY COLUMN news_id INT UNSIGNED NULL').catch(() => {});
  await db.execute("ALTER TABLE votes MODIFY COLUMN vote ENUM('fact','hoax') NULL").catch(() => {});
  await db.execute('DELETE FROM votes').catch(() => {});

  console.log('Story schema repaired for active database.');
  await db.end();
})().catch(async (err) => {
  console.error(err);
  await db.end().catch(() => {});
  process.exit(1);
});

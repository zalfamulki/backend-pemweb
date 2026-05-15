require('dotenv').config();
const db = require('../src/config/db');

const scenarios = [
  {
    id: 101,
    title: 'Bisikan di Lorong',
    content: 'Malam itu, Rara menemukan secarik kertas di loker sekolahnya. Isinya menyebut nama teman sekelas yang diduga menyebarkan rahasia pribadi seseorang. Tim kalian tahu ada kejanggalan. Apakah kalian akan berbicara jujur sekarang, atau diam untuk menjaga posisi aman?',
    isStart: 1,
    isEnd: 0,
  },
  {
    id: 102,
    title: 'Jejak yang Terbuka',
    content: 'Keberanian kalian membuka percakapan membuat beberapa saksi mulai bicara. Namun satu akun anonim tiba-tiba mengunggah potongan chat palsu untuk menjatuhkan Rara. Kalian harus bergerak cepat sebelum reputasi semua orang rusak.',
    isStart: 0,
    isEnd: 0,
  },
  {
    id: 103,
    title: 'Aman yang Retak',
    content: 'Kalian memilih diam. Untuk sementara suasana terlihat aman, tetapi orang yang tidak bersalah mulai dijauhi. Di grup kelas, rumor makin liar dan semua orang saling curiga.',
    isStart: 0,
    isEnd: 0,
  },
  {
    id: 104,
    title: 'Forum Terbuka',
    content: 'Kalian mengumpulkan bukti dan mengajak kelas berdiskusi terbuka. Ada kesempatan memulihkan kepercayaan, tapi jika salah bicara, situasi bisa meledak.',
    isStart: 0,
    isEnd: 0,
  },
  {
    id: 105,
    title: 'Kesepakatan Gelap',
    content: 'Kalian mencoba menyelesaikan masalah diam-diam dengan pihak yang menyebarkan rumor. Tawaran damai muncul, tetapi syaratnya: jangan ungkap pelaku sebenarnya.',
    isStart: 0,
    isEnd: 0,
  },
  {
    id: 106,
    title: 'Cahaya Kebenaran',
    content: 'ENDING GOOD: Bukti dibuka secara bertanggung jawab. Pelaku meminta maaf, korban dipulihkan, dan kelas belajar bahwa kebenaran butuh keberanian sekaligus empati.',
    isStart: 0,
    isEnd: 1,
  },
  {
    id: 107,
    title: 'Keseimbangan Rapuh',
    content: 'ENDING NEUTRAL: Masalah mereda, tetapi tidak semua pertanyaan terjawab. Kalian menyelamatkan sebagian keadaan, namun kepercayaan butuh waktu untuk kembali.',
    isStart: 0,
    isEnd: 1,
  },
  {
    id: 108,
    title: 'Bayangan Kebohongan',
    content: 'ENDING BAD: Diam dan kompromi membuat kebohongan makin kuat. Korban kehilangan suara, dan kelas belajar dengan cara yang pahit bahwa rumor bisa menghancurkan.',
    isStart: 0,
    isEnd: 1,
  },
  {
    id: 109,
    title: 'Ending Tersembunyi',
    content: 'ENDING SECRET: Kalian menemukan bahwa akun anonim bukan satu orang, melainkan jaringan kecil yang menguji siapa yang mudah percaya. Dengan strategi tenang, kalian membongkar pola manipulasi itu.',
    isStart: 0,
    isEnd: 1,
  },
];

const choices = [
  [101, 'A. Bicara jujur dan ajak saksi lain memverifikasi cerita.', 102],
  [101, 'B. Tetap diam dulu demi keamanan tim.', 103],
  [102, 'A. Publikasikan bukti lengkap dengan konteks yang jelas.', 104],
  [102, 'B. Cari pemilik akun anonim secara diam-diam.', 105],
  [103, 'A. Akui keterlambatan kalian dan buka forum klarifikasi.', 104],
  [103, 'B. Tetap menjaga jarak dan biarkan rumor turun sendiri.', 108],
  [104, 'A. Utamakan pemulihan korban dan bukti yang terverifikasi.', 106],
  [104, 'B. Tekan pelaku di depan semua orang agar mengaku cepat.', 107],
  [105, 'A. Tolak kesepakatan gelap dan bongkar pola manipulasi.', 109],
  [105, 'B. Terima kesepakatan agar konflik cepat selesai.', 108],
];

(async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url VARCHAR(500) DEFAULT NULL,
      is_start TINYINT(1) NOT NULL DEFAULT 0,
      is_end TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS scenario_choices (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      scenario_id INT UNSIGNED NOT NULL,
      text VARCHAR(500) NOT NULL,
      next_scenario_id INT UNSIGNED DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
      FOREIGN KEY (next_scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  await db.execute('DELETE FROM votes');
  await db.execute('DELETE FROM scenario_choices');
  await db.execute('DELETE FROM scenarios');

  for (const item of scenarios) {
    await db.execute(
      'INSERT INTO scenarios (id, title, content, is_start, is_end) VALUES (?, ?, ?, ?, ?)',
      [item.id, item.title, item.content, item.isStart, item.isEnd]
    );
  }

  for (const [scenarioId, text, nextScenarioId] of choices) {
    await db.execute(
      'INSERT INTO scenario_choices (scenario_id, text, next_scenario_id) VALUES (?, ?, ?)',
      [scenarioId, text, nextScenarioId]
    );
  }

  console.log('Truth or Trap story flow seeded.');
  await db.end();
})().catch(async (err) => {
  console.error(err);
  await db.end().catch(() => {});
  process.exit(1);
});

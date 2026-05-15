const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'database', 'schema.sql');
let content = fs.readFileSync(schemaPath, 'utf8');

const newSeed = `-- ── Story Seed: "Gempa Digital - Divisi SIGMA" ────────────────────────────────
INSERT IGNORE INTO scenarios (id, title, content, is_start) VALUES
(1, 'Skenario 1.1: Gempa Digital',
 'Tim SIGMA menerima laporan pertama. Sebuah video viral beredar di semua platform: "BREAKING: Gempa M 7.8 direncanakan terjadi di Nusantara Digital besok pukul 14.00 akibat uji coba senjata frekuensi milik pemerintah asing!" Video ini sudah ditonton 5 juta kali dalam 3 jam dan menyebabkan ribuan warga mulai mengungsi.',
 1);

INSERT IGNORE INTO scenarios (id, title, content) VALUES
(2, 'Skenario 1.2: Dokumen Bocoran',
 'Seorang informan anonim mengirim file terenkripsi kepada tim. Isinya: dokumen yang mengklaim sebagai "kebocoran data internal" sebuah perusahaan media besar — menunjukkan bahwa mereka sengaja memproduksi konten sensasional untuk menaikkan traffic iklan. PT. MediaNusa mengklaim dokumen itu palsu.'),
(3, 'Skenario 1.2-alt: Krisis Kepercayaan',
 'Akibat kesalahan sebelumnya, publik mulai menyerang Divisi SIGMA di media sosial. Tagar #BubarSIGMA trending. Lebih parah lagi, muncul petisi online yang menuntut tim dibubarkan — dengan 50.000 tanda tangan dalam 2 jam. Kini tim harus memilih: bertahan atau akui kesalahan?'),
(4, 'Skenario 1.3: Identitas Penyebar Pertama',
 'Tim SIGMA berhasil melacak IP address akun penyebar hoaks pertama. Hasilnya mengejutkan: akun tersebut terhubung ke Benny Hartono, seorang influencer dengan 2 juta pengikut yang dikenal sebagai "pejuang kebenaran digital."'),
(5, 'Skenario 2.1-A: Media Mainstream Terlibat?',
 'Setelah Benny Hartono dilaporkan, penyelidikan polisi membuka fakta baru: ada 3 media online mainstream yang secara konsisten memperkuat narasi hoaks yang disebarkan Benny — tanpa verifikasi. Apakah ini kelalaian atau kesengajaan?'),
(6, 'Skenario 2.1-B: Dark Web Leak',
 'Penyelidikan lebih dalam membawa tim ke sebuah forum di dark web. Di sana, ditemukan "Paket Hoaks Siap Pakai". Yang mengejutkan: nama Benny Hartono ada di daftar akun bayaran tersebut. Dia bukan dalang — dia hanya alat.'),
(7, 'Skenario 2.2: Uang di Balik Berita',
 'Semua jalan menuju satu nama yang sama: PT. Nexus Infomedia — sebuah perusahaan manajemen konten. Di permukaan, mereka adalah konsultan digital biasa. Di baliknya, mereka adalah mesin produksi hoaks terorganisir. Klien mereka mencakup figur politik, kompetitor bisnis, dan lembaga tertentu.'),
(8, 'Skenario 2.3: Sumber Anonim',
 'Tim SIGMA kini hampir mengetahui seluruh jaringan. Tapi tiba-tiba muncul pesan anonim yang mengklaim sebagai orang dalam PT. Nexus — menawarkan informasi tentang siapa klien terbesar mereka, dengan satu syarat: tim harus berhenti menyelidiki secara resmi.'),
(9, 'Skenario 3.1: Laporan Terakhir Tim',
 'Tim SIGMA kini memiliki semua bukti yang dibutuhkan. Laporan final sudah disusun. Tapi ada dilema terakhir: salah satu klien terbesar PT. Nexus ternyata adalah pejabat tinggi yang juga menjadi pelindung tidak resmi Divisi SIGMA.'),
(10, 'Skenario 3.2: Konfrontasi Dalang',
 'Laporan sudah terbit (atau sedang ditunda). Tapi direktur PT. Nexus tiba-tiba menghilang. Yang tersisa hanyalah pesan terenkripsi: "Kalian pikir sudah menang? Ada satu file yang belum kalian temukan. File itu akan menghancurkan kalian."'),
(11, 'Skenario 3.3 (FINAL): Sidang Kebenaran Digital',
 'Hari penentuan. Tim SIGMA dipanggil ke sidang digital publik. Pengacara PT. Nexus mengajukan pertanyaan yang mengguncang segalanya: "Bukankah Divisi SIGMA sendiri pernah mengambil keputusan yang merusak kepercayaan publik? Siapa yang berhak menghakimi kebenaran?" Semua mata tertuju pada tim.');

INSERT IGNORE INTO scenarios (id, title, content, is_end) VALUES
(12, 'ENDING: PAHLAWAN DIGITAL',
 'Divisi SIGMA berhasil mengungkap seluruh jaringan hoaks secara transparan. Direktur PT. Nexus ditangkap. Pejabat terlibat mengundurkan diri. Undang-undang literasi digital baru disahkan. Nama SIGMA dikenang sebagai fondasi era informasi yang lebih bersih di Nusantara Digital.', 1),
(13, 'ENDING: KOMPROMI TERAKHIR',
 'Tim memilih jalan tengah. Sebagian kebenaran terungkap, sebagian dikubur. Pejabat berterima kasih — SIGMA mendapat perlindungan, tapi kehilangan integritasnya. Kota aman untuk sementara, tapi sistem korup tetap berjalan.', 1);

INSERT IGNORE INTO scenario_choices (id, scenario_id, text, next_scenario_id) VALUES
(1, 1, '🔴 Ini HOAKS — Laporkan & Klarifikasi', 2),
(2, 1, '🟢 Ini FAKTA — Sebarkan Peringatan', 3),

(3, 2, '🔍 Selidiki Lebih Dalam Dulu', 4),
(4, 2, '📢 Sebarkan — Publik Berhak Tahu', 4),

(5, 3, '🤝 Akui Kesalahan & Minta Maaf Publik', 4),
(6, 3, '🛡️ Bertahan & Lanjutkan Misi Diam-diam', 4),

(7, 4, '📋 Laporkan ke Pihak Berwenang Sekarang', 5),
(8, 4, '🔬 Selidiki Lebih Dalam — Mungkin Ada Dalang', 6),

(9, 5, '🚨 Ini Disengaja — Ekspos Ketiga Media', 7),
(10, 5, '⚠️ Bisa Jadi Kelalaian — Investigasi Internal Dulu', 7),

(11, 6, '📍 Lacak Lokasi Gedung — Operasi Lapangan', 7),
(12, 6, '💻 Analisis Digital Lebih Dalam Dulu', 7),

(13, 7, '📁 Amankan Database — Ini Bukti Kunci', 8),
(14, 7, '🤝 Jadikan Salah Satu Karyawan Informan', 8),

(15, 8, '❌ Tolak — Proses Harus Resmi & Transparan', 9),
(16, 8, '✅ Terima — Dapatkan Nama Klien Terbesar', 9),

(17, 9, '🌐 Publish Semua — Kebenaran di Atas Segalanya', 10),
(18, 9, '⏳ Tunda — Negosiasi Dulu dengan Pejabat', 10),

(19, 10, '💪 Gertakan Kosong — Lanjutkan & Cari File Itu', 11),
(20, 10, '🔒 Amankan Tim Dulu — Evakuasi Data', 11),

(21, 11, '⚡ UNGKAP SEMUA — Termasuk Kesalahan Tim Sendiri', 12),
(22, 11, '🤝 KOMPROMIS — Ungkap Sebagian, Lindungi Tim', 13);
`;

const startIndex = content.indexOf('-- ── Story Seed: "The Anonymous Tip"');
const endIndex = content.indexOf('-- ── Sample news items');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newSeed + '\n' + content.substring(endIndex);
  fs.writeFileSync(schemaPath, content);
  console.log("schema.sql updated successfully");
} else {
  console.log("Could not find start or end index");
}

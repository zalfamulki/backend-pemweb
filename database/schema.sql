-- ============================================================
-- Truth or Trap — Complete Database Schema (v2)
-- Merged schema + storytelling migration
-- Run this on a fresh database for clean setup
-- ============================================================

CREATE DATABASE IF NOT EXISTS truth_or_trap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE truth_or_trap;

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(30)  NOT NULL UNIQUE,
  email        VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('player','admin') NOT NULL DEFAULT 'player',
  avatar       VARCHAR(255) DEFAULT NULL,
  trust_score  SMALLINT     NOT NULL DEFAULT 100,
  reputation   INT          NOT NULL DEFAULT 0,
  is_online    TINYINT(1)   NOT NULL DEFAULT 0,
  last_seen    DATETIME     DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email  (email),
  INDEX idx_online (is_online),
  INDEX idx_rep    (reputation DESC)
) ENGINE=InnoDB;

-- ── NEWS ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,
  category    VARCHAR(60)  NOT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  is_hoax     TINYINT(1)   NOT NULL DEFAULT 0,
  explanation TEXT         NOT NULL,
  difficulty  ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  status      ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status     (status),
  INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB;

-- ── SCENARIOS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  is_start    TINYINT(1)   NOT NULL DEFAULT 0,
  is_end      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── SCENARIO CHOICES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenario_choices (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id      INT UNSIGNED NOT NULL,
  text             VARCHAR(500) NOT NULL,
  next_scenario_id INT UNSIGNED DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id)      REFERENCES scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (next_scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── ROOMS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  code                VARCHAR(10)  NOT NULL UNIQUE,
  host_id             INT UNSIGNED NOT NULL,
  news_id             INT UNSIGNED DEFAULT NULL,
  current_scenario_id INT UNSIGNED DEFAULT NULL,
  game_timer          INT          DEFAULT 60,
  max_players         TINYINT      NOT NULL DEFAULT 10,
  is_private          TINYINT(1)   NOT NULL DEFAULT 0,
  password            VARCHAR(100) DEFAULT NULL,
  status              ENUM('waiting','active','closed') NOT NULL DEFAULT 'waiting',
  started_at          DATETIME     DEFAULT NULL,
  ended_at            DATETIME     DEFAULT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id)             REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (news_id)             REFERENCES news(id)      ON DELETE SET NULL,
  FOREIGN KEY (current_scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_code   (code)
) ENGINE=InnoDB;

-- ── ROOM MEMBERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_members (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id   INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  is_ready  TINYINT(1)   NOT NULL DEFAULT 0,
  joined_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at   DATETIME     DEFAULT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
  UNIQUE KEY uq_room_user (room_id, user_id),
  INDEX idx_room (room_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id      INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  content      TEXT         NOT NULL,
  message_type ENUM('text','system','vote_action') NOT NULL DEFAULT 'text',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
  INDEX idx_room_msg (room_id, created_at)
) ENGINE=InnoDB;

-- ── VOTES ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  choice_id     INT UNSIGNED NOT NULL,
  points_earned SMALLINT     NOT NULL DEFAULT 10,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)            ON DELETE CASCADE,
  FOREIGN KEY (choice_id) REFERENCES scenario_choices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_choice (user_id, choice_id),
  INDEX idx_choice_votes (choice_id)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: Admin@1234)
INSERT IGNORE INTO users (username, email, password, role, trust_score, reputation)
VALUES ('admin','admin@truthortrap.id','$2a$12$cGjEEjvt3up9IYuoK7FNpu3pHINXtND3Gxn6TAaVX1vbI6S3vrZU6','admin',200,9999);

-- ── Story Seed: "Truth or Trap v3" ──────────────────────────────────────────
INSERT IGNORE INTO scenarios (id, title, content, is_start) VALUES
(1, 'Skenario 1: Tsunami Palsu', 'Beredar pesan peringatan darurat: "BMKG RESMI mengeluarkan peringatan TSUNAMI LEVEL 3 untuk pesisir utara Pulau Jawa malam ini pukul 23.00 WIB. Gempa 7.9 SR terdeteksi di Laut Jawa. Warga pesisir diimbau evakuasi segera ke dataran tinggi minimum 30 meter."', 1);

INSERT IGNORE INTO scenarios (id, title, content) VALUES
(2, 'Skenario 2A: Beras Plastik', 'Sebuah video viral di YouTube "VIRAL!! Beras Plastik Beredar di Pasar Tradisional". Dalam video, seorang ibu merekam nasi yang ia masak terasa "kenyal seperti karet" dan tidak mau hancur, menuduh beras tersebut mengandung plastik sintetis.'),
(3, 'Skenario 2B: Beras Plastik + Tekanan', 'SITUASI DARURAT — Akibat kesalahan sebelumnya, publik marah pada tim Anda. Kini muncul eskalasi dari berita beras plastik: "TERBUKTI!! Beras Plastik Beredar — Sudah 3 Keluarga Masuk RS Setelah Makan Nasi dari Beras Ini!" Tekanan publik meningkat.'),
(4, 'Skenario 3: Obat Palsu BPOM', 'Beredar surat resmi BPOM di media sosial yang mengklaim: "BPOM RESMI TARIK PEREDARAN PARACETAMOL MEREK PARAMEX DAN BODREX — DITEMUKAN KANDUNGAN BERBAHAYA MELEBIHI BATAS AMAN." Publik panik dan mulai membuang obat-obatan mereka.'),
(5, 'Skenario 4A: Kopi & Kanker', 'Artikel dari tribunhealth.net viral di grup WhatsApp: "PENELITIAN HARVARD UNGKAP: MINUM KOPI LEBIH DARI 2 CANGKIR/HARI TINGKATKAN RISIKO KANKER PARU 67%." Artikel tersebut menyertakan nama peneliti dan hasil penelitian fiktif.'),
(6, 'Skenario 4B: Kopi & Kanker + Krisis', 'Tim berada di ambang kegagalan. Kini artikel Kopi & Kanker mendapat dukungan dari akun Instagram dokter muda palsu dengan 180 ribu pengikut yang menyatakan: "Sebagai dokter, kami juga melihat peningkatan pasien kanker paru. Penelitian Harvard ini perlu diperhatikan serius."'),
(7, 'Skenario 5 (FINAL): Video Banjir Rekayasa', 'Video amatir viral di Twitter: "BREAKING: BANJIR BANDANG TERJANG KECAMATAN CIAWI, BOGOR." Video menunjukkan air cokelat deras menyapu rumah warga. Pengunggah meminta video disebarkan agar bantuan cepat datang.');

INSERT IGNORE INTO scenarios (id, title, content, is_end) VALUES
(8, 'ENDING A: PAHLAWAN DIGITAL', 'Tim berhasil mengidentifikasi hoaks dengan tepat. Kepercayaan publik meningkat dan masyarakat kini lebih kritis. Anda adalah Pahlawan Digital!', 1),
(9, 'ENDING B: KEMENANGAN YANG PAHIT', 'Tim berhasil, namun beberapa kesalahan sempat mengguncang kepercayaan publik. Hoaks sempat menyebar sebelum diklarifikasi. Pelajaran: Verifikasi pertama, sebarkan kemudian.', 1),
(10, 'ENDING C: MISI GAGAL (GAME OVER)', 'Terlalu banyak keputusan salah menyebabkan hoaks menyebar tak terkendali. Kepercayaan publik runtuh. Nusantara Digital tenggelam dalam kekacauan informasi. Misi Gagal.', 1),
(11, 'ENDING D: TIDAK ADA PEMENANG', 'Tim tidak mencapai konsensus. Keraguan kolektif dimanfaatkan penyebar hoaks. Tidak ada tindakan tegas yang diambil.', 1);

INSERT IGNORE INTO scenario_choices (id, scenario_id, text, next_scenario_id) VALUES
(1, 1, '🔴 HOAKS', 2),
(2, 1, '🟢 FAKTA', 3),

(3, 2, '🔴 HOAKS', 4),
(4, 2, '🟢 FAKTA', 4),

(5, 3, '🔴 HOAKS', 4),
(6, 3, '🟢 FAKTA', 10),

(7, 4, '🔴 HOAKS', 5),
(8, 4, '🟢 FAKTA', 6),

(9, 5, '🔴 HOAKS', 7),
(10, 5, '🟢 FAKTA', 7),

(11, 6, '🔴 HOAKS', 7),
(12, 6, '🟢 FAKTA', 10),

(13, 7, '🔴 HOAKS', 8),
(14, 7, '🟢 FAKTA', 10);

-- ── Sample news items ─────────────────────────────────────────────────────────
INSERT IGNORE INTO news (id, title, content, category, is_hoax, explanation, difficulty, status, created_by) VALUES
(1,'Vaksin COVID-19 Mengandung Microchip','Beredar informasi bahwa vaksin COVID-19 mengandung microchip yang ditanam pemerintah untuk melacak warga.','Kesehatan',1,'HOAKS. Vaksin tidak mengandung microchip. Dibantah oleh WHO dan CDC.','easy','published',1),
(2,'Indonesia Resmi Jadi Anggota BRICS 2025','Presiden Prabowo mengumumkan Indonesia bergabung dengan BRICS pada Januari 2025.','Politik',0,'FAKTA. Indonesia resmi bergabung dengan BRICS pada Januari 2025.','medium','published',1),
(3,'Indonesia Luncurkan Satelit SATRIA-1','Satelit SATRIA-1 berhasil diluncurkan dari Cape Canaveral menggunakan roket SpaceX Falcon 9.','Teknologi',0,'FAKTA. SATRIA-1 diluncurkan 19 Juni 2023, berkapasitas 150 Gbps.','hard','published',1);

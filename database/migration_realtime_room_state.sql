USE truth_or_trap;

ALTER TABLE room_members
  ADD COLUMN IF NOT EXISTS is_ready TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE room_members
  ADD UNIQUE KEY uq_room_user (room_id, user_id);

ALTER TABLE rooms
  MODIFY COLUMN game_timer INT DEFAULT 60;

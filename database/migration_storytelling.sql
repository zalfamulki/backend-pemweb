-- ============================================================
-- Migration: Interactive Storytelling Pivot
-- ============================================================

USE truth_or_trap;

-- 1. Create Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id          INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT         NOT NULL,
  image_url   VARCHAR(500) DEFAULT NULL,
  is_start    TINYINT(1)   NOT NULL DEFAULT 0,
  is_end      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Create Scenario Choices table
CREATE TABLE IF NOT EXISTS scenario_choices (
  id               INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id      INT          UNSIGNED NOT NULL,
  text             VARCHAR(255) NOT NULL,
  next_scenario_id INT          UNSIGNED DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id)      REFERENCES scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (next_scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Update Rooms to track current scenario and game state
ALTER TABLE rooms 
ADD COLUMN current_scenario_id INT UNSIGNED DEFAULT NULL,
ADD COLUMN game_timer         INT DEFAULT 60,
ADD CONSTRAINT fk_rooms_scenario FOREIGN KEY (current_scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL;

-- 4. Update Votes to track choices
ALTER TABLE votes 
DROP COLUMN vote,
ADD COLUMN choice_id INT UNSIGNED DEFAULT NULL,
ADD CONSTRAINT fk_votes_choice FOREIGN KEY (choice_id) REFERENCES scenario_choices(id) ON DELETE CASCADE;

-- 5. Seed Initial Story (The Fake News Outbreak)
INSERT INTO scenarios (title, content, is_start) VALUES 
('The Anonymous Tip', 'You are the lead editor of The Capital Gazette. It is 11:00 PM when an anonymous whistleblower sends you a encrypted document. It claims the upcoming election is being manipulated by an AI deepfake operation. Do you publish the lead immediately or investigate further?', 1);

SET @start_id = LAST_INSERT_ID();

INSERT INTO scenarios (title, content) VALUES 
('The Investigation', 'Your team spends all night cross-referencing sources. You find that the whistleblower is a former tech employee. However, a mysterious black car has been following your lead reporter. The pressure is mounting. The rival paper is about to go live with the same story.'),
('The Premature Leak', 'You publish the tip immediately. The internet explodes. However, within hours, the government issues a total blackout of your website, claiming you are spreading state secrets. The public is confused and rioted in the streets.');

SET @investigate_id = @start_id + 1;
SET @leak_id = @start_id + 2;

INSERT INTO scenario_choices (scenario_id, text, next_scenario_id) VALUES 
(@start_id, 'Investigate further to verify the sources.', @investigate_id),
(@start_id, 'Publish the story now to get the scoop!', @leak_id);

INSERT INTO scenarios (title, content, is_end) VALUES 
('Hero of Democracy', 'The investigation pays off. You reveal the deepfake ring just hours before the polls open. The masterminds are arrested, and the Gazettes reputation as the last bastion of truth is sealed. Ending: TRUTH PREVAILS.', 1),
('Chaos & Retraction', 'The story was a set-up. The AI operation was a test to see which papers would fall for fake news. You lose everything. Ending: TRAPPED IN THE LIE.', 1);

SET @hero_id = @leak_id + 1;
SET @chaos_id = @leak_id + 2;

INSERT INTO scenario_choices (scenario_id, text, next_scenario_id) VALUES 
(@investigate_id, 'Follow through with the evidence.', @hero_id),
(@leak_id, 'Try to retract the story.', @chaos_id);

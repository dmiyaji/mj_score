USE mj_score;
ALTER TABLE seasons ADD COLUMN current_stage VARCHAR(20) DEFAULT 'REGULAR';

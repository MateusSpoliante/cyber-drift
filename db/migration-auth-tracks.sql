-- Execute no SQL Editor do Supabase após o schema antigo.
-- Contas com senha e recordes independentes por circuito.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE players ALTER COLUMN display_name TYPE VARCHAR(16);
ALTER TABLE players ADD COLUMN IF NOT EXISTS username VARCHAR(16);
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS players_username_lower_uidx
  ON players (lower(username)) WHERE username IS NOT NULL;
COMMENT ON COLUMN players.password_hash IS 'Hash scrypt com salt aleatório; nunca armazenar senha em texto puro.';

ALTER TABLE records ADD COLUMN IF NOT EXISTS track_id VARCHAR(32) NOT NULL DEFAULT 'neon-city';
DROP INDEX IF EXISTS records_one_best_per_player_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS records_one_best_per_player_track_uidx
  ON records (player_id, track_id);
CREATE INDEX IF NOT EXISTS records_track_time_idx
  ON records (track_id, time_ms ASC, created_at ASC);

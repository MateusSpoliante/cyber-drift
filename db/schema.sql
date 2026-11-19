CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Perfis de jogadores. device_id permanece como identificador técnico legado; contas autenticadas usam username/password_hash adicionados na migração ao final.
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL UNIQUE,
  display_name VARCHAR(15) NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  races INTEGER NOT NULL DEFAULT 0 CHECK (races >= 0),
  best_time INTEGER CHECK (best_time IS NULL OR best_time BETWEEN 5000 AND 3600000),
  body_color VARCHAR(7) NOT NULL DEFAULT '#141820',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#FF6500',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS players_xp_idx ON players (xp DESC);
CREATE INDEX IF NOT EXISTS players_best_time_idx ON players (best_time ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  pilot_name VARCHAR(15) NOT NULL,
  time_ms INTEGER NOT NULL CHECK (time_ms BETWEEN 5000 AND 3600000),
  ghost_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_record_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS records_time_ms_created_at_idx ON records (time_ms ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS records_player_id_idx ON records (player_id, created_at DESC);

-- Migração segura para instalações que já possuíam a tabela records antiga.
ALTER TABLE records ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE records ADD COLUMN IF NOT EXISTS ghost_data JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS records_player_id_idx ON records (player_id, created_at DESC);

ALTER TABLE records ADD COLUMN IF NOT EXISTS client_record_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS records_client_record_id_uidx ON records (client_record_id);


-- Um único recorde (melhor volta) por jogador/dispositivo.
-- Remove duplicatas antigas, preservando o menor tempo de cada jogador.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY player_id
    ORDER BY time_ms ASC, created_at ASC, id ASC
  ) AS position
  FROM records
  WHERE player_id IS NOT NULL
)
DELETE FROM records r
USING ranked d
WHERE r.id = d.id AND d.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS records_one_best_per_player_uidx
  ON records (player_id)
  WHERE player_id IS NOT NULL;


-- Cyber Drift 3D: contas autenticadas e recordes independentes por pista.
ALTER TABLE players ALTER COLUMN display_name TYPE VARCHAR(16);
ALTER TABLE players ADD COLUMN IF NOT EXISTS username VARCHAR(16);
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS players_username_lower_uidx
  ON players (lower(username)) WHERE username IS NOT NULL;
COMMENT ON COLUMN players.password_hash IS 'Hash scrypt com salt aleatório; nunca armazenar senha em texto puro.';

ALTER TABLE records ADD COLUMN IF NOT EXISTS track_id VARCHAR(32) NOT NULL DEFAULT 'neon-city';
ALTER TABLE records DROP CONSTRAINT IF EXISTS records_player_id_key;
DROP INDEX IF EXISTS records_one_best_per_player_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS records_one_best_per_player_track_uidx
  ON records (player_id, track_id);
CREATE INDEX IF NOT EXISTS records_track_time_idx ON records (track_id, time_ms ASC, created_at ASC);

-- Perfis antigos permanecem preservados. Para continuar usando um perfil antigo,
-- crie uma conta nova; os registros anteriores continuam no ranking da pista Neon City.

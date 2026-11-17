CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Perfis pseudônimos: não há conta, senha ou e-mail.
-- device_id é um identificador aleatório persistido no navegador do jogador.
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

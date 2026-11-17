import postgres from 'postgres';

const MAX_NAME_LENGTH = 15;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanName(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_ -]/g, '').slice(0, MAX_NAME_LENGTH);
}

function cleanGhost(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2500).filter(p =>
    p && Number.isFinite(Number(p.t)) && Number(p.t) >= 0 && Number(p.t) <= 3600000 &&
    Number.isFinite(Number(p.x)) && Math.abs(Number(p.x)) <= 2500 &&
    Number.isFinite(Number(p.z)) && Math.abs(Number(p.z)) <= 2500 &&
    Number.isFinite(Number(p.h))
  ).map(p => ({ t: Math.round(Number(p.t)), x: Number(Number(p.x).toFixed(2)), z: Number(Number(p.z).toFixed(2)), h: Number(Number(p.h).toFixed(3)) }));
}

async function getTopRecords(sql, period = 'all') {
  if (period === 'daily') return sql`SELECT r.id, r.pilot_name AS name, r.time_ms AS "timeMs", r.player_id AS "playerId", to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS date FROM records r WHERE r.created_at >= NOW() - INTERVAL '1 day' ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 10`;
  if (period === 'weekly') return sql`SELECT r.id, r.pilot_name AS name, r.time_ms AS "timeMs", r.player_id AS "playerId", to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS date FROM records r WHERE r.created_at >= NOW() - INTERVAL '7 days' ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 10`;
  if (period === 'monthly') return sql`SELECT r.id, r.pilot_name AS name, r.time_ms AS "timeMs", r.player_id AS "playerId", to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS date FROM records r WHERE r.created_at >= NOW() - INTERVAL '30 days' ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 10`;
  return sql`SELECT r.id, r.pilot_name AS name, r.time_ms AS "timeMs", r.player_id AS "playerId", to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS date FROM records r ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 10`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Banco não configurado. Defina DATABASE_URL.' });
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
  try {
    if (req.method === 'GET') {
      const period = ['all', 'daily', 'weekly', 'monthly'].includes(String(req.query?.period || 'all')) ? String(req.query?.period || 'all') : 'all';
      const records = await getTopRecords(sql, period);
      return res.status(200).json({ records, period });
    }
    if (req.method === 'POST') {
      const name = cleanName(req.body?.name);
      const timeMs = Number(req.body?.timeMs);
      const deviceId = String(req.body?.deviceId || '');
      const clientRecordId = String(req.body?.clientRecordId || '');
      const bodyColor = /^#[0-9a-f]{6}$/i.test(String(req.body?.bodyColor || '')) ? String(req.body.bodyColor) : '#141820';
      const accentColor = /^#[0-9a-f]{6}$/i.test(String(req.body?.accentColor || '')) ? String(req.body.accentColor) : '#FF6500';
      const ghost = cleanGhost(req.body?.ghost);
      if (!name) return res.status(400).json({ error: 'Informe um apelido válido.' });
      if (!UUID_RE.test(deviceId)) return res.status(400).json({ error: 'Identificador anônimo inválido. Atualize a página e tente novamente.' });
      if (!UUID_RE.test(clientRecordId)) return res.status(400).json({ error: 'Identificador do envio inválido.' });
      if (!Number.isInteger(timeMs) || timeMs < 5000 || timeMs > 3600000) return res.status(400).json({ error: 'Tempo de volta inválido.' });

      const alreadySaved = await sql`SELECT r.id, r.player_id AS "playerId", r.pilot_name AS name, r.time_ms AS "timeMs" FROM records r WHERE r.client_record_id = ${clientRecordId}::uuid LIMIT 1`;
      if (alreadySaved.length) {
        const records = await getTopRecords(sql, 'all');
        const rank = records.findIndex(r => r.playerId === alreadySaved[0].playerId && Number(r.timeMs) === Number(alreadySaved[0].timeMs)) + 1;
        const playerRows = await sql`SELECT id, display_name AS "displayName", xp, races, best_time AS "bestTime", body_color AS "bodyColor", accent_color AS "accentColor" FROM players WHERE id = ${alreadySaved[0].playerId}::uuid LIMIT 1`;
        return res.status(200).json({ player: playerRows[0] || null, records, rank: rank || null, duplicate: true });
      }

      const players = await sql`
        INSERT INTO players (device_id, display_name, xp, races, best_time, body_color, accent_color)
        VALUES (${deviceId}::uuid, ${name}, 100, 1, ${timeMs}, ${bodyColor}, ${accentColor})
        ON CONFLICT (device_id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          xp = players.xp + 100,
          races = players.races + 1,
          best_time = CASE WHEN players.best_time IS NULL THEN EXCLUDED.best_time ELSE LEAST(players.best_time, EXCLUDED.best_time) END,
          body_color = EXCLUDED.body_color,
          accent_color = EXCLUDED.accent_color,
          updated_at = NOW()
        RETURNING id, display_name AS "displayName", xp, races, best_time AS "bestTime", body_color AS "bodyColor", accent_color AS "accentColor"
      `;
      const player = players[0];
      await sql`INSERT INTO records (player_id, pilot_name, time_ms, ghost_data, client_record_id)
        VALUES (${player.id}::uuid, ${name}, ${timeMs}, ${JSON.stringify(ghost)}::jsonb, ${clientRecordId}::uuid)
        ON CONFLICT (player_id) WHERE player_id IS NOT NULL DO UPDATE SET
          pilot_name = EXCLUDED.pilot_name,
          time_ms = LEAST(records.time_ms, EXCLUDED.time_ms),
          ghost_data = CASE WHEN EXCLUDED.time_ms < records.time_ms THEN EXCLUDED.ghost_data ELSE records.ghost_data END,
          client_record_id = EXCLUDED.client_record_id,
          created_at = CASE WHEN EXCLUDED.time_ms < records.time_ms THEN NOW() ELSE records.created_at END`;
      const records = await getTopRecords(sql, 'all');
      const rank = records.findIndex(r => r.playerId === player.id && Number(r.timeMs) === timeMs) + 1;
      return res.status(201).json({ player, records, rank: rank || null, ghostSamples: ghost.length });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('records API error:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar/salvar recordes.' });
  }
}

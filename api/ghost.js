import { getDb } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Método não permitido.' }); }
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Banco não configurado.' });
  try {
    const sql = getDb();
    const trackId = String(req.query?.trackId || 'neon-city');
    const rows = await sql`SELECT r.pilot_name AS name, r.time_ms AS "timeMs", r.ghost_data AS ghost, r.player_id AS "playerId" FROM records r WHERE r.track_id = ${trackId} AND jsonb_typeof(r.ghost_data) = 'array' AND jsonb_array_length(r.ghost_data) > 1 ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 1`;
    return res.status(200).json({ ghost: rows[0] || null });
  } catch (error) {
    console.error('ghost API error:', error);
    return res.status(500).json({ error: 'Não foi possível carregar o fantasma.' });
  }
}

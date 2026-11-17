import postgres from 'postgres';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Método não permitido.' }); }
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Banco não configurado.' });
  try {
    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false });
    const rows = await sql`SELECT r.pilot_name AS name, r.time_ms AS "timeMs", r.ghost_data AS ghost, r.player_id AS "playerId" FROM records r WHERE jsonb_typeof(r.ghost_data) = 'array' AND jsonb_array_length(r.ghost_data) > 1 ORDER BY r.time_ms ASC, r.created_at ASC LIMIT 1`;
    return res.status(200).json({ ghost: rows[0] || null });
  } catch (error) {
    console.error('ghost API error:', error);
    return res.status(500).json({ error: 'Não foi possível carregar o fantasma.' });
  }
}

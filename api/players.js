import { getDb } from './_db.js';
import { verifyAuthToken, getSessionToken } from './auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Banco não configurado.' });
  const sql = getDb();
  try {
    if (req.method === 'GET' && req.query?.id) {
      const id = String(req.query.id);
      if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Identificador inválido.' });
      const trackId = String(req.query?.trackId || 'neon-city');
      if (!['neon-city','desert-run','alpine-pass','harbor-night'].includes(trackId)) return res.status(400).json({ error: 'Pista inválida.' });
      const rows = await sql`SELECT p.id, p.display_name AS "displayName", p.xp, p.races, r.time_ms AS "bestTime", p.body_color AS "bodyColor", p.accent_color AS "accentColor", p.created_at AS "createdAt" FROM players p LEFT JOIN records r ON r.player_id = p.id AND r.track_id = ${trackId} WHERE p.id = ${id}::uuid LIMIT 1`;
      if (!rows.length) return res.status(404).json({ error: 'Jogador não encontrado.' });
      return res.status(200).json({ player: { ...rows[0], level: Math.floor(Number(rows[0].xp || 0) / 500) + 1 } });
    }
    if (req.method === 'GET') {
      const players = await sql`SELECT p.id, p.display_name AS "displayName", p.xp, p.races, p.best_time AS "bestTime" FROM players p ORDER BY p.xp DESC, p.best_time ASC NULLS LAST LIMIT 20`;
      return res.status(200).json({ players: players.map(p => ({ ...p, level: Math.floor(Number(p.xp || 0) / 500) + 1 })) });
    }
    if (req.method === 'PATCH') {
      const id = verifyAuthToken(getSessionToken(req)) || '';

      const bodyColor = String(req.body?.bodyColor || '#141820');
      const accentColor = String(req.body?.accentColor || '#FF6500');
      if (!UUID_RE.test(id)) return res.status(401).json({ error: 'Faça login novamente.' });
      if (!HEX_RE.test(bodyColor) || !HEX_RE.test(accentColor)) return res.status(400).json({ error: 'Cor inválida.' });
      const rows = await sql`UPDATE players SET body_color = ${bodyColor}, accent_color = ${accentColor}, updated_at = NOW() WHERE id = ${id}::uuid RETURNING id`;
      if (!rows.length) return res.status(403).json({ error: 'Perfil não encontrado para esta conta.' });
      return res.status(200).json({ saved: true });
    }
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('players API error:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar perfil.' });
  }
}

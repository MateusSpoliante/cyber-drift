import { getDb } from './_db.js';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const TOKEN_TTL = 30 * 24 * 60 * 60;
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 5, maxmem: 64 * 1024 * 1024 }).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 5, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
function hashSession(token) { return createHash('sha256').update(token).digest('hex'); }
export function getSessionToken(req) {
  const cookieHeader = String(req.headers.cookie || '');
  const entry = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('cyber_drift_session='));
  try { return entry ? decodeURIComponent(entry.slice('cyber_drift_session='.length)) : ''; } catch { return ''; }
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `cyber_drift_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TOKEN_TTL}${secure}`);
}
function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `cyber_drift_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}
export async function verifyAuthToken(sql, token) {
  if (!token) return null;
  const tokenHash = hashSession(token);
  const rows = await sql`SELECT player_id AS id FROM player_sessions WHERE token_hash=${tokenHash} AND expires_at > NOW() LIMIT 1`;
  return rows[0]?.id || null;
}
async function createSession(sql, playerId, res) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSession(token);
  await sql`INSERT INTO player_sessions (player_id, token_hash, expires_at) VALUES (${playerId}::uuid, ${tokenHash}, NOW() + INTERVAL '30 days')`;
  setSessionCookie(res, token);
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!process.env.DATABASE_URL) { if (req.method === 'DELETE') { clearSessionCookie(res); return res.status(200).json({loggedOut:true}); } return res.status(503).json({error:'Banco não configurado.'}); }
  const sql = getDb();
  if (req.method === 'DELETE') { const token=getSessionToken(req); if (token) await sql`DELETE FROM player_sessions WHERE token_hash=${hashSession(token)}`; clearSessionCookie(res); return res.status(200).json({loggedOut:true}); }
  if (req.method === 'GET') {
    const playerId = await verifyAuthToken(sql, getSessionToken(req));
    if (!playerId) { clearSessionCookie(res); return res.status(401).json({error:'Sessão expirada.'}); }
    const rows = await sql`SELECT id, display_name AS "displayName", username, xp, races, best_time AS "bestTime", body_color AS "bodyColor", accent_color AS "accentColor" FROM players WHERE id=${playerId}::uuid LIMIT 1`;
    if (!rows.length) { clearSessionCookie(res); return res.status(401).json({error:'Conta não encontrada.'}); }
    return res.status(200).json({player:rows[0]});
  }
  if (req.method !== 'POST') { res.setHeader('Allow','GET, POST, DELETE'); return res.status(405).json({error:'Método não permitido.'}); }
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const action = req.body?.action === 'register' ? 'register' : 'login';
  if (!/^[A-Za-z0-9_]{3,15}$/.test(username)) return res.status(400).json({error:'Usuário: use de 3 a 15 letras, números ou _. '});
  if (password.length < 8 || password.length > 128) return res.status(400).json({error:'A senha deve ter entre 8 e 128 caracteres.'});
  try {
    let rows;
    if (action === 'register') {
      rows = await sql`INSERT INTO players (device_id, display_name, username, password_hash)
        VALUES (gen_random_uuid(), ${username}, ${username}, ${hashPassword(password)})
        RETURNING id, display_name AS "displayName", username, xp, races, best_time AS "bestTime", body_color AS "bodyColor", accent_color AS "accentColor"`;
      if (!rows.length) throw new Error('Não foi possível criar a conta.');
    } else {
      rows = await sql`SELECT id, display_name AS "displayName", username, password_hash AS "passwordHash", xp, races, best_time AS "bestTime", body_color AS "bodyColor", accent_color AS "accentColor"
        FROM players WHERE lower(username)=lower(${username}) LIMIT 1`;
      if (!rows.length || !verifyPassword(password, rows[0].passwordHash)) return res.status(401).json({error:'Usuário ou senha incorretos.'});
    }
    const player = rows[0]; delete player.passwordHash;
    await createSession(sql, player.id, res);
    return res.status(action === 'register' ? 201 : 200).json({player});
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({error:'Este nome de usuário já está em uso.'});
    console.error('auth API error:', error);
    return res.status(500).json({error:'Não foi possível autenticar. Verifique o banco de dados.'});
  }
}

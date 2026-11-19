import { getDb } from './_db.js';
import { verifyAuthToken, getSessionToken } from './auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACKS = new Set(['neon-city','desert-run','alpine-pass','harbor-night']);
function cleanName(v) { return String(v || '').trim().replace(/[^A-Za-z0-9_ -]/g,'').slice(0,16); }
function cleanGhost(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0,2500).filter(p => p && Number.isFinite(+p.t) && +p.t>=0 && +p.t<=3600000 &&
    Number.isFinite(+p.x) && Math.abs(+p.x)<=2500 && Number.isFinite(+p.z) && Math.abs(+p.z)<=2500 && Number.isFinite(+p.h))
    .map(p=>({t:Math.round(+p.t),x:+(+p.x).toFixed(2),z:+(+p.z).toFixed(2),h:+(+p.h).toFixed(3)}));
}
async function getTop(sql, trackId, period='all') {
  if (period==='daily') return sql`SELECT r.id,r.pilot_name AS name,r.time_ms AS "timeMs",r.player_id AS "playerId" FROM records r WHERE r.track_id=${trackId} AND r.created_at>=NOW()-INTERVAL '1 day' ORDER BY r.time_ms,r.created_at LIMIT 10`;
  if (period==='weekly') return sql`SELECT r.id,r.pilot_name AS name,r.time_ms AS "timeMs",r.player_id AS "playerId" FROM records r WHERE r.track_id=${trackId} AND r.created_at>=NOW()-INTERVAL '7 days' ORDER BY r.time_ms,r.created_at LIMIT 10`;
  if (period==='monthly') return sql`SELECT r.id,r.pilot_name AS name,r.time_ms AS "timeMs",r.player_id AS "playerId" FROM records r WHERE r.track_id=${trackId} AND r.created_at>=NOW()-INTERVAL '30 days' ORDER BY r.time_ms,r.created_at LIMIT 10`;
  return sql`SELECT r.id,r.pilot_name AS name,r.time_ms AS "timeMs",r.player_id AS "playerId" FROM records r WHERE r.track_id=${trackId} ORDER BY r.time_ms,r.created_at LIMIT 10`;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  if (!process.env.DATABASE_URL) return res.status(503).json({error:'Banco não configurado.'});
  const sql=getDb();
  try {
    if (req.method==='GET') {
      const trackId=String(req.query?.trackId||'neon-city');
      const period=['all','daily','weekly','monthly'].includes(String(req.query?.period||'all'))?String(req.query?.period||'all'):'all';
      if (!TRACKS.has(trackId)) return res.status(400).json({error:'Pista inválida.'});
      return res.status(200).json({records:await getTop(sql,trackId,period),period,trackId});
    }
    if (req.method==='POST') {
      const playerId=verifyAuthToken(getSessionToken(req));
      if (!playerId || !UUID_RE.test(playerId)) return res.status(401).json({error:'Faça login novamente para salvar seu recorde.'});
      const trackId=String(req.body?.trackId||'neon-city');
      const timeMs=Number(req.body?.timeMs), clientRecordId=String(req.body?.clientRecordId||'');
      const ghost=cleanGhost(req.body?.ghost);
      if (!TRACKS.has(trackId)) return res.status(400).json({error:'Pista inválida.'});
      if (!UUID_RE.test(clientRecordId)) return res.status(400).json({error:'Identificador do envio inválido.'});
      if (!Number.isInteger(timeMs)||timeMs<5000||timeMs>3600000) return res.status(400).json({error:'Tempo de volta inválido.'});
      const duplicate=await sql`SELECT id,player_id AS "playerId",pilot_name AS name,time_ms AS "timeMs" FROM records WHERE client_record_id=${clientRecordId}::uuid LIMIT 1`;
      if (duplicate.length) return res.status(200).json({player:null,records:await getTop(sql,trackId),duplicate:true});
      const players=await sql`SELECT id,display_name AS "displayName",username,xp,races,best_time AS "bestTime",body_color AS "bodyColor",accent_color AS "accentColor" FROM players WHERE id=${playerId}::uuid LIMIT 1`;
      if (!players.length) return res.status(401).json({error:'Conta não encontrada. Entre novamente.'});
      const player=players[0], name=cleanName(player.username||player.displayName);
      const result=await sql.begin(async tx=>{
        await tx`UPDATE players SET xp=xp+100,races=races+1,best_time=CASE WHEN best_time IS NULL THEN ${timeMs} ELSE LEAST(best_time,${timeMs}) END,updated_at=NOW() WHERE id=${playerId}::uuid`;
        await tx`INSERT INTO records(player_id,pilot_name,time_ms,ghost_data,client_record_id,track_id)
          VALUES(${playerId}::uuid,${name},${timeMs},${JSON.stringify(ghost)}::jsonb,${clientRecordId}::uuid,${trackId})
          ON CONFLICT(player_id,track_id) DO UPDATE SET
            pilot_name=EXCLUDED.pilot_name,
            time_ms=LEAST(records.time_ms,EXCLUDED.time_ms),
            ghost_data=CASE WHEN EXCLUDED.time_ms<records.time_ms THEN EXCLUDED.ghost_data ELSE records.ghost_data END,
            client_record_id=EXCLUDED.client_record_id,
            created_at=CASE WHEN EXCLUDED.time_ms<records.time_ms THEN NOW() ELSE records.created_at END`;
        return tx`SELECT id,display_name AS "displayName",username,xp,races,best_time AS "bestTime",body_color AS "bodyColor",accent_color AS "accentColor" FROM players WHERE id=${playerId}::uuid`;
      });
      const records=await getTop(sql,trackId);
      const rank=records.findIndex(r=>r.playerId===playerId)+1;
      return res.status(201).json({player:result[0],records,rank:rank||null,ghostSamples:ghost.length});
    }
    res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Método não permitido.'});
  } catch(error) {
    console.error('records API error:',error);
    const code=String(error?.code||'');
    const hint=code==='42P01'?'Execute o SQL de atualização do banco.':code==='23505'?'Este recorde já foi recebido.':undefined;
    return res.status(500).json({error:'Erro ao consultar/salvar recordes.',code,hint});
  }
}

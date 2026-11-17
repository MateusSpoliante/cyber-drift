import { getDb } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ ok: false, error: 'DATABASE_URL não configurada.' });
  }
  try {
    const [{ now }] = await sql`SELECT NOW() AS now`;
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('players', 'records')
    `;
    const tableNames = tables.map(t => t.table_name);
    return res.status(200).json({
      ok: true,
      database: 'supabase-postgres',
      serverTime: now,
      tablesReady: tableNames.includes('players') && tableNames.includes('records'),
      tablesFound: tableNames
    });
  } catch (error) {
    console.error('health check error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

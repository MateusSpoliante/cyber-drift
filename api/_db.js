import postgres from 'postgres';

let sqlInstance = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!sqlInstance) {
    sqlInstance = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    });
  }
  return sqlInstance;
}

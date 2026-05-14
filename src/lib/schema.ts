import { query } from './db';

let initPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        username   TEXT PRIMARY KEY,
        pin_hash   TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id         INTEGER PRIMARY KEY,
        username   TEXT NOT NULL,
        events     TEXT NOT NULL,
        decoded    TEXT NOT NULL,
        total_ms   INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at)`);
  })().catch((e) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

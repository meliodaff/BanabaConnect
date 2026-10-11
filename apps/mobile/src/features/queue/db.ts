import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'banabaconnect.db';
const DATABASE_VERSION = 3;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the local database once and brings its schema up to date. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
    dbPromise.catch(() => {
      // Let the next call try again instead of caching a failed open.
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) {
    return;
  }

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_accuracy REAL,
        description TEXT NOT NULL,
        incident_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        sent_at TEXT
      );
      CREATE TABLE IF NOT EXISTS report_photos (
        report_id TEXT PRIMARY KEY NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        uri TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);
    version = 1;
  }

  if (version === 1) {
    // The barangay's status for sent reports, e.g. "in_progress".
    await db.execAsync(`
      ALTER TABLE reports ADD COLUMN server_status TEXT;
      ALTER TABLE reports ADD COLUMN server_status_at TEXT;
    `);
    version = 2;
  }

  if (version === 2) {
    // The account that made the report; NULL for a guest. Reports saved before this version
    // are NULL and move to whoever signs in next.
    await db.execAsync('ALTER TABLE reports ADD COLUMN owner_id TEXT;');
    version = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

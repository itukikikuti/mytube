import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db = null;

export async function getDbConnection() {
  if (db) {
    return db;
  }
  
  // const dbPath = path.resolve(process.cwd(), 'db.sqlite');

  db = await open({
    filename: '/app/nas/Videos/data/db.sqlite',
    driver: sqlite3.Database,
  });

  // Ensure we open in read-write (and create if missing) mode
  // and avoid WAL (which creates -wal/-shm files that may fail on CIFS)
  try {
    await db.exec('PRAGMA journal_mode=DELETE;');
    await db.exec('PRAGMA busy_timeout=5000;');
  } catch (e) {
    // Log but don't crash here — caller will see DB errors on actual operations
    console.error('Failed to set PRAGMA on sqlite DB:', e);
  }

  return db;
}
